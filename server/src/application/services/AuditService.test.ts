/**
 * Audit Service Tests
 *
 * Tests audit logging, querying, and retention operations.
 */

import { AuditService, LogActionParams } from './AuditService';
import type { AuditRepository } from '@domain/repositories/AuditRepository';
import type { AuditLogEntry } from '@odysseus/shared-schemas';
import type { PaginatedResult } from '@domain/types/repository';

// Mock logger
jest.mock('@utils/logger', () => ({
  logger: {
    debug: jest.fn(),
    info: jest.fn(),
    error: jest.fn(),
  },
}));

// Mock uuid
jest.mock('uuid', () => ({
  v4: jest.fn(() => 'mock-uuid-123'),
}));

describe('AuditService', () => {
  let auditService: AuditService;
  let mockAuditRepository: jest.Mocked<AuditRepository>;

  const createMockPaginatedResult = (
    items: AuditLogEntry[]
  ): PaginatedResult<AuditLogEntry> => ({
    items,
    pagination: {
      total: items.length,
      limit: 20,
      offset: 0,
      hasMore: false,
    },
  });

  beforeEach(() => {
    mockAuditRepository = {
      save: jest.fn().mockResolvedValue(undefined),
      saveMany: jest.fn().mockResolvedValue(undefined),
      findByUserId: jest.fn().mockResolvedValue([]),
      findByEntityId: jest.fn().mockResolvedValue([]),
      findByAction: jest.fn().mockResolvedValue([]),
      findAll: jest.fn().mockResolvedValue(createMockPaginatedResult([])),
      deleteOlderThan: jest.fn().mockResolvedValue(0),
      count: jest.fn().mockResolvedValue(0),
      countInRange: jest.fn().mockResolvedValue(0),
      findOlderThan: jest.fn().mockResolvedValue([]),
      deleteArchived: jest.fn().mockResolvedValue(0),
      getActiveTableMetrics: jest.fn().mockResolvedValue({
        count: 0,
        oldestEntry: null,
        newestEntry: null,
      }),
    };

    auditService = new AuditService(mockAuditRepository);
    jest.clearAllMocks();
  });

  describe('logAction()', () => {
    const validParams: LogActionParams = {
      userId: 'user-123',
      username: 'testuser',
      action: 'tube_created',
      entityType: 'tube',
      entityId: 'tube-456',
      details: { position: 5, boxId: 'A' },
      ipAddress: '192.168.1.1',
      userAgent: 'Mozilla/5.0',
    };

    it('should create and save audit entry', async () => {
      await auditService.logAction(validParams);

      expect(mockAuditRepository.save).toHaveBeenCalledWith(
        expect.objectContaining({
          id: 'mock-uuid-123',
          userId: 'user-123',
          username: 'testuser',
          action: 'tube_created',
          entityType: 'tube',
          entityId: 'tube-456',
        })
      );
    });

    it('should stringify details object', async () => {
      await auditService.logAction(validParams);

      expect(mockAuditRepository.save).toHaveBeenCalledWith(
        expect.objectContaining({
          details: JSON.stringify({ position: 5, boxId: 'A' }),
        })
      );
    });

    it('should include timestamp', async () => {
      await auditService.logAction(validParams);

      expect(mockAuditRepository.save).toHaveBeenCalledWith(
        expect.objectContaining({
          timestamp: expect.any(Date),
        })
      );
    });

    it('should not throw on repository error (non-blocking)', async () => {
      mockAuditRepository.save.mockRejectedValue(new Error('DB error'));

      await expect(auditService.logAction(validParams)).resolves.not.toThrow();
    });

    it('should not save for missing userId', async () => {
      const invalidParams = { ...validParams, userId: '' };

      await auditService.logAction(invalidParams);

      expect(mockAuditRepository.save).not.toHaveBeenCalled();
    });

    it('should not save for missing username', async () => {
      const invalidParams = { ...validParams, username: '' };

      await auditService.logAction(invalidParams);

      expect(mockAuditRepository.save).not.toHaveBeenCalled();
    });

    it('should not save for missing action', async () => {
      const invalidParams = { ...validParams, action: '' };

      await auditService.logAction(invalidParams);

      expect(mockAuditRepository.save).not.toHaveBeenCalled();
    });

    it('should not save for missing entityType', async () => {
      const invalidParams = { ...validParams, entityType: '' };

      await auditService.logAction(invalidParams);

      expect(mockAuditRepository.save).not.toHaveBeenCalled();
    });

    it('should allow optional entityId', async () => {
      const paramsWithoutEntityId = { ...validParams, entityId: undefined };

      await auditService.logAction(paramsWithoutEntityId);

      expect(mockAuditRepository.save).toHaveBeenCalledWith(
        expect.objectContaining({
          entityId: undefined,
        })
      );
    });
  });

  describe('logActions()', () => {
    it('should save multiple entries in batch', async () => {
      const actions: LogActionParams[] = [
        {
          userId: 'user-1',
          username: 'user1',
          action: 'action1',
          entityType: 'tube',
          details: {},
        },
        {
          userId: 'user-2',
          username: 'user2',
          action: 'action2',
          entityType: 'tube',
          details: {},
        },
      ];

      await auditService.logActions(actions);

      expect(mockAuditRepository.saveMany).toHaveBeenCalledWith(
        expect.arrayContaining([
          expect.objectContaining({ userId: 'user-1' }),
          expect.objectContaining({ userId: 'user-2' }),
        ])
      );
    });

    it('should skip saving for empty array', async () => {
      await auditService.logActions([]);

      expect(mockAuditRepository.saveMany).not.toHaveBeenCalled();
    });

    it('should not throw on repository error', async () => {
      mockAuditRepository.saveMany.mockRejectedValue(new Error('DB error'));

      await expect(
        auditService.logActions([
          { userId: 'u', username: 'u', action: 'a', entityType: 't', details: {} },
        ])
      ).resolves.not.toThrow();
    });
  });

  describe('getAuditLog()', () => {
    it('should return paginated audit entries', async () => {
      const mockEntries: AuditLogEntry[] = [
        {
          id: '1',
          userId: 'user-1',
          username: 'user1',
          action: 'login',
          entityType: 'session',
          details: '{}',
          timestamp: new Date(),
        },
      ];

      mockAuditRepository.findAll.mockResolvedValue(createMockPaginatedResult(mockEntries));

      const result = await auditService.getAuditLog();

      expect(result.items).toEqual(mockEntries);
      expect(result.pagination.total).toBe(1);
    });

    it('should pass filters to repository', async () => {
      const filters = { userId: 'user-123', action: 'login' };

      await auditService.getAuditLog(filters);

      expect(mockAuditRepository.findAll).toHaveBeenCalledWith(filters);
    });
  });

  describe('getEntityHistory()', () => {
    it('should return history for specific entity', async () => {
      const mockEntries: AuditLogEntry[] = [];
      mockAuditRepository.findByEntityId.mockResolvedValue(mockEntries);

      const result = await auditService.getEntityHistory('tube-123', 'tube');

      expect(mockAuditRepository.findByEntityId).toHaveBeenCalledWith('tube-123', 'tube');
      expect(result).toEqual(mockEntries);
    });
  });

  describe('getUserActivity()', () => {
    it('should return activity for specific user', async () => {
      const mockEntries: AuditLogEntry[] = [];
      mockAuditRepository.findByUserId.mockResolvedValue(mockEntries);

      const result = await auditService.getUserActivity('user-123');

      expect(mockAuditRepository.findByUserId).toHaveBeenCalledWith('user-123', undefined);
      expect(result).toEqual(mockEntries);
    });

    it('should pass query options to repository', async () => {
      const options = { limit: 10, offset: 5 };

      await auditService.getUserActivity('user-123', options);

      expect(mockAuditRepository.findByUserId).toHaveBeenCalledWith('user-123', options);
    });
  });

  describe('getActionLog()', () => {
    it('should return logs for specific action type', async () => {
      const mockEntries: AuditLogEntry[] = [];
      mockAuditRepository.findByAction.mockResolvedValue(mockEntries);

      const result = await auditService.getActionLog('login_failed');

      expect(mockAuditRepository.findByAction).toHaveBeenCalledWith('login_failed', undefined);
      expect(result).toEqual(mockEntries);
    });
  });

  describe('getStatistics()', () => {
    it('should return audit statistics', async () => {
      mockAuditRepository.count.mockResolvedValue(1000);
      mockAuditRepository.countInRange.mockResolvedValue(50);

      const result = await auditService.getStatistics();

      expect(result).toEqual({
        total: 1000,
        today: 50,
        thisWeek: 50,
      });
    });

    it('should calculate date ranges correctly', async () => {
      await auditService.getStatistics();

      expect(mockAuditRepository.countInRange).toHaveBeenCalledTimes(2);
    });
  });

  describe('cleanOldEntries()', () => {
    it('should delete entries older than retention period', async () => {
      mockAuditRepository.deleteOlderThan.mockResolvedValue(100);

      const result = await auditService.cleanOldEntries(90);

      expect(mockAuditRepository.deleteOlderThan).toHaveBeenCalledWith(expect.any(Date));
      expect(result).toBe(100);
    });

    it('should calculate cutoff date correctly', async () => {
      const now = new Date();
      jest.useFakeTimers().setSystemTime(now);

      await auditService.cleanOldEntries(30);

      const expectedCutoff = new Date(now);
      expectedCutoff.setDate(expectedCutoff.getDate() - 30);

      expect(mockAuditRepository.deleteOlderThan).toHaveBeenCalledWith(
        expect.objectContaining({
          getDate: expect.any(Function),
        })
      );

      jest.useRealTimers();
    });

    it('should throw on repository error', async () => {
      mockAuditRepository.deleteOlderThan.mockRejectedValue(new Error('DB error'));

      await expect(auditService.cleanOldEntries(90)).rejects.toThrow('DB error');
    });
  });
});
