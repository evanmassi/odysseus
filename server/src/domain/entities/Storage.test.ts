/**
 * Storage Entity Tests
 */

import { Storage } from './Storage';
import { generateId } from '@domain/utils/generateId';

function createMinimalStorage(): Storage {
  return Storage.createDefault();
}

function createStorageFromData(overrides?: Record<string, unknown>): Storage {
  const defaults = createMinimalStorage().toData();
  return Storage.fromData({ ...defaults, ...overrides });
}

describe('Storage', () => {
  describe('createDefault', () => {
    it('should create with 1 tank, 3 racks, 10 boxes each', () => {
      const storage = Storage.createDefault();
      const data = storage.toData();

      expect(data.tanks).toHaveLength(1);
      expect(data.tanks[0].name).toBe('Tank 1');
      expect(data.tanks[0].racks).toHaveLength(3);
      expect(data.tanks[0].racks[0].name).toBe('Rack 1');
      expect(data.tanks[0].racks[0].boxes).toHaveLength(10);
      expect(data.tanks[0].racks[0].boxes[0].name).toBe('A');
      expect(data.tanks[0].racks[0].boxes[9].name).toBe('J');
    });

    it('should start at version 1', () => {
      const storage = Storage.createDefault();
      expect(storage.version).toBe(1);
    });

    it('should create default system settings', () => {
      const storage = Storage.createDefault();
      const data = storage.toData();
      expect(data.systemSettings.labName).toBe('Standard Laboratory');
      expect(data.systemSettings.defaultResearcher).toBe('');
      expect(data.systemSettings.autoSave).toBe(true);
      expect(data.systemSettings.auditTrailEnabled).toBe(false);
      expect(data.systemSettings.syncEnabled).toBe(true);
    });
  });

  describe('validate', () => {
    it('should throw for version less than 1', () => {
      expect(() => Storage.fromData({
        ...Storage.createDefault().toData(),
        version: -1,
      })).toThrow('Storage configuration version must be at least 1');
    });
  });

  describe('fromData / toData roundtrip', () => {
    it('should preserve all fields through roundtrip', () => {
      const original = Storage.createDefault();
      const data = original.toData();
      const restored = Storage.fromData(data);
      const restoredData = restored.toData();

      expect(restoredData.tanks).toHaveLength(data.tanks.length);
      expect(restoredData.systemSettings).toEqual(data.systemSettings);
      expect(restoredData.version).toBe(data.version);
    });

    it('should handle missing updatedAt and version', () => {
      const data = Storage.createDefault().toData();
      const { updatedAt, version, ...rest } = data;
      const restored = Storage.fromData(rest as any);
      expect(restored.version).toBe(1);
    });

    it('should handle string updatedAt from persistence', () => {
      const data = Storage.createDefault().toData();
      const restored = Storage.fromData({
        ...data,
        updatedAt: '2024-06-15T12:00:00.000Z',
      });
      expect(restored.updatedAt.toISOString()).toBe('2024-06-15T12:00:00.000Z');
    });
  });

  describe('effectiveRackCapacity (via fromData)', () => {
    it('should use BOXES_PER_RACK as minimum capacity', () => {
      const data = Storage.createDefault().toData();
      // Set maxBoxes/capacity below the default
      data.tanks[0].racks[0].maxBoxes = 5;
      data.tanks[0].racks[0].capacity = 5;
      const restored = Storage.fromData(data);
      const restoredData = restored.toData();
      // Should be at least EQUIPMENT_DEFAULTS.BOXES_PER_RACK (10)
      expect(restoredData.tanks[0].racks[0].maxBoxes).toBeGreaterThanOrEqual(10);
    });

    it('should use actual box count when it exceeds defaults', () => {
      const data = Storage.createDefault().toData();
      // Add an 11th box
      data.tanks[0].racks[0].boxes.push({
        name: 'K',
        gridConfig: { rows: 9, cols: 9 },
        maxPositions: 81,
        isActive: true,
      });
      const restored = Storage.fromData(data);
      const restoredData = restored.toData();
      expect(restoredData.tanks[0].racks[0].maxBoxes).toBe(11);
    });
  });

  describe('addTank', () => {
    it('should add a new tank', () => {
      const storage = createMinimalStorage();
      const tankId = generateId('tank');
      const tank = storage.addTank(tankId, 'Tank 2');
      expect(tank.name).toBe('Tank 2');
      expect(storage.tanks).toHaveLength(2);
    });

    it('should throw for duplicate tank ID', () => {
      const storage = createMinimalStorage();
      const existingId = storage.tanks[0].id;
      expect(() => storage.addTank(existingId, 'Duplicate')).toThrow('already exists');
    });
  });

  describe('addRack', () => {
    it('should add a rack to a tank', () => {
      const storage = createMinimalStorage();
      const tankId = storage.tanks[0].id;
      const rackId = generateId('rack');
      const rack = storage.addRack(tankId, rackId, 'Rack 4');
      expect(rack.name).toBe('Rack 4');
      expect(storage.tanks[0].racks).toHaveLength(4);
    });

    it('should throw for non-existent tank', () => {
      const storage = createMinimalStorage();
      expect(() => storage.addRack('bad_id', 'rack_1', 'Rack'))
        .toThrow("Tank 'bad_id' not found");
    });

    it('should throw for duplicate rack ID within tank', () => {
      const storage = createMinimalStorage();
      const tankId = storage.tanks[0].id;
      const existingRackId = storage.tanks[0].racks[0].id;
      expect(() => storage.addRack(tankId, existingRackId, 'Dup'))
        .toThrow('already exists');
    });
  });

  describe('addBox', () => {
    it('should add a box to a rack', () => {
      const storage = createMinimalStorage();
      const tankId = storage.tanks[0].id;
      const rackId = storage.tanks[0].racks[0].id;
      const box = storage.addBox(tankId, rackId, 'K');
      expect(box.name).toBe('K');
    });

    it('should throw for non-existent tank', () => {
      const storage = createMinimalStorage();
      expect(() => storage.addBox('bad', 'bad', 'A'))
        .toThrow("Tank 'bad' not found");
    });

    it('should throw for non-existent rack', () => {
      const storage = createMinimalStorage();
      const tankId = storage.tanks[0].id;
      expect(() => storage.addBox(tankId, 'bad', 'A'))
        .toThrow('not found');
    });

    it('should throw for duplicate box name within rack', () => {
      const storage = createMinimalStorage();
      const tankId = storage.tanks[0].id;
      const rackId = storage.tanks[0].racks[0].id;
      expect(() => storage.addBox(tankId, rackId, 'A'))
        .toThrow('already exists');
    });
  });

  describe('updateSystemSettings', () => {
    it('should return new Storage with updated settings', () => {
      const storage = createMinimalStorage();
      const updated = storage.updateSystemSettings({ labName: 'New Lab' });
      expect(updated.systemSettings.labName).toBe('New Lab');
      // Original unchanged
      expect(storage.systemSettings.labName).toBe('Standard Laboratory');
    });

    it('should preserve unmodified settings', () => {
      const storage = createMinimalStorage();
      const updated = storage.updateSystemSettings({ labName: 'New Lab' });
      expect(updated.systemSettings.autoSave).toBe(true);
      expect(updated.systemSettings.syncEnabled).toBe(true);
    });
  });

  describe('updateBoxPositionDisplay', () => {
    it('should update position display for a specific box', () => {
      const storage = createMinimalStorage();
      const tankId = storage.tanks[0].id;
      const rackId = storage.tanks[0].racks[0].id;
      const config = { format: 'numeric' as const };
      const updated = storage.updateBoxPositionDisplay(tankId, rackId, 'A', config);
      const box = updated.toData().tanks[0].racks[0].boxes[0];
      expect(box.positionDisplay).toEqual(config);
    });

    it('should clear position display when null is passed', () => {
      const storage = createMinimalStorage();
      const tankId = storage.tanks[0].id;
      const rackId = storage.tanks[0].racks[0].id;
      const updated = storage.updateBoxPositionDisplay(tankId, rackId, 'A', null);
      const box = updated.toData().tanks[0].racks[0].boxes[0];
      expect(box.positionDisplay).toBeUndefined();
    });

    it('should throw for non-existent box', () => {
      const storage = createMinimalStorage();
      const tankId = storage.tanks[0].id;
      const rackId = storage.tanks[0].racks[0].id;
      expect(() => storage.updateBoxPositionDisplay(tankId, rackId, 'Z', null))
        .toThrow('not found');
    });
  });

  describe('clearInheritedBoxLabelsForRack', () => {
    it('should clear custom labels on boxes without explicit assignedUserId', () => {
      const data = Storage.createDefault().toData();
      const rackData = data.tanks[0].racks[0];
      // Rack is assigned, box A inherits (no assignedUserId) but has a label
      rackData.assignedUserId = 'user_1';
      rackData.boxes[0] = { ...rackData.boxes[0], customLabel: 'My Box' };
      // Box B has its own assignment — should keep label
      rackData.boxes[1] = { ...rackData.boxes[1], assignedUserId: 'user_2', customLabel: 'Owned Box' };

      const storage = Storage.fromData(data);
      const tankId = storage.tanks[0].id;
      const rackId = storage.tanks[0].racks[0].id;

      storage.clearInheritedBoxLabelsForRack(tankId, rackId);

      const result = storage.toData();
      expect(result.tanks[0].racks[0].boxes[0].customLabel).toBeUndefined();
      expect(result.tanks[0].racks[0].boxes[1].customLabel).toBe('Owned Box');
    });

    it('should do nothing for non-existent tank', () => {
      const storage = createMinimalStorage();
      expect(() => storage.clearInheritedBoxLabelsForRack('bad', 'bad')).not.toThrow();
    });

    it('should do nothing for non-existent rack', () => {
      const storage = createMinimalStorage();
      const tankId = storage.tanks[0].id;
      expect(() => storage.clearInheritedBoxLabelsForRack(tankId, 'bad')).not.toThrow();
    });

    it('should do nothing when no boxes need clearing', () => {
      const storage = createMinimalStorage();
      const tankId = storage.tanks[0].id;
      const rackId = storage.tanks[0].racks[0].id;
      const before = storage.toData();
      storage.clearInheritedBoxLabelsForRack(tankId, rackId);
      const after = storage.toData();
      expect(after.tanks[0].racks[0].boxes).toEqual(before.tanks[0].racks[0].boxes);
    });
  });

  describe('countAssignmentsForUser', () => {
    it('should count rack and box assignments for a user', () => {
      const data = Storage.createDefault().toData();
      data.tanks[0].racks[0].assignedUserId = 'user_1';
      data.tanks[0].racks[0].boxes[0].assignedUserId = 'user_1';
      data.tanks[0].racks[0].boxes[1].assignedUserId = 'user_1';
      data.tanks[0].racks[1].boxes[0].assignedUserId = 'user_1';

      const storage = Storage.fromData(data);
      const counts = storage.countAssignmentsForUser('user_1');
      expect(counts.racks).toBe(1);
      expect(counts.boxes).toBe(3);
    });

    it('should return zeros for user with no assignments', () => {
      const storage = createMinimalStorage();
      const counts = storage.countAssignmentsForUser('user_nobody');
      expect(counts.racks).toBe(0);
      expect(counts.boxes).toBe(0);
    });
  });

  describe('clearAllAssignmentsForUser', () => {
    it('should clear rack and box assignments for a user', () => {
      const data = Storage.createDefault().toData();
      data.tanks[0].racks[0].assignedUserId = 'user_1';
      data.tanks[0].racks[0].boxes[0].assignedUserId = 'user_1';

      const storage = Storage.fromData(data);
      const changed = storage.clearAllAssignmentsForUser('user_1');

      expect(changed).toBe(true);
      const result = storage.toData();
      expect(result.tanks[0].racks[0].assignedUserId).toBeUndefined();
      expect(result.tanks[0].racks[0].boxes[0].assignedUserId).toBeUndefined();
    });

    it('should clear inherited box labels when rack is unassigned', () => {
      const data = Storage.createDefault().toData();
      data.tanks[0].racks[0].assignedUserId = 'user_1';
      // Box with no explicit assignment but has a label (inheriting from rack)
      data.tanks[0].racks[0].boxes[0] = {
        ...data.tanks[0].racks[0].boxes[0],
        customLabel: 'Inherited Label',
      };

      const storage = Storage.fromData(data);
      storage.clearAllAssignmentsForUser('user_1');

      const result = storage.toData();
      expect(result.tanks[0].racks[0].boxes[0].customLabel).toBeUndefined();
    });

    it('should return false when user has no assignments', () => {
      const storage = createMinimalStorage();
      const changed = storage.clearAllAssignmentsForUser('user_nobody');
      expect(changed).toBe(false);
    });

    it('should not rebuild racks when no boxes changed', () => {
      const data = Storage.createDefault().toData();
      // Only assign rack 0 — rack 1 and 2 have no assignments
      data.tanks[0].racks[0].assignedUserId = 'user_1';

      const storage = Storage.fromData(data);
      const racksBefore = storage.tanks[0].racks;

      storage.clearAllAssignmentsForUser('user_1');

      const racksAfter = storage.tanks[0].racks;
      // Rack 0 should be rebuilt (assignment cleared)
      expect(racksAfter[0]).not.toBe(racksBefore[0]);
      // Racks 1 and 2 should be the same reference (no changes)
      expect(racksAfter[1]).toBe(racksBefore[1]);
      expect(racksAfter[2]).toBe(racksBefore[2]);
    });
  });

  describe('updateResourceCustomLabel', () => {
    it('should update rack custom label', () => {
      const storage = createMinimalStorage();
      const tankId = storage.tanks[0].id;
      const rackId = storage.tanks[0].racks[0].id;

      storage.updateResourceCustomLabel('rack', tankId, rackId, undefined, 'My Rack');
      const result = storage.toData();
      expect(result.tanks[0].racks[0].customLabel).toBe('My Rack');
    });

    it('should update box custom label', () => {
      const storage = createMinimalStorage();
      const tankId = storage.tanks[0].id;
      const rackId = storage.tanks[0].racks[0].id;

      storage.updateResourceCustomLabel('box', tankId, rackId, 'A', 'My Box');
      const result = storage.toData();
      expect(result.tanks[0].racks[0].boxes[0].customLabel).toBe('My Box');
    });

    it('should trim and normalize empty labels to undefined', () => {
      const storage = createMinimalStorage();
      const tankId = storage.tanks[0].id;
      const rackId = storage.tanks[0].racks[0].id;

      storage.updateResourceCustomLabel('rack', tankId, rackId, undefined, '   ');
      const result = storage.toData();
      expect(result.tanks[0].racks[0].customLabel).toBeUndefined();
    });

    it('should throw for box update without boxId', () => {
      const storage = createMinimalStorage();
      const tankId = storage.tanks[0].id;
      const rackId = storage.tanks[0].racks[0].id;
      expect(() => storage.updateResourceCustomLabel('box', tankId, rackId, undefined, 'Label'))
        .toThrow('boxId is required');
    });

    it('should throw for non-existent tank', () => {
      const storage = createMinimalStorage();
      expect(() => storage.updateResourceCustomLabel('rack', 'bad', 'bad', undefined, 'x'))
        .toThrow('not found');
    });

    it('should throw for non-existent rack', () => {
      const storage = createMinimalStorage();
      const tankId = storage.tanks[0].id;
      expect(() => storage.updateResourceCustomLabel('rack', tankId, 'bad', undefined, 'x'))
        .toThrow('not found');
    });

    it('should throw for non-existent box', () => {
      const storage = createMinimalStorage();
      const tankId = storage.tanks[0].id;
      const rackId = storage.tanks[0].racks[0].id;
      expect(() => storage.updateResourceCustomLabel('box', tankId, rackId, 'Z', 'x'))
        .toThrow('not found');
    });
  });

  describe('getRack', () => {
    it('should return rack and tank data', () => {
      const storage = createMinimalStorage();
      const tankId = storage.tanks[0].id;
      const rackId = storage.tanks[0].racks[0].id;
      const result = storage.getRack(tankId, rackId);
      expect(result).not.toBeNull();
      expect(result!.rack.name).toBe('Rack 1');
      expect(result!.tank.name).toBe('Tank 1');
    });

    it('should return null for non-existent tank', () => {
      const storage = createMinimalStorage();
      expect(storage.getRack('bad', 'bad')).toBeNull();
    });

    it('should return null for non-existent rack', () => {
      const storage = createMinimalStorage();
      const tankId = storage.tanks[0].id;
      expect(storage.getRack(tankId, 'bad')).toBeNull();
    });
  });

  describe('getBox', () => {
    it('should return box, rack, and tank data', () => {
      const storage = createMinimalStorage();
      const tankId = storage.tanks[0].id;
      const rackId = storage.tanks[0].racks[0].id;
      const result = storage.getBox(tankId, rackId, 'A');
      expect(result).not.toBeNull();
      expect(result!.box.name).toBe('A');
      expect(result!.rack.name).toBe('Rack 1');
      expect(result!.tank.name).toBe('Tank 1');
    });

    it('should be case-insensitive for box name', () => {
      const storage = createMinimalStorage();
      const tankId = storage.tanks[0].id;
      const rackId = storage.tanks[0].racks[0].id;
      const result = storage.getBox(tankId, rackId, 'a');
      expect(result).not.toBeNull();
      expect(result!.box.name).toBe('A');
    });

    it('should return null for non-existent box', () => {
      const storage = createMinimalStorage();
      const tankId = storage.tanks[0].id;
      const rackId = storage.tanks[0].racks[0].id;
      expect(storage.getBox(tankId, rackId, 'Z')).toBeNull();
    });
  });

  describe('updateLabDefaultPositionDisplay', () => {
    it('should set lab default position display', () => {
      const storage = createMinimalStorage();
      const config = { format: 'numeric' as const };
      const updated = storage.updateLabDefaultPositionDisplay(config);
      expect(updated.systemSettings.defaultPositionDisplay).toEqual(config);
    });

    it('should clear lab default when null', () => {
      const storage = createMinimalStorage();
      const config = { format: 'numeric' as const };
      const withConfig = storage.updateLabDefaultPositionDisplay(config);
      const cleared = withConfig.updateLabDefaultPositionDisplay(null);
      expect(cleared.systemSettings.defaultPositionDisplay).toBeUndefined();
    });
  });

  describe('updateFromData', () => {
    it('should replace equipment and system settings', () => {
      const storage = createMinimalStorage();
      const newData = Storage.createDefault().toData();
      newData.systemSettings.labName = 'Updated Lab';

      storage.updateFromData({
        tanks: newData.tanks,
        systemSettings: newData.systemSettings,
      });

      expect(storage.systemSettings.labName).toBe('Updated Lab');
    });

    it('should update timestamp', () => {
      const storage = createMinimalStorage();
      const before = storage.updatedAt;
      const data = storage.toData();
      storage.updateFromData({ tanks: data.tanks, systemSettings: data.systemSettings });
      expect(storage.updatedAt.getTime()).toBeGreaterThanOrEqual(before.getTime());
    });
  });

  describe('seeding', () => {
    it('seedAll should mark all resources as seeded', () => {
      const storage = createMinimalStorage();
      storage.seedAll();
      expect(storage.hasAnySeededResources()).toBe(true);
      expect(storage.isResourceSeeded(storage.tanks[0].id)).toBe(true);
      expect(storage.isResourceSeeded(
        storage.tanks[0].id,
        storage.tanks[0].racks[0].id,
      )).toBe(true);
      expect(storage.isResourceSeeded(
        storage.tanks[0].id,
        storage.tanks[0].racks[0].id,
        'A',
      )).toBe(true);
    });

    it('unseedAll should mark all resources as unseeded', () => {
      const storage = createMinimalStorage();
      storage.seedAll();
      storage.unseedAll();
      expect(storage.hasAnySeededResources()).toBe(false);
    });

    it('removeNonSeededEquipment should keep only seeded resources', () => {
      const storage = createMinimalStorage();
      storage.seedAll();

      // Add a non-seeded tank
      const newTankId = generateId('tank');
      storage.addTank(newTankId, 'Non-seeded Tank');

      storage.removeNonSeededEquipment();
      expect(storage.tanks).toHaveLength(1);
      expect(storage.tanks[0].name).toBe('Tank 1');
    });

    it('countNonSeededTanks should count correctly', () => {
      const storage = createMinimalStorage();
      expect(storage.countNonSeededTanks()).toBe(1);
      storage.seedAll();
      expect(storage.countNonSeededTanks()).toBe(0);
    });

    it('countNonSeededRacksInTank should count correctly', () => {
      const storage = createMinimalStorage();
      const tankId = storage.tanks[0].id;
      expect(storage.countNonSeededRacksInTank(tankId)).toBe(3);
      storage.seedAll();
      expect(storage.countNonSeededRacksInTank(tankId)).toBe(0);
    });

    it('countNonSeededBoxesInRack should count correctly', () => {
      const storage = createMinimalStorage();
      const tankId = storage.tanks[0].id;
      const rackId = storage.tanks[0].racks[0].id;
      expect(storage.countNonSeededBoxesInRack(tankId, rackId)).toBe(10);
      storage.seedAll();
      expect(storage.countNonSeededBoxesInRack(tankId, rackId)).toBe(0);
    });

    it('isResourceSeeded should return false for non-existent resources', () => {
      const storage = createMinimalStorage();
      expect(storage.isResourceSeeded('bad')).toBe(false);
      expect(storage.isResourceSeeded(storage.tanks[0].id, 'bad')).toBe(false);
      expect(storage.isResourceSeeded(storage.tanks[0].id, storage.tanks[0].racks[0].id, 'Z')).toBe(false);
    });

    it('countNonSeeded should return 0 for non-existent resources', () => {
      const storage = createMinimalStorage();
      expect(storage.countNonSeededRacksInTank('bad')).toBe(0);
      expect(storage.countNonSeededBoxesInRack('bad', 'bad')).toBe(0);
      expect(storage.countNonSeededBoxesInRack(storage.tanks[0].id, 'bad')).toBe(0);
    });
  });

  describe('applyPersistedVersion', () => {
    it('should update the version number', () => {
      const storage = createMinimalStorage();
      expect(storage.version).toBe(1);
      storage.applyPersistedVersion(42);
      expect(storage.version).toBe(42);
    });
  });

  describe('date immutability', () => {
    it('should return copies of updatedAt', () => {
      const storage = createMinimalStorage();
      const date1 = storage.updatedAt;
      const date2 = storage.updatedAt;
      expect(date1).not.toBe(date2);
      expect(date1.getTime()).toBe(date2.getTime());
    });
  });

  describe('SystemSettings validation', () => {
    it('should throw for empty lab name', () => {
      const data = Storage.createDefault().toData();
      data.systemSettings.labName = '';
      expect(() => Storage.fromData(data)).toThrow('Lab name is required');
    });

    it('should throw for lab name exceeding 200 characters', () => {
      const data = Storage.createDefault().toData();
      data.systemSettings.labName = 'x'.repeat(201);
      expect(() => Storage.fromData(data)).toThrow('Lab name cannot exceed 200 characters');
    });

    it('should throw for default researcher exceeding 100 characters', () => {
      const data = Storage.createDefault().toData();
      data.systemSettings.defaultResearcher = 'x'.repeat(101);
      expect(() => Storage.fromData(data)).toThrow('Default researcher name cannot exceed 100 characters');
    });
  });
});
