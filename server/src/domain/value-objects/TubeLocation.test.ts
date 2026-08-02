/**
 * Location Value Object Tests
 */

import { TubeLocation } from './TubeLocation';
import { EQUIPMENT_DEFAULTS } from '@odysseus/shared-schemas';

describe('TubeLocation', () => {
  describe('create', () => {
    it('should create from positional arguments', () => {
      const loc = TubeLocation.create('T1', 'R1', 'A', 1);
      expect(loc.tankId).toBe('T1');
      expect(loc.rackId).toBe('R1');
      expect(loc.boxId).toBe('A');
      expect(loc.position).toBe(1);
    });

    it('should create from data object', () => {
      const loc = TubeLocation.create({ tankId: 'T2', rackId: 'R3', boxId: 'b', position: 5 });
      expect(loc.tankId).toBe('T2');
      expect(loc.rackId).toBe('R3');
      expect(loc.boxId).toBe('B');
      expect(loc.position).toBe(5);
    });

    it('should accept max valid position', () => {
      const loc = TubeLocation.create('T1', 'R1', 'A', EQUIPMENT_DEFAULTS.POSITIONS_PER_BOX);
      expect(loc.position).toBe(EQUIPMENT_DEFAULTS.POSITIONS_PER_BOX);
    });
  });

  describe('validation', () => {
    it('should reject empty tank ID', () => {
      expect(() => TubeLocation.create('', 'R1', 'A', 1)).toThrow('Tank ID is required');
    });

    it('should reject whitespace-only tank ID', () => {
      expect(() => TubeLocation.create('  ', 'R1', 'A', 1)).toThrow('Tank ID is required');
    });

    it('should reject tank ID exceeding 50 characters', () => {
      expect(() => TubeLocation.create('T'.repeat(51), 'R1', 'A', 1)).toThrow('cannot exceed 50');
    });

    it('should reject empty rack ID', () => {
      expect(() => TubeLocation.create('T1', '', 'A', 1)).toThrow('Rack ID is required');
    });

    it('should reject rack ID exceeding 50 characters', () => {
      expect(() => TubeLocation.create('T1', 'R'.repeat(51), 'A', 1)).toThrow('cannot exceed 50');
    });

    it('should reject empty box ID', () => {
      expect(() => TubeLocation.create('T1', 'R1', '', 1)).toThrow('Box ID is required');
    });

    it('should reject box ID exceeding 50 characters', () => {
      expect(() => TubeLocation.create('T1', 'R1', 'B'.repeat(51), 1)).toThrow('cannot exceed 50');
    });

    it('should reject position 0', () => {
      expect(() => TubeLocation.create('T1', 'R1', 'A', 0)).toThrow('Position must be between');
    });

    it('should reject negative position', () => {
      expect(() => TubeLocation.create('T1', 'R1', 'A', -1)).toThrow('Position must be between');
    });

    it('should reject position exceeding max', () => {
      expect(() =>
        TubeLocation.create('T1', 'R1', 'A', EQUIPMENT_DEFAULTS.POSITIONS_PER_BOX + 1)
      ).toThrow('Position must be between');
    });

    it('should reject non-integer position', () => {
      expect(() => TubeLocation.create('T1', 'R1', 'A', 1.5)).toThrow('Position must be an integer');
    });
  });

  describe('equals', () => {
    it('should be equal for same location', () => {
      const a = TubeLocation.create('T1', 'R1', 'A', 1);
      const b = TubeLocation.create('T1', 'R1', 'A', 1);
      expect(a.equals(b)).toBe(true);
    });

    it('should be case-insensitive for box ID', () => {
      const a = TubeLocation.create('T1', 'R1', 'a', 1);
      const b = TubeLocation.create('T1', 'R1', 'A', 1);
      expect(a.equals(b)).toBe(true);
    });

    it('should not be equal for different positions', () => {
      const a = TubeLocation.create('T1', 'R1', 'A', 1);
      const b = TubeLocation.create('T1', 'R1', 'A', 2);
      expect(a.equals(b)).toBe(false);
    });

    it('should not be equal for different tanks', () => {
      const a = TubeLocation.create('T1', 'R1', 'A', 1);
      const b = TubeLocation.create('T2', 'R1', 'A', 1);
      expect(a.equals(b)).toBe(false);
    });
  });

  describe('isInSameRack', () => {
    it('should return true for same tank and rack', () => {
      const a = TubeLocation.create('T1', 'R1', 'A', 1);
      const b = TubeLocation.create('T1', 'R1', 'B', 5);
      expect(a.isInSameRack(b)).toBe(true);
    });

    it('should return false for different racks', () => {
      const a = TubeLocation.create('T1', 'R1', 'A', 1);
      const b = TubeLocation.create('T1', 'R2', 'A', 1);
      expect(a.isInSameRack(b)).toBe(false);
    });
  });

  describe('update', () => {
    it('should return new location with updated fields', () => {
      const original = TubeLocation.create('T1', 'R1', 'A', 1);
      const updated = original.update({ position: 5 });
      expect(updated.position).toBe(5);
      expect(updated.tankId).toBe('T1');
      expect(original.position).toBe(1);
    });

    it('should allow updating multiple fields', () => {
      const original = TubeLocation.create('T1', 'R1', 'A', 1);
      const updated = original.update({ tankId: 'T2', rackId: 'R2' });
      expect(updated.tankId).toBe('T2');
      expect(updated.rackId).toBe('R2');
      expect(updated.boxId).toBe('A');
    });
  });

  describe('serialization', () => {
    it('should roundtrip through toData', () => {
      const loc = TubeLocation.create('T1', 'R1', 'a', 3);
      const data = loc.toData();
      const restored = TubeLocation.create(data);
      expect(restored.equals(loc)).toBe(true);
    });

    it('should uppercase box ID in toData', () => {
      const loc = TubeLocation.create('T1', 'R1', 'b', 1);
      expect(loc.toData().boxId).toBe('B');
    });

    it('should format toString correctly', () => {
      const loc = TubeLocation.create('T1', 'R1', 'A', 3);
      expect(loc.toString()).toBe('Tank-T1/Rack-R1/Box-A/Pos-3');
    });
  });
});
