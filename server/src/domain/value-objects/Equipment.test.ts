/**
 * Equipment Value Object Tests
 */

import { Tank, Rack, Box, EquipmentConfiguration } from './Equipment';

describe('Tank', () => {
  describe('create', () => {
    it('should create with defaults', () => {
      const tank = Tank.create({ id: 'T1', name: 'Tank 1' });
      expect(tank.id).toBe('T1');
      expect(tank.name).toBe('Tank 1');
      expect(tank.isActive).toBe(true);
      expect(tank.location).toBe('Main Lab');
      expect(tank.racks).toHaveLength(0);
    });

    it('should create with custom options', () => {
      const rack = Rack.create({ id: '1', name: 'R1' });
      const tank = Tank.create({
        id: 'T2',
        name: 'Tank 2',
        racks: [rack],
        isActive: false,
        location: 'Room B',
      });
      expect(tank.racks).toHaveLength(1);
      expect(tank.isActive).toBe(false);
      expect(tank.location).toBe('Room B');
    });
  });

  describe('validation', () => {
    it('should reject empty ID', () => {
      expect(() => Tank.create({ id: '', name: 'Tank' })).toThrow('Tank ID is required');
    });

    it('should reject whitespace-only ID', () => {
      expect(() => Tank.create({ id: '  ', name: 'Tank' })).toThrow('Tank ID is required');
    });

    it('should reject empty name', () => {
      expect(() => Tank.create({ id: 'T1', name: '' })).toThrow('Tank name is required');
    });

    it('should reject duplicate rack IDs', () => {
      const r1 = Rack.create({ id: '1', name: 'R1' });
      const r2 = Rack.create({ id: '1', name: 'R2' });
      expect(() => Tank.create({ id: 'T1', name: 'Tank', racks: [r1, r2] })).toThrow(
        'duplicate rack IDs'
      );
    });

    it('should reject rack count exceeding max', () => {
      const racks = Array.from({ length: 3 }, (_, i) =>
        Rack.create({ id: String(i), name: `R${i}` })
      );
      expect(() => Tank.create({ id: 'T1', name: 'Tank', racks, maxRacks: 2 })).toThrow(
        'max capacity'
      );
    });
  });

  describe('canAccommodateRack', () => {
    it('should return true when under capacity', () => {
      const tank = Tank.create({ id: 'T1', name: 'Tank', maxRacks: 5 });
      expect(tank.canAccommodateRack()).toBe(true);
    });

    it('should return false when at capacity', () => {
      const racks = Array.from({ length: 2 }, (_, i) =>
        Rack.create({ id: String(i), name: `R${i}` })
      );
      const tank = Tank.create({ id: 'T1', name: 'Tank', racks, maxRacks: 2 });
      expect(tank.canAccommodateRack()).toBe(false);
    });
  });

  describe('toData', () => {
    it('should serialize all fields', () => {
      const tank = Tank.create({ id: 'T1', name: 'Tank 1', isActive: true });
      const data = tank.toData();
      expect(data.id).toBe('T1');
      expect(data.name).toBe('Tank 1');
      expect(data.isActive).toBe(true);
    });

    it('should include isSeeded only when true', () => {
      const seeded = Tank.create({ id: 'T1', name: 'Tank', isSeeded: true });
      const normal = Tank.create({ id: 'T2', name: 'Tank' });
      expect(seeded.toData().isSeeded).toBe(true);
      expect(normal.toData().isSeeded).toBeUndefined();
    });
  });
});

describe('Rack', () => {
  describe('create', () => {
    it('should create with defaults', () => {
      const rack = Rack.create({ id: '1', name: 'Rack 1' });
      expect(rack.id).toBe('1');
      expect(rack.name).toBe('Rack 1');
      expect(rack.isActive).toBe(true);
      expect(rack.boxes).toHaveLength(0);
    });

    it('should coerce numeric ID to string', () => {
      const rack = Rack.create({ id: 3, name: 'Rack 3' });
      expect(rack.id).toBe('3');
    });
  });

  describe('validation', () => {
    it('should reject empty ID', () => {
      expect(() => Rack.create({ id: '', name: 'Rack' })).toThrow('Rack ID is required');
    });

    it('should reject empty name', () => {
      expect(() => Rack.create({ id: '1', name: '' })).toThrow('Rack name is required');
    });

    it('should reject duplicate box names', () => {
      const b1 = Box.create({ name: 'A' });
      const b2 = Box.create({ name: 'a' });
      expect(() => Rack.create({ id: '1', name: 'Rack', boxes: [b1, b2] })).toThrow(
        'duplicate box names'
      );
    });

    it('should reject box count exceeding max', () => {
      const boxes = Array.from({ length: 3 }, (_, i) =>
        Box.create({ name: String.fromCharCode(65 + i) })
      );
      expect(() => Rack.create({ id: '1', name: 'Rack', boxes, maxBoxes: 2 })).toThrow(
        'max capacity'
      );
    });
  });

  describe('toData', () => {
    it('should include assignedUserId', () => {
      const rack = Rack.create({ id: '1', name: 'Rack', assignedUserId: 'user_1' });
      expect(rack.toData().assignedUserId).toBe('user_1');
    });

    it('should omit sharedWithUserIds when empty', () => {
      const rack = Rack.create({ id: '1', name: 'Rack' });
      expect(rack.toData().sharedWithUserIds).toBeUndefined();
    });

    it('should include sharedWithUserIds when present', () => {
      const rack = Rack.create({ id: '1', name: 'Rack', sharedWithUserIds: ['user_1', 'user_2'] });
      expect(rack.toData().sharedWithUserIds).toEqual(['user_1', 'user_2']);
    });
  });
});

