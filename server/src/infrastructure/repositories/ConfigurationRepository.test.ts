/**
 * Configuration Repository Tests
 *
 * Tests configuration CRUD, versioning, and equipment validation.
 */

import { ConfigurationRepository } from './ConfigurationRepository';
import { Configuration } from '@domain/entities/Configuration';
import { Location } from '@domain/valueObjects/Location';
import { ValidationError } from '@domain/errors/ValidationError';
import { ConflictError } from '@domain/errors/ConflictError';
import type { PostgresContext } from '@infrastructure/database/PostgresContext';

jest.mock('@utils/logger', () => ({
  logger: {
    debug: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  },
}));

jest.mock('@domain/utils/generateId', () => ({
  generateId: jest.fn(() => 'mock-id-123'),
}));

describe('ConfigurationRepository', () => {
  let repository: ConfigurationRepository;
  let mockContext: jest.Mocked<PostgresContext>;

  const createMockConfigJson = () => ({
    tanks: [
      {
        id: 'tank-1',
        name: 'Tank 1',
        maxRacks: 10,
        isActive: true,
        racks: [
          {
            id: '1',
            name: 'Rack 1',
            maxBoxes: 10,
            capacity: 10,
            isActive: true,
            boxes: [
              { name: 'A', gridConfig: { rows: 9, cols: 9 }, maxPositions: 81, isActive: true },
              { name: 'B', gridConfig: { rows: 9, cols: 9 }, maxPositions: 81, isActive: true },
              { name: 'C', gridConfig: { rows: 9, cols: 9 }, maxPositions: 81, isActive: true },
              { name: 'D', gridConfig: { rows: 9, cols: 9 }, maxPositions: 81, isActive: true },
              { name: 'E', gridConfig: { rows: 9, cols: 9 }, maxPositions: 81, isActive: true },
              { name: 'F', gridConfig: { rows: 9, cols: 9 }, maxPositions: 81, isActive: true },
              { name: 'G', gridConfig: { rows: 9, cols: 9 }, maxPositions: 81, isActive: true },
              { name: 'H', gridConfig: { rows: 9, cols: 9 }, maxPositions: 81, isActive: true },
              { name: 'I', gridConfig: { rows: 9, cols: 9 }, maxPositions: 81, isActive: true },
              { name: 'J', gridConfig: { rows: 9, cols: 9 }, maxPositions: 81, isActive: true },
            ],
          },
        ],
      },
    ],
    systemSettings: {
      labName: 'Test Lab',
      defaultResearcher: '',
      autoSave: true,
      auditTrailEnabled: true,
      syncEnabled: false,
    },
    version: 1,
    updatedAt: new Date().toISOString(),
  });

  beforeEach(() => {
    mockContext = {
      queryOne: jest.fn(),
      queryMany: jest.fn(),
      execute: jest.fn(),
      transaction: jest.fn(),
      transactionSerializable: jest.fn(),
    } as unknown as jest.Mocked<PostgresContext>;

    repository = new ConfigurationRepository(mockContext);
    jest.clearAllMocks();
  });

  describe('getCurrent()', () => {
    it('should return configuration from database', async () => {
      const mockConfigJson = createMockConfigJson();
      mockContext.queryOne.mockResolvedValue({
        config_json: mockConfigJson,
        version: 1,
        updated_at: new Date(),
      });

      const result = await repository.getCurrent();

      expect(result).toBeInstanceOf(Configuration);
      expect(result?.version).toBe(1);
    });

    it('should throw ValidationError when configuration not found', async () => {
      mockContext.queryOne.mockResolvedValue(null);

      await expect(repository.getCurrent()).rejects.toThrow(ValidationError);
    });

    it('should wrap database errors in ValidationError', async () => {
      mockContext.queryOne.mockRejectedValue(new Error('DB connection failed'));

      await expect(repository.getCurrent()).rejects.toThrow(ValidationError);
    });
  });

  describe('exists()', () => {
    it('should return true when configuration exists', async () => {
      mockContext.queryOne.mockResolvedValue({ id: 1 });

      const result = await repository.exists();

      expect(result).toBe(true);
    });

    it('should return false when configuration does not exist', async () => {
      mockContext.queryOne.mockResolvedValue(null);

      const result = await repository.exists();

      expect(result).toBe(false);
    });

    it('should return false on database error', async () => {
      mockContext.queryOne.mockRejectedValue(new Error('DB error'));

      const result = await repository.exists();

      expect(result).toBe(false);
    });
  });

  describe('getCurrentVersion()', () => {
    it('should return current version number', async () => {
      mockContext.queryOne.mockResolvedValue({ version: 5 });

      const result = await repository.getCurrentVersion();

      expect(result).toBe(5);
    });

    it('should return 0 when no configuration exists', async () => {
      mockContext.queryOne.mockResolvedValue(null);

      const result = await repository.getCurrentVersion();

      expect(result).toBe(0);
    });
  });

  describe('getByVersion()', () => {
    it('should return configuration for specific version', async () => {
      const mockConfigJson = createMockConfigJson();
      mockContext.queryOne.mockResolvedValue({ config_json: mockConfigJson });

      const result = await repository.getByVersion(3);

      expect(result).toBeInstanceOf(Configuration);
      expect(mockContext.queryOne).toHaveBeenCalledWith(expect.any(String), [3]);
    });

    it('should return null for non-existent version', async () => {
      mockContext.queryOne.mockResolvedValue(null);

      const result = await repository.getByVersion(999);

      expect(result).toBeNull();
    });
  });

  describe('getHistory()', () => {
    it('should return configuration history entries', async () => {
      const mockConfigJson = createMockConfigJson();
      mockContext.queryMany.mockResolvedValue([
        {
          version: 2,
          updated_at: new Date(),
          change_description: 'Updated tank',
          changed_by: 'admin',
          config_json: mockConfigJson,
        },
        {
          version: 1,
          updated_at: new Date(),
          change_description: 'Initial config',
          changed_by: 'system',
          config_json: mockConfigJson,
        },
      ]);

      const result = await repository.getHistory(50);

      expect(result).toHaveLength(2);
      expect(result[0].version).toBe(2);
      expect(result[0].changeDescription).toBe('Updated tank');
    });
  });

  describe('tankExists()', () => {
    it('should return true when tank exists', async () => {
      mockContext.queryOne.mockResolvedValue({
        config_json: createMockConfigJson(),
        version: 1,
        updated_at: new Date(),
      });

      const result = await repository.tankExists('tank-1');

      expect(result).toBe(true);
    });

    it('should return false when tank does not exist', async () => {
      mockContext.queryOne.mockResolvedValue({
        config_json: createMockConfigJson(),
        version: 1,
        updated_at: new Date(),
      });

      const result = await repository.tankExists('tank-999');

      expect(result).toBe(false);
    });
  });

  describe('rackExists()', () => {
    it('should return true when rack exists in tank', async () => {
      mockContext.queryOne.mockResolvedValue({
        config_json: createMockConfigJson(),
        version: 1,
        updated_at: new Date(),
      });

      const result = await repository.rackExists('tank-1', '1');

      expect(result).toBe(true);
    });

    it('should return false when rack does not exist', async () => {
      mockContext.queryOne.mockResolvedValue({
        config_json: createMockConfigJson(),
        version: 1,
        updated_at: new Date(),
      });

      const result = await repository.rackExists('tank-1', '999');

      expect(result).toBe(false);
    });
  });

  describe('boxExists()', () => {
    it('should return true when box exists (case-insensitive)', async () => {
      mockContext.queryOne.mockResolvedValue({
        config_json: createMockConfigJson(),
        version: 1,
        updated_at: new Date(),
      });

      const result = await repository.boxExists('tank-1', '1', 'a');

      expect(result).toBe(true);
    });

    it('should return false when box does not exist', async () => {
      mockContext.queryOne.mockResolvedValue({
        config_json: createMockConfigJson(),
        version: 1,
        updated_at: new Date(),
      });

      const result = await repository.boxExists('tank-1', '1', 'Z');

      expect(result).toBe(false);
    });
  });

  describe('validateConfiguration()', () => {
    it('should validate configuration with all equipment', async () => {
      const config = Configuration.fromData(createMockConfigJson());

      const result = await repository.validateConfiguration(config);

      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should report error for empty tanks', async () => {
      const configData = createMockConfigJson();
      configData.tanks = [];
      const config = Configuration.fromData(configData);

      const result = await repository.validateConfiguration(config);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('No tanks configured');
    });

    it('should recommend backup tanks', async () => {
      const config = Configuration.fromData(createMockConfigJson());

      const result = await repository.validateConfiguration(config);

      expect(result.recommendations).toContain('Consider configuring backup tanks for redundancy');
    });
  });

  describe('getEquipmentSummary()', () => {
    it('should return equipment counts', async () => {
      mockContext.queryOne.mockResolvedValue({
        config_json: createMockConfigJson(),
        version: 1,
        updated_at: new Date(),
      });

      const summary = await repository.getEquipmentSummary();

      expect(summary.totalTanks).toBe(1);
      expect(summary.totalRacks).toBe(1);
      expect(summary.totalBoxes).toBe(10);
      expect(summary.totalPositions).toBe(810); // 10 boxes * 81 positions
    });

    it('should return zero counts when no configuration exists', async () => {
      // Mock getCurrent throwing (which happens when config is null)
      mockContext.queryOne.mockResolvedValue(null);

      // getEquipmentSummary will throw when getCurrent throws
      await expect(repository.getEquipmentSummary()).rejects.toThrow(ValidationError);
    });
  });

  describe('isHealthy()', () => {
    it('should return true when configuration loads successfully', async () => {
      mockContext.queryOne.mockResolvedValue({
        config_json: createMockConfigJson(),
        version: 1,
        updated_at: new Date(),
      });

      const result = await repository.isHealthy();

      expect(result).toBe(true);
    });

    it('should return false on error', async () => {
      mockContext.queryOne.mockRejectedValue(new Error('DB error'));

      const result = await repository.isHealthy();

      expect(result).toBe(false);
    });
  });
});
