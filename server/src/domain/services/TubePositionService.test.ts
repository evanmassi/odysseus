/**
 * Tube Position Service Tests
 */

import { TubePositionService } from './TubePositionService';
import { TubeLocation } from '@domain/value-objects/TubeLocation';
import { Storage } from '@domain/entities/Storage';
import { createTestTube } from '@domain/__tests__/helpers';

const mockTubeRepository = {
  findByLocation: jest.fn(),
  getOccupiedPositions: jest.fn(),
  findByRackAndBox: jest.fn(),
} as any;

const mockStorageRepository = {
  isLocationValid: jest.fn(),
  tankExists: jest.fn(),
  rackExists: jest.fn(),
  boxExists: jest.fn(),
  getMaxPosition: jest.fn(),
} as any;

function createService() {
  return new TubePositionService(mockTubeRepository, mockStorageRepository);
}

beforeEach(() => {
  jest.clearAllMocks();
});

describe('TubePositionService', () => {
  describe('canPlaceTubeAt', () => {
    const location = TubeLocation.create('T1', 'R1', 'A', 1);

    it('should allow placement at valid empty position', async () => {
      mockStorageRepository.isLocationValid.mockResolvedValue(true);
      mockTubeRepository.findByLocation.mockResolvedValue(null);
      mockTubeRepository.getOccupiedPositions.mockResolvedValue([]);
      mockStorageRepository.getMaxPosition.mockResolvedValue(81);
      mockTubeRepository.findByRackAndBox.mockResolvedValue([]);

      const result = await createService().canPlaceTubeAt(location, 'lab_1');
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should reject invalid location', async () => {
      mockStorageRepository.isLocationValid.mockResolvedValue(false);
      mockStorageRepository.tankExists.mockResolvedValue(false);

      const result = await createService().canPlaceTubeAt(location, 'lab_1');
      expect(result.isValid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });

    it('should reject position conflict', async () => {
      mockStorageRepository.isLocationValid.mockResolvedValue(true);
      const existing = createTestTube();
      mockTubeRepository.findByLocation.mockResolvedValue(existing);
      mockTubeRepository.getOccupiedPositions.mockResolvedValue([1]);
      mockStorageRepository.getMaxPosition.mockResolvedValue(81);
      mockTubeRepository.findByRackAndBox.mockResolvedValue([existing]);

      const result = await createService().canPlaceTubeAt(location, 'lab_1');
      expect(result.isValid).toBe(false);
      expect(result.errors.some(e => e.includes('already occupied'))).toBe(true);
    });

    it('should exclude own tube from conflict check during move', async () => {
      mockStorageRepository.isLocationValid.mockResolvedValue(true);
      const tube = createTestTube();
      mockTubeRepository.findByLocation.mockResolvedValue(tube);
      mockTubeRepository.getOccupiedPositions.mockResolvedValue([1]);
      mockStorageRepository.getMaxPosition.mockResolvedValue(81);
      mockTubeRepository.findByRackAndBox.mockResolvedValue([tube]);

      const result = await createService().canPlaceTubeAt(location, 'lab_1', tube.id);
      expect(result.isValid).toBe(true);
    });
  });

  describe('validateEquipmentConfiguration', () => {
    it('should pass for valid location', async () => {
      mockStorageRepository.isLocationValid.mockResolvedValue(true);
      const location = TubeLocation.create('T1', 'R1', 'A', 1);

      const result = await createService().validateEquipmentConfiguration(location, 'lab_1');
      expect(result.isValid).toBe(true);
    });

    it('should identify missing tank', async () => {
      mockStorageRepository.isLocationValid.mockResolvedValue(false);
      mockStorageRepository.tankExists.mockResolvedValue(false);
      const location = TubeLocation.create('T99', 'R1', 'A', 1);

      const result = await createService().validateEquipmentConfiguration(location, 'lab_1');
      expect(result.isValid).toBe(false);
      expect(result.errors.some(e => e.includes("Tank 'T99'"))).toBe(true);
    });

    it('should identify missing rack', async () => {
      mockStorageRepository.isLocationValid.mockResolvedValue(false);
      mockStorageRepository.tankExists.mockResolvedValue(true);
      mockStorageRepository.rackExists.mockResolvedValue(false);
      const location = TubeLocation.create('T1', 'R99', 'A', 1);

      const result = await createService().validateEquipmentConfiguration(location, 'lab_1');
      expect(result.isValid).toBe(false);
      expect(result.errors.some(e => e.includes('Rack R99'))).toBe(true);
    });

    it('should identify missing box', async () => {
      mockStorageRepository.isLocationValid.mockResolvedValue(false);
      mockStorageRepository.tankExists.mockResolvedValue(true);
      mockStorageRepository.rackExists.mockResolvedValue(true);
      mockStorageRepository.boxExists.mockResolvedValue(false);
      const location = TubeLocation.create('T1', 'R1', 'Z', 1);

      const result = await createService().validateEquipmentConfiguration(location, 'lab_1');
      expect(result.isValid).toBe(false);
      expect(result.errors.some(e => e.includes("Box 'Z'"))).toBe(true);
    });

    it('should reject position exceeding max', async () => {
      mockStorageRepository.isLocationValid.mockResolvedValue(false);
      mockStorageRepository.tankExists.mockResolvedValue(true);
      mockStorageRepository.rackExists.mockResolvedValue(true);
      mockStorageRepository.boxExists.mockResolvedValue(true);
      mockStorageRepository.getMaxPosition.mockResolvedValue(20);
      const location = TubeLocation.create('T1', 'R1', 'A', 50);

      const result = await createService().validateEquipmentConfiguration(location, 'lab_1');
      expect(result.isValid).toBe(false);
      expect(result.errors.some(e => e.includes('exceeds maximum'))).toBe(true);
    });
  });

  describe('applyPositionBusinessRules', () => {
    const location = TubeLocation.create('T1', 'R1', 'A', 5);

    it('should warn when box is over 90% full', async () => {
      mockTubeRepository.getOccupiedPositions.mockResolvedValue(
        new Array(75).fill(0).map((_, i) => i + 1)
      );
      mockStorageRepository.getMaxPosition.mockResolvedValue(81);
      mockTubeRepository.findByRackAndBox.mockResolvedValue([]);

      const result = await createService().applyPositionBusinessRules(location, 'lab_1');
      expect(result.warnings?.some(w => w.includes('full'))).toBe(true);
    });

    it('should not warn when box has space', async () => {
      mockTubeRepository.getOccupiedPositions.mockResolvedValue([1, 2, 3]);
      mockStorageRepository.getMaxPosition.mockResolvedValue(81);
      mockTubeRepository.findByRackAndBox.mockResolvedValue([]);

      const result = await createService().applyPositionBusinessRules(location, 'lab_1');
      expect(result.warnings?.some(w => w.includes('full'))).toBeFalsy();
    });
  });

  describe('validatePositionBulk', () => {
    const config = Storage.fromData({
      tanks: [
        {
          id: 'T1',
          name: 'Tank 1',
          racks: [
            { id: '1', name: 'R1', boxes: [{ name: 'A', gridConfig: { rows: 9, cols: 9 } }] },
          ],
        },
      ],
      systemSettings: {
        labName: 'Lab',
        defaultResearcher: '',
        autoSave: true,
        auditTrailEnabled: true,
        syncEnabled: false,
      },
    });

    it('should validate multiple positions', () => {
      const positions = [
        { tankId: 'T1', rackId: '1', boxId: 'A', position: 1 },
        { tankId: 'T1', rackId: '1', boxId: 'A', position: 2 },
      ];
      const preloaded = {
        config,
        occupiedPositions: new Set<number>(),
        maxPosition: 81,
        tubesInBox: [],
      };

      const results = createService().validatePositionBulk(positions, preloaded);
      expect(results.get(1)?.isValid).toBe(true);
      expect(results.get(2)?.isValid).toBe(true);
    });

    it('should reject occupied positions', () => {
      const positions = [{ tankId: 'T1', rackId: '1', boxId: 'A', position: 1 }];
      const preloaded = {
        config,
        occupiedPositions: new Set([1]),
        maxPosition: 81,
        tubesInBox: [],
      };

      const results = createService().validatePositionBulk(positions, preloaded);
      expect(results.get(1)?.isValid).toBe(false);
      expect(results.get(1)?.reason).toContain('already occupied');
    });

    it('should reject positions exceeding capacity', () => {
      const positions = [{ tankId: 'T1', rackId: '1', boxId: 'A', position: 100 }];
      const preloaded = {
        config,
        occupiedPositions: new Set<number>(),
        maxPosition: 81,
        tubesInBox: [],
      };

      const results = createService().validatePositionBulk(positions, preloaded);
      expect(results.get(100)?.isValid).toBe(false);
      expect(results.get(100)?.reason).toContain('exceeds box capacity');
    });

    it('should detect duplicate positions within bulk operation', () => {
      const positions = [
        { tankId: 'T1', rackId: '1', boxId: 'A', position: 1 },
        { tankId: 'T1', rackId: '1', boxId: 'A', position: 1 },
      ];
      const preloaded = {
        config,
        occupiedPositions: new Set<number>(),
        maxPosition: 81,
        tubesInBox: [],
      };

      const results = createService().validatePositionBulk(positions, preloaded);
      const entries = [...results.entries()].filter(([pos]) => pos === 1);
      expect(entries.some(([_, r]) => r.reason?.includes('claimed by another tube'))).toBe(true);
    });

    it('should return empty map for empty input', () => {
      const preloaded = {
        config,
        occupiedPositions: new Set<number>(),
        maxPosition: 81,
        tubesInBox: [],
      };
      const results = createService().validatePositionBulk([], preloaded);
      expect(results.size).toBe(0);
    });
  });
});
