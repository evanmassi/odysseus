/**
 * Audit Retention Service Tests
 *
 * Tests audit log archival, retention policy, and cross-table queries.
 */

import { AuditRetentionService, RetentionMetrics } from './AuditRetentionService';
import type { AuditRepository } from '@domain/repositories/AuditRepository';
import type { AuditArchiveRepository } from '@domain/repositories/AuditArchiveRepository';
import type { AuditLogEntry } from '@odysseus/shared-schemas';
import type { PaginatedResult } from '@domain/types/repository';

jest.mock('@utils/logger', () => ({
  logger: {
    debug: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  },
}));

jest.mock('@config/auditConfig', () => ({
  AUDIT_RETENTION_CONFIG: {
    activeRetentionDays: 90,
    totalRetentionDays: 730,
    archiveRetentionDays: 640,
    enableAutoArchival: true,
    activeTableWarningThreshold: 50000,
    archivalBatchSize: 100,
  },
}));

describe('AuditRetentionService', () => {
  let service: AuditRetentionService;
  let mockAuditRepository: jest.Mocked<AuditRepository>;
  let mockArchiveRepository: jest.Mocked<AuditArchiveRepository>;

  const createMockEntry = (id: string, timestamp: Date): AuditLogEntry => ({
    id,
    userId: 'user-1',
    username: 'testuser',
    action: 'tube_created',
    entityType: 'tube',
    entityId: 'tube-1',
    details: '{}',
    timestamp,
  });

  const createPaginatedResult = (items: AuditLogEntry[]): PaginatedResult<AuditLogEntry> => ({
    items,
    pagination: {
      total: items.length,
      limit: 50,
      offset: 0,
      hasMore: false,
    },
  });

  beforeEach(() => {
    mockAuditRepository = {
      save: jest.fn(),
      saveMany: jest.fn(),
      findByUserId: jest.fn(),
      findByEntityId: jest.fn(),
      findByAction: jest.fn(),
      findAll: jest.fn().mockResolvedValue(createPaginatedResult([])),
      deleteOlderThan: jest.fn(),
      count: jest.fn(),
      countInRange: jest.fn(),
      findOlderThan: jest.fn().mockResolvedValue([]),
      deleteArchived: jest.fn().mockResolvedValue(0),
      getActiveTableMetrics: jest.fn().mockResolvedValue({
        count: 100,
        oldestEntry: new Date('2024-01-01'),
        newestEntry: new Date('2024-03-01'),
      }),
    };

    mockArchiveRepository = {
      saveArchived: jest.fn(),
      findArchived: jest.fn().mockResolvedValue(createPaginatedResult([])),
      deleteOlderThan: jest.fn().mockResolvedValue(0),
      countArchived: jest.fn().mockResolvedValue(500),
      getOldestArchivedTimestamp: jest.fn().mockResolvedValue(new Date('2023-01-01')),
      exportToJSON: jest.fn().mockResolvedValue('[]'),
    };

    service = new AuditRetentionService(mockAuditRepository, mockArchiveRepository);
    jest.clearAllMocks();
  });

  describe('archiveOldEntries()', () => {
    it('should archive entries older than retention period', async () => {
      const oldEntries = [
        createMockEntry('1', new Date('2023-06-01')),
        createMockEntry('2', new Date('2023-06-02')),
      ];

      mockAuditRepository.findOlderThan.mockResolvedValueOnce(oldEntries).mockResolvedValueOnce([]);
      mockAuditRepository.deleteArchived.mockResolvedValue(2);

      const result = await service.archiveOldEntries();

      expect(mockArchiveRepository.saveArchived).toHaveBeenCalledWith(oldEntries);
      expect(mockAuditRepository.deleteArchived).toHaveBeenCalledWith(['1', '2']);
      expect(result).toBe(2);
    });

    it('should return 0 when no entries to archive', async () => {
      mockAuditRepository.findOlderThan.mockResolvedValue([]);

      const result = await service.archiveOldEntries();

      expect(mockArchiveRepository.saveArchived).not.toHaveBeenCalled();
      expect(result).toBe(0);
    });

    it('should process entries in batches', async () => {
      const batch1 = Array.from({ length: 100 }, (_, i) =>
        createMockEntry(`entry-${i}`, new Date('2023-01-01'))
      );
      // When batch1 has exactly batchSize entries (100), it will loop again
      // When batch2 is smaller than batchSize, it will stop
      const batch2 = Array.from({ length: 50 }, (_, i) =>
        createMockEntry(`entry-batch2-${i}`, new Date('2023-01-02'))
      );

      mockAuditRepository.findOlderThan
        .mockResolvedValueOnce(batch1)
        .mockResolvedValueOnce(batch2);
      mockAuditRepository.deleteArchived
        .mockResolvedValueOnce(100)
        .mockResolvedValueOnce(50);

      const result = await service.archiveOldEntries();

      expect(mockAuditRepository.findOlderThan).toHaveBeenCalledTimes(2);
      expect(result).toBe(150);
    });
  });

  describe('deleteExpiredEntries()', () => {
    it('should delete entries past total retention period', async () => {
      mockArchiveRepository.deleteOlderThan.mockResolvedValue(50);

      const result = await service.deleteExpiredEntries();

      expect(mockArchiveRepository.deleteOlderThan).toHaveBeenCalledWith(expect.any(Date));
      expect(result).toBe(50);
    });

    it('should return 0 when no expired entries', async () => {
      mockArchiveRepository.deleteOlderThan.mockResolvedValue(0);

      const result = await service.deleteExpiredEntries();

      expect(result).toBe(0);
    });
  });

  describe('getRetentionMetrics()', () => {
    it('should return combined metrics from both tables', async () => {
      const metrics = await service.getRetentionMetrics();

      expect(metrics.activeTable.count).toBe(100);
      expect(metrics.archiveTable.count).toBe(500);
      expect(metrics.archiveTable.oldestEntry).toEqual(new Date('2023-01-01'));
    });

    it('should calculate next archival date from oldest active entry', async () => {
      mockAuditRepository.getActiveTableMetrics.mockResolvedValue({
        count: 10,
        oldestEntry: new Date('2024-01-01'),
        newestEntry: new Date('2024-03-01'),
      });

      const metrics = await service.getRetentionMetrics();

      expect(metrics.nextArchivalDate).not.toBeNull();
    });

    it('should return null nextArchivalDate when no active entries', async () => {
      mockAuditRepository.getActiveTableMetrics.mockResolvedValue({
        count: 0,
        oldestEntry: null,
        newestEntry: null,
      });

      const metrics = await service.getRetentionMetrics();

      expect(metrics.nextArchivalDate).toBeNull();
    });

    it('should set performance warning when threshold exceeded', async () => {
      mockAuditRepository.getActiveTableMetrics.mockResolvedValue({
        count: 60000,
        oldestEntry: new Date(),
        newestEntry: new Date(),
      });

      const metrics = await service.getRetentionMetrics();

      expect(metrics.performanceWarning).toBe(true);
    });
  });

  describe('getRetentionPolicy()', () => {
    it('should return current retention policy configuration', () => {
      const policy = service.getRetentionPolicy();

      expect(policy.activeRetentionDays).toBe(90);
      expect(policy.totalRetentionDays).toBe(730);
      expect(policy.enableAutoArchival).toBe(true);
    });
  });

  describe('queryAllLogs()', () => {
    it('should query only active table when includeArchive is false', async () => {
      const activeEntries = [createMockEntry('1', new Date())];
      mockAuditRepository.findAll.mockResolvedValue(createPaginatedResult(activeEntries));

      const result = await service.queryAllLogs({}, false);

      expect(result.items).toEqual(activeEntries);
      expect(mockArchiveRepository.findArchived).not.toHaveBeenCalled();
    });

    it('should merge results from both tables when includeArchive is true', async () => {
      const activeEntry = createMockEntry('active', new Date('2024-03-01'));
      const archivedEntry = createMockEntry('archived', new Date('2023-06-01'));

      mockAuditRepository.findAll.mockResolvedValue(createPaginatedResult([activeEntry]));
      mockArchiveRepository.findArchived.mockResolvedValue(createPaginatedResult([archivedEntry]));

      const result = await service.queryAllLogs({}, true);

      expect(result.items).toHaveLength(2);
      expect(result.pagination.total).toBe(2);
    });

    it('should sort merged results by timestamp descending', async () => {
      const older = createMockEntry('older', new Date('2023-01-01'));
      const newer = createMockEntry('newer', new Date('2024-01-01'));

      mockAuditRepository.findAll.mockResolvedValue(createPaginatedResult([older]));
      mockArchiveRepository.findArchived.mockResolvedValue(createPaginatedResult([newer]));

      const result = await service.queryAllLogs({}, true);

      expect(result.items[0].id).toBe('newer');
      expect(result.items[1].id).toBe('older');
    });
  });

  describe('exportArchivedLogs()', () => {
    it('should delegate to archive repository', async () => {
      mockArchiveRepository.exportToJSON.mockResolvedValue('{"entries":[]}');

      const result = await service.exportArchivedLogs();

      expect(mockArchiveRepository.exportToJSON).toHaveBeenCalledWith(undefined, undefined);
      expect(result).toBe('{"entries":[]}');
    });

    it('should pass date range filters', async () => {
      const from = new Date('2023-01-01');
      const to = new Date('2023-12-31');

      await service.exportArchivedLogs(from, to);

      expect(mockArchiveRepository.exportToJSON).toHaveBeenCalledWith(from, to);
    });
  });

  describe('runManualArchival()', () => {
    it('should run both archive and delete operations', async () => {
      mockAuditRepository.findOlderThan.mockResolvedValue([]);
      mockArchiveRepository.deleteOlderThan.mockResolvedValue(10);

      const result = await service.runManualArchival();

      expect(result).toEqual({ archived: 0, deleted: 10 });
    });
  });
});