describe('Box', () => {
  describe('create', () => {
    it('should create with defaults', () => {
      const box = Box.create({ name: 'A' });
      expect(box.name).toBe('A');
      expect(box.isActive).toBe(true);
      expect(box.gridConfig.rows).toBe(9);
      expect(box.gridConfig.cols).toBe(9);
      expect(box.maxPositions).toBe(81);
    });

    it('should create with custom grid config', () => {
      const box = Box.create({ name: 'B', gridConfig: { rows: 10, cols: 10 } });
      expect(box.maxPositions).toBe(100);
    });
  });

  describe('validation', () => {
    it('should reject empty name', () => {
      expect(() => Box.create({ name: '' })).toThrow('Box name is required');
    });

    it('should reject non-letter name', () => {
      expect(() => Box.create({ name: '1' })).toThrow('single letter A-Z');
    });

    it('should reject multi-character name', () => {
      expect(() => Box.create({ name: 'AB' })).toThrow('single letter A-Z');
    });

    it('should accept lowercase letter (case insensitive)', () => {
      const box = Box.create({ name: 'c' });
      expect(box.name).toBe('C');
    });
  });

  describe('canAccommodatePosition', () => {
    it('should accept valid position', () => {
      const box = Box.create({ name: 'A' });
      expect(box.canAccommodatePosition(1)).toBe(true);
      expect(box.canAccommodatePosition(81)).toBe(true);
    });

    it('should reject position 0', () => {
      const box = Box.create({ name: 'A' });
      expect(box.canAccommodatePosition(0)).toBe(false);
    });

    it('should reject position exceeding max', () => {
      const box = Box.create({ name: 'A' });
      expect(box.canAccommodatePosition(82)).toBe(false);
    });

    it('should reject non-integer', () => {
      const box = Box.create({ name: 'A' });
      expect(box.canAccommodatePosition(1.5)).toBe(false);
    });
  });

  describe('toData', () => {
    it('should uppercase name', () => {
      const box = Box.create({ name: 'c' });
      expect(box.toData().name).toBe('C');
    });

    it('should include isSeeded only when true', () => {
      const seeded = Box.create({ name: 'A', isSeeded: true });
      const normal = Box.create({ name: 'B' });
      expect(seeded.toData().isSeeded).toBe(true);
      expect(normal.toData().isSeeded).toBeUndefined();
    });
  });
});

describe('EquipmentConfiguration', () => {
  describe('create', () => {
    it('should create empty configuration', () => {
      const config = EquipmentConfiguration.empty();
      expect(config.tanks).toHaveLength(0);
    });

    it('should reject duplicate tank IDs', () => {
      const t1 = Tank.create({ id: 'T1', name: 'A' });
      const t2 = Tank.create({ id: 'T1', name: 'B' });
      expect(() => EquipmentConfiguration.create([t1, t2])).toThrow('Tank IDs must be unique');
    });
  });

  describe('isLocationValid', () => {
    const box = Box.create({ name: 'A' });
    const rack = Rack.create({ id: '1', name: 'R1', boxes: [box] });
    const tank = Tank.create({ id: 'T1', name: 'Tank 1', racks: [rack] });
    const config = EquipmentConfiguration.create([tank]);

    it('should return true for valid location', () => {
      expect(config.isLocationValid('T1', '1', 'A', 1)).toBe(true);
    });

    it('should return false for non-existent tank', () => {
      expect(config.isLocationValid('T99', '1', 'A', 1)).toBe(false);
    });

    it('should return false for non-existent rack', () => {
      expect(config.isLocationValid('T1', '99', 'A', 1)).toBe(false);
    });

    it('should return false for invalid position', () => {
      expect(config.isLocationValid('T1', '1', 'A', 999)).toBe(false);
    });

    it('should return false for inactive tank', () => {
      const inactiveTank = Tank.create({
        id: 'T2',
        name: 'Tank 2',
        racks: [rack],
        isActive: false,
      });
      const cfg = EquipmentConfiguration.create([inactiveTank]);
      expect(cfg.isLocationValid('T2', '1', 'A', 1)).toBe(false);
    });
  });

  describe('getActiveTanks', () => {
    it('should filter inactive tanks', () => {
      const active = Tank.create({ id: 'T1', name: 'Active' });
      const inactive = Tank.create({ id: 'T2', name: 'Inactive', isActive: false });
      const config = EquipmentConfiguration.create([active, inactive]);
      expect(config.getActiveTanks()).toHaveLength(1);
      expect(config.getActiveTanks()[0].id).toBe('T1');
    });
  });

  describe('findBox', () => {
    const box = Box.create({ name: 'A' });
    const rack = Rack.create({ id: '1', name: 'R1', boxes: [box] });
    const tank = Tank.create({ id: 'T1', name: 'Tank 1', racks: [rack] });
    const config = EquipmentConfiguration.create([tank]);

    it('should find existing box', () => {
      const found = config.findBox('T1', '1', 'A');
      expect(found).not.toBeNull();
      expect(found!.name).toBe('A');
    });

    it('should return null for non-existent box', () => {
      expect(config.findBox('T1', '1', 'Z')).toBeNull();
    });

    it('should return null for non-existent tank', () => {
      expect(config.findBox('T99', '1', 'A')).toBeNull();
    });
  });

  describe('toData', () => {
    it('should serialize and deserialize tanks', () => {
      const box = Box.create({ name: 'A' });
      const rack = Rack.create({ id: '1', name: 'R1', boxes: [box] });
      const tank = Tank.create({ id: 'T1', name: 'Tank 1', racks: [rack] });
      const config = EquipmentConfiguration.create([tank]);
      const data = config.toData();
      expect(data.tanks).toHaveLength(1);
      expect(data.tanks[0].racks[0].boxes[0].name).toBe('A');
    });
  });
});
