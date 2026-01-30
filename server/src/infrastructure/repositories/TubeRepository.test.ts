/**
 * TubeRepository Tests
 *
 * Tests data access layer for tube persistence operations.
 * Mocks PostgresContext to test repository logic in isolation.
 */

import { TubeRepository } from './TubeRepository';
import { Tube } from '@domain/entities/Tube';
import { Location } from '@domain/valueObjects/Location';
import { ConflictError } from '@domain/errors/ConflictError';
import { ValidationError } from '@domain/errors/ValidationError';
import type { PostgresContext } from '@infrastructure/database/PostgresContext';
import type { ConfigurationRepository } from '@domain/repositories/ConfigurationRepository';
import type { TubeRow } from '@infrastructure/database/mappers/TubeMapper';
import type { QueryResult } from 'pg';

// Mock logger
jest.mock('@utils/logger', () => ({
  logger: {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  },
}));

// Mock search utilities
jest.mock('@infrastructure/database/searchUtils', () => ({
  normalizeSearchQuery: jest.fn((q: string) => q.toLowerCase()),
  expandWithSynonyms: jest.fn((q: string) => [q]),
  parseQueryIntoConcepts: jest.fn((q: string) => [[q]]),
  buildTsQueryFromConcepts: jest.fn(() => 'query:*'),
  calculateQueryFuzzyThreshold: jest.fn(() => 0.3),
  shouldSkipFuzzyMatching: jest.fn(() => false),
  SearchRankTier: {
    TSVECTOR_HIGH: 1.0,
    FUZZY_MATCH: 0.8,
    RESEARCHER_NAME: 0.6,
    ILIKE_FALLBACK: 0.4,
  },
}));

// Mock database errors
jest.mock('@infrastructure/database/DatabaseErrors', () => ({
  isPositionConstraintError: jest.fn(() => false),
}));

