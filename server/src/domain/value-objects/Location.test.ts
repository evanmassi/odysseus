/**
 * Location Value Object Tests
 */

import { Location } from './Location';
import { EQUIPMENT_DEFAULTS } from '@odysseus/shared-schemas';

describe('Location', () => {
  describe('create', () => {
    it('should create from positional arguments', () => {
      const loc = Location.create('T1', 'R1', 'A', 1);
      expect(loc.tankId).toBe('T1');
      expect(loc.rackId).toBe('R1');
      expect(loc.boxId).toBe('A');
      expect(loc.position).toBe(1);
    });

    it('should create from data object', () => {
      const loc = Location.create({ tankId: 'T2', rackId: 'R3', boxId: 'b', position: 5 });
      expect(loc.tankId).toBe('T2');
      expect(loc.rackId).toBe('R3');
      expect(loc.boxId).toBe('B');
      expect(loc.position).toBe(5);
    });

    it('should accept max valid position', () => {
      const loc = Location.create('T1', 'R1', 'A', EQUIPMENT_DEFAULTS.POSITIONS_PER_BOX);
      expect(loc.position).toBe(EQUIPMENT_DEFAULTS.POSITIONS_PER_BOX);
    });
  });

  describe('validation', () => {
    it('should reject empty tank ID', () => {
      expect(() => Location.create('', 'R1', 'A', 1)).toThrow('Tank ID is required');
    });

    it('should reject whitespace-only tank ID', () => {
      expect(() => Location.create('  ', 'R1', 'A', 1)).toThrow('Tank ID is required');
    });

    it('should reject tank ID exceeding 50 characters', () => {
      expect(() => Location.create('T'.repeat(51), 'R1', 'A', 1)).toThrow('cannot exceed 50');
    });

    it('should reject empty rack ID', () => {
      expect(() => Location.create('T1', '', 'A', 1)).toThrow('Rack ID is required');
    });

    it('should reject rack ID exceeding 50 characters', () => {
      expect(() => Location.create('T1', 'R'.repeat(51), 'A', 1)).toThrow('cannot exceed 50');
    });

    it('should reject empty box ID', () => {
      expect(() => Location.create('T1', 'R1', '', 1)).toThrow('Box ID is required');
    });

    it('should reject box ID exceeding 50 characters', () => {
      expect(() => Location.create('T1', 'R1', 'B'.repeat(51), 1)).toThrow('cannot exceed 50');
    });

    it('should reject position 0', () => {
      expect(() => Location.create('T1', 'R1', 'A', 0)).toThrow('Position must be between');
    });

    it('should reject negative position', () => {
      expect(() => Location.create('T1', 'R1', 'A', -1)).toThrow('Position must be between');
    });

    it('should reject position exceeding max', () => {
      expect(() => Location.create('T1', 'R1', 'A', EQUIPMENT_DEFAULTS.POSITIONS_PER_BOX + 1))
        .toThrow('Position must be between');
    });

    it('should reject non-integer position', () => {
      expect(() => Location.create('T1', 'R1', 'A', 1.5)).toThrow('Position must be an integer');
    });
  });

  describe('equals', () => {
    it('should be equal for same location', () => {
      const a = Location.create('T1', 'R1', 'A', 1);
      const b = Location.create('T1', 'R1', 'A', 1);
      expect(a.equals(b)).toBe(true);
    });

    it('should be case-insensitive for box ID', () => {
      const a = Location.create('T1', 'R1', 'a', 1);
      const b = Location.create('T1', 'R1', 'A', 1);
      expect(a.equals(b)).toBe(true);
    });

    it('should not be equal for different positions', () => {
      const a = Location.create('T1', 'R1', 'A', 1);
      const b = Location.create('T1', 'R1', 'A', 2);
      expect(a.equals(b)).toBe(false);
    });

    it('should not be equal for different tanks', () => {
      const a = Location.create('T1', 'R1', 'A', 1);
      const b = Location.create('T2', 'R1', 'A', 1);
      expect(a.equals(b)).toBe(false);
    });
  });

  describe('isInSameRack', () => {
    it('should return true for same tank and rack', () => {
      const a = Location.create('T1', 'R1', 'A', 1);
      const b = Location.create('T1', 'R1', 'B', 5);
      expect(a.isInSameRack(b)).toBe(true);
    });

    it('should return false for different racks', () => {
      const a = Location.create('T1', 'R1', 'A', 1);
      const b = Location.create('T1', 'R2', 'A', 1);
      expect(a.isInSameRack(b)).toBe(false);
    });
  });

  describe('update', () => {
    it('should return new location with updated fields', () => {
      const original = Location.create('T1', 'R1', 'A', 1);
      const updated = original.update({ position: 5 });
      expect(updated.position).toBe(5);
      expect(updated.tankId).toBe('T1');
      expect(original.position).toBe(1);
    });

    it('should allow updating multiple fields', () => {
      const original = Location.create('T1', 'R1', 'A', 1);
      const updated = original.update({ tankId: 'T2', rackId: 'R2' });
      expect(updated.tankId).toBe('T2');
      expect(updated.rackId).toBe('R2');
      expect(updated.boxId).toBe('A');
    });
  });

  describe('serialization', () => {
    it('should roundtrip through toData', () => {
      const loc = Location.create('T1', 'R1', 'a', 3);
      const data = loc.toData();
      const restored = Location.create(data);
      expect(restored.equals(loc)).toBe(true);
    });

    it('should uppercase box ID in toData', () => {
      const loc = Location.create('T1', 'R1', 'b', 1);
      expect(loc.toData().boxId).toBe('B');
    });

    it('should format toString correctly', () => {
      const loc = Location.create('T1', 'R1', 'A', 3);
      expect(loc.toString()).toBe('Tank-T1/Rack-R1/Box-A/Pos-3');
    });
  });
});