describe('TubeRepository', () => {
  let tubeRepository: TubeRepository;
  let mockContext: jest.Mocked<PostgresContext>;
  let mockConfigRepo: jest.Mocked<ConfigurationRepository>;

  const createMockTubeRow = (overrides: Partial<TubeRow> = {}): TubeRow => ({
    id: 'tube-123',
    tank_id: 'tank-1',
    rack_id: '1',
    box_id: 'A',
    position: 5,
    cell_type: 'T-Cell',
    donor_internal_id: 'D001',
    donor_source_id: 'S001',
    concentration: '1000000',
    concentration_unit: 'c/mL',
    date: '2025-01-15',
    researcher_id: 'researcher-1',
    created_by_name: 'John Doe',
    media: undefined,
    culture_condition: 'standard',
    lot_number: 'LOT001',
    notes: 'Test notes',
    created_at: new Date(),
    updated_at: new Date(),
    version: 1,
    is_locked: false,
    locked_by: undefined,
    lock_note: undefined,
    locked_at: undefined,
    shared_with_user_ids: undefined,
    ...overrides,
  });

  const createMockQueryResult = (rowCount: number): QueryResult => ({
    rows: [],
    command: 'UPDATE',
    oid: 0,
    fields: [],
    rowCount,
  });

  const createTestTube = (): Tube => {
    return Tube.create({
      location: { tankId: 'tank-1', rackId: '1', boxId: 'A', position: 5 },
      sample: { cellType: 'T-Cell' },
      researcherId: 'researcher-1',
    });
  };

  beforeEach(() => {
    mockContext = {
      queryOne: jest.fn(),
      queryMany: jest.fn(),
      queryByIds: jest.fn(),
      execute: jest.fn(),
      transaction: jest.fn(),
      query: jest.fn(),
      isHealthy: jest.fn(),
    } as unknown as jest.Mocked<PostgresContext>;

    mockConfigRepo = {
      getCurrent: jest.fn(),
    } as unknown as jest.Mocked<ConfigurationRepository>;

    tubeRepository = new TubeRepository(mockContext, mockConfigRepo);
    jest.clearAllMocks();
  });

  describe('findById()', () => {
    it('should return tube when found', async () => {
      const mockRow = createMockTubeRow();
      mockContext.queryOne.mockResolvedValue(mockRow);

      const result = await tubeRepository.findById('tube-123');

      expect(result).not.toBeNull();
      expect(result?.id).toBe('tube-123');
      expect(mockContext.queryOne).toHaveBeenCalledWith(
        expect.stringContaining('WHERE id = $1'),
        ['tube-123']
      );
    });

    it('should return null when not found', async () => {
      mockContext.queryOne.mockResolvedValue(null);

      const result = await tubeRepository.findById('nonexistent');

      expect(result).toBeNull();
    });
  });

  describe('findByIds()', () => {
    it('should return tubes for given IDs', async () => {
      const mockRows = [
        createMockTubeRow({ id: 'tube-1' }),
        createMockTubeRow({ id: 'tube-2' }),
      ];
      mockContext.queryMany.mockResolvedValue(mockRows);

      const result = await tubeRepository.findByIds(['tube-1', 'tube-2']);

      expect(result).toHaveLength(2);
    });

    it('should return empty array for empty IDs list', async () => {
      const result = await tubeRepository.findByIds([]);

      expect(result).toEqual([]);
      expect(mockContext.queryMany).not.toHaveBeenCalled();
    });
  });

  describe('findAll()', () => {
    it('should return all tubes ordered by creation date', async () => {
      const mockRows = [createMockTubeRow()];
      mockContext.queryMany.mockResolvedValue(mockRows);

      const result = await tubeRepository.findAll();

      expect(result).toHaveLength(1);
      expect(mockContext.queryMany).toHaveBeenCalledWith(
        expect.stringContaining('ORDER BY created_at DESC')
      );
    });
  });

  describe('save()', () => {
    it('should insert or update tube', async () => {
      mockContext.execute.mockResolvedValue(createMockQueryResult(1));

      const tube = createTestTube();

      await tubeRepository.save(tube);

      expect(mockContext.execute).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO tubes'),
        expect.any(Array)
      );
    });

    it('should throw ValidationError on position conflict', async () => {
      const { isPositionConstraintError } = require('@infrastructure/database/DatabaseErrors');
      isPositionConstraintError.mockReturnValue(true);
      mockContext.execute.mockRejectedValue(new Error('unique constraint'));

      const tube = createTestTube();

      await expect(tubeRepository.save(tube)).rejects.toThrow(ValidationError);
    });
  });

  describe('saveWithOptimisticLock()', () => {
    it('should update tube when version matches', async () => {
      mockContext.execute.mockResolvedValue(createMockQueryResult(1));

      const tube = createTestTube();

      await tubeRepository.saveWithOptimisticLock(tube, 1);

      expect(mockContext.execute).toHaveBeenCalledWith(
        expect.stringContaining('WHERE id = $1 AND version = $25'),
        expect.any(Array)
      );
    });

    it('should throw ConflictError on version mismatch', async () => {
      mockContext.execute.mockResolvedValue(createMockQueryResult(0));
      mockContext.queryOne.mockResolvedValue(createMockTubeRow({ version: 3 }));

      const tube = createTestTube();

      await expect(tubeRepository.saveWithOptimisticLock(tube, 1)).rejects.toThrow(
        ConflictError
      );
    });
  });

  describe('delete()', () => {
    it('should return true when tube deleted', async () => {
      mockContext.execute.mockResolvedValue(createMockQueryResult(1));

      const result = await tubeRepository.delete('tube-123');

      expect(result).toBe(true);
    });

    it('should return false when tube not found', async () => {
      mockContext.execute.mockResolvedValue(createMockQueryResult(0));

      const result = await tubeRepository.delete('nonexistent');

      expect(result).toBe(false);
    });
  });

  describe('findByLocation()', () => {
    it('should find tube at specific location', async () => {
      const mockRow = createMockTubeRow();
      mockContext.queryOne.mockResolvedValue(mockRow);

      const location = Location.create('tank-1', '1', 'A', 5);
      const result = await tubeRepository.findByLocation(location);

      expect(result).not.toBeNull();
      expect(mockContext.queryOne).toHaveBeenCalledWith(
        expect.stringContaining('tank_id = $1 AND rack_id = $2 AND box_id = $3 AND position = $4'),
        ['tank-1', '1', 'A', 5]
      );
    });
  });

  describe('findByCompleteLocation()', () => {
    it('should find all tubes in a box', async () => {
      const mockRows = [createMockTubeRow({ position: 1 }), createMockTubeRow({ position: 2 })];
      mockContext.queryMany.mockResolvedValue(mockRows);

      const result = await tubeRepository.findByCompleteLocation('tank-1', '1', 'A');

      expect(result).toHaveLength(2);
    });
  });

  describe('isPositionAvailable()', () => {
    it('should return true when position is empty', async () => {
      mockContext.queryOne.mockResolvedValue(null);

      const location = Location.create('tank-1', '1', 'A', 5);
      const result = await tubeRepository.isPositionAvailable(location);

      expect(result).toBe(true);
    });

    it('should return false when position is occupied', async () => {
      mockContext.queryOne.mockResolvedValue(createMockTubeRow());

      const location = Location.create('tank-1', '1', 'A', 5);
      const result = await tubeRepository.isPositionAvailable(location);

      expect(result).toBe(false);
    });
  });

  describe('getOccupiedPositions()', () => {
    it('should return list of occupied positions', async () => {
      mockContext.queryMany.mockResolvedValue([
        { position: 1 },
        { position: 5 },
        { position: 10 },
      ]);

      const result = await tubeRepository.getOccupiedPositions('tank-1', '1', 'A');

      expect(result).toEqual([1, 5, 10]);
    });
  });

  describe('count()', () => {
    it('should return total tube count', async () => {
      mockContext.queryOne.mockResolvedValue({ count: '42' });

      const result = await tubeRepository.count();

      expect(result).toBe(42);
    });

    it('should return 0 when no result', async () => {
      mockContext.queryOne.mockResolvedValue(null);

      const result = await tubeRepository.count();

      expect(result).toBe(0);
    });
  });

  describe('deleteMany()', () => {
    it('should delete multiple tubes', async () => {
      mockContext.execute.mockResolvedValue(createMockQueryResult(3));

      const result = await tubeRepository.deleteMany(['id-1', 'id-2', 'id-3']);

      expect(result).toBe(3);
    });

    it('should return 0 for empty IDs list', async () => {
      const result = await tubeRepository.deleteMany([]);

      expect(result).toBe(0);
      expect(mockContext.execute).not.toHaveBeenCalled();
    });
  });

  describe('isHealthy()', () => {
    it('should return true when database responds', async () => {
      mockContext.queryOne.mockResolvedValue({ result: 1 });

      const result = await tubeRepository.isHealthy();

      expect(result).toBe(true);
    });

    it('should return false on database error', async () => {
      mockContext.queryOne.mockRejectedValue(new Error('Connection failed'));

      const result = await tubeRepository.isHealthy();

      expect(result).toBe(false);
    });
  });

  describe('getStats()', () => {
    it('should return repository statistics', async () => {
      mockContext.queryOne
        .mockResolvedValueOnce({ count: '100' }) // total count
        .mockResolvedValueOnce({ count: '5' }) // box count
        .mockResolvedValueOnce({ id: 'oldest', created_at: new Date('2024-01-01') })
        .mockResolvedValueOnce({ id: 'newest', created_at: new Date('2025-01-01') })
        .mockResolvedValueOnce({ count: '80' }) // complete count
        .mockResolvedValueOnce({ count: '10' }); // expired count

      mockContext.queryMany
        .mockResolvedValueOnce([{ tank_id: 'tank-1', count: '50' }])
        .mockResolvedValueOnce([{ researcher_id: 'r-1', count: '30' }]);

      const stats = await tubeRepository.getStats();

      expect(stats.totalTubes).toBe(100);
      expect(stats.tubesByTank).toHaveProperty('tank-1');
    });
  });
});
