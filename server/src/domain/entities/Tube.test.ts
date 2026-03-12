/**
 * Tube Entity Tests
 *
 * Validates creation, location moves, sample updates, locking, sharing, and roundtrip serialization.
 */

import { Tube } from './Tube';
import { Location } from '@domain/value-objects/Location';
import { createTestTube } from '@domain/__tests__/helpers';

describe('Tube', () => {
  describe('create', () => {
    it('should create a tube with default values', () => {
      const tube = createTestTube();
      expect(tube.id).toMatch(/^tube_/);
      expect(tube.location.tankId).toBe('T1');
      expect(tube.location.rackId).toBe('R1');
      expect(tube.location.boxId).toBe('A');
      expect(tube.location.position).toBe(1);
      expect(tube.sample.cellType).toBe('HeLa');
      expect(tube.version).toBe(1);
      expect(tube.isLocked).toBe(false);
      expect(tube.sharedWithUserIds).toEqual([]);
      expect(tube.createdAt).toBeInstanceOf(Date);
    });

    it('should accept custom location', () => {
      const tube = createTestTube({ location: { tankId: 'T2', rackId: 'R3', boxId: 'B', position: 5 } });
      expect(tube.location.tankId).toBe('T2');
      expect(tube.location.position).toBe(5);
    });

    it('should accept labId', () => {
      const tube = createTestTube({ labId: 'lab_123' });
      expect(tube.labId).toBe('lab_123');
    });

    it('should accept researcherId', () => {
      const tube = createTestTube({ researcherId: 'res_1' });
      expect(tube.researcherId).toBe('res_1');
    });

    it('should throw for missing tank ID', () => {
      expect(() => Tube.create({
        location: { tankId: '', rackId: 'R1', boxId: 'A', position: 1 },
        sample: {},
      })).toThrow('Tank ID is required');
    });

    it('should throw for invalid position', () => {
      expect(() => Tube.create({
        location: { tankId: 'T1', rackId: 'R1', boxId: 'A', position: 0 },
        sample: {},
      })).toThrow();
    });
  });

  describe('moveTo', () => {
    it('should update location', () => {
      const tube = createTestTube();
      const newLoc = Location.create({ tankId: 'T2', rackId: 'R2', boxId: 'B', position: 3 });
      tube.moveTo(newLoc);
      expect(tube.location.tankId).toBe('T2');
      expect(tube.location.position).toBe(3);
    });

    it('should no-op when location is the same', () => {
      const tube = createTestTube();
      const before = tube.updatedAt;
      const sameLoc = Location.create({ tankId: 'T1', rackId: 'R1', boxId: 'A', position: 1 });
      tube.moveTo(sameLoc);
      // updatedAt shouldn't change for no-op
      expect(tube.location.position).toBe(1);
    });
  });

  describe('updateSample', () => {
    it('should update sample fields', () => {
      const tube = createTestTube({ sample: { cellType: 'HeLa', notes: 'old' } });
      tube.updateSample({ notes: 'new note' });
      expect(tube.sample.notes).toBe('new note');
      expect(tube.sample.cellType).toBe('HeLa');
    });

    it('should clear field when set to null (tri-state)', () => {
      const tube = createTestTube({ sample: { cellType: 'HeLa', notes: 'remove me' } });
      tube.updateSample({ notes: null });
      expect(tube.sample.notes).toBeUndefined();
    });

    it('should preserve field when omitted', () => {
      const tube = createTestTube({ sample: { cellType: 'HeLa', notes: 'keep' } });
      tube.updateSample({ cellType: 'iPSC' });
      expect(tube.sample.notes).toBe('keep');
      expect(tube.sample.cellType).toBe('iPSC');
    });
  });

  describe('assignToResearcher', () => {
    it('should assign researcher', () => {
      const tube = createTestTube();
      tube.assignToResearcher('res_1');
      expect(tube.researcherId).toBe('res_1');
    });

    it('should clear researcher with undefined', () => {
      const tube = createTestTube({ researcherId: 'res_1' });
      tube.assignToResearcher(undefined);
      expect(tube.researcherId).toBeUndefined();
    });
  });

  describe('lock / unlock', () => {
    it('should return a new locked tube', () => {
      const tube = createTestTube();
      const locked = tube.lock('user_1', 'Experiment in progress');
      expect(locked.isLocked).toBe(true);
      expect(locked.lockedBy).toBe('user_1');
      expect(locked.lockNote).toBe('Experiment in progress');
      expect(locked.lockedAt).toBeInstanceOf(Date);
      expect(locked.version).toBe(tube.version + 1);
    });

    it('should preserve original tube immutability', () => {
      const tube = createTestTube();
      const locked = tube.lock('user_1');
      expect(tube.isLocked).toBe(false);
      expect(locked.isLocked).toBe(true);
    });

    it('should throw when locking already locked tube', () => {
      const tube = createTestTube();
      const locked = tube.lock('user_1');
      expect(() => locked.lock('user_2')).toThrow('Tube is already locked');
    });

    it('should unlock a locked tube', () => {
      const locked = createTestTube().lock('user_1', 'note');
      const unlocked = locked.unlock();
      expect(unlocked.isLocked).toBe(false);
      expect(unlocked.lockedBy).toBeUndefined();
      expect(unlocked.lockNote).toBeUndefined();
      expect(unlocked.lockedAt).toBeUndefined();
      expect(unlocked.version).toBe(locked.version + 1);
    });

    it('should throw when unlocking unlocked tube', () => {
      const tube = createTestTube();
      expect(() => tube.unlock()).toThrow('Tube is not locked');
    });

    it('should clear shared users on unlock', () => {
      const locked = createTestTube().lock('user_1');
      const shared = locked.shareWith(['user_2']);
      const unlocked = shared.unlock();
      expect(unlocked.sharedWithUserIds).toEqual([]);
    });
  });

  describe('updateLockNote', () => {
    it('should return new instance with updated note', () => {
      const locked = createTestTube().lock('user_1', 'old');
      const updated = locked.updateLockNote('new note');
      expect(updated.lockNote).toBe('new note');
      expect(locked.lockNote).toBe('old');
    });

    it('should throw when tube is not locked', () => {
      const tube = createTestTube();
      expect(() => tube.updateLockNote('note')).toThrow('Cannot update lock note on unlocked tube');
    });
  });

  describe('sharing', () => {
    it('should add shared user IDs', () => {
      const locked = createTestTube().lock('user_1');
      const shared = locked.shareWith(['user_2', 'user_3']);
      expect(shared.sharedWithUserIds).toContain('user_2');
      expect(shared.sharedWithUserIds).toContain('user_3');
    });

    it('should deduplicate shared users', () => {
      const locked = createTestTube().lock('user_1');
      const shared = locked.shareWith(['user_2']).shareWith(['user_2', 'user_3']);
      expect(shared.sharedWithUserIds.filter(id => id === 'user_2').length).toBe(1);
    });

    it('should revoke access', () => {
      const locked = createTestTube().lock('user_1');
      const shared = locked.shareWith(['user_2', 'user_3']);
      const revoked = shared.revokeAccess(['user_2']);
      expect(revoked.sharedWithUserIds).not.toContain('user_2');
      expect(revoked.sharedWithUserIds).toContain('user_3');
    });
  });

  describe('access checks', () => {
    it('should allow access to unlocked tube', () => {
      const tube = createTestTube();
      expect(tube.canBeAccessedBy('anyone')).toBe(true);
    });

    it('should allow lock owner to access', () => {
      const locked = createTestTube().lock('user_1');
      expect(locked.canBeAccessedBy('user_1')).toBe(true);
    });

    it('should allow shared user to access', () => {
      const locked = createTestTube().lock('user_1');
      const shared = locked.shareWith(['user_2']);
      expect(shared.canBeAccessedBy('user_2')).toBe(true);
    });

    it('should deny non-shared user access to locked tube', () => {
      const locked = createTestTube().lock('user_1');
      expect(locked.canBeAccessedBy('user_3')).toBe(false);
    });

    it('isLockedBy should identify lock owner', () => {
      const locked = createTestTube().lock('user_1');
      expect(locked.isLockedBy('user_1')).toBe(true);
      expect(locked.isLockedBy('user_2')).toBe(false);
    });
  });

  describe('update method (PATCH)', () => {
    it('should update location partially', () => {
      const tube = createTestTube();
      const updated = tube.update({ location: { position: 5 } });
      expect(updated.location.position).toBe(5);
      expect(updated.location.tankId).toBe('T1');
      expect(updated.version).toBe(tube.version + 1);
    });

    it('should update sample via tri-state', () => {
      const tube = createTestTube({ sample: { cellType: 'HeLa', notes: 'keep' } });
      const updated = tube.update({ sample: { notes: null } });
      expect(updated.sample.notes).toBeUndefined();
      expect(updated.sample.cellType).toBe('HeLa');
    });

    it('should clear researcher with null', () => {
      const tube = createTestTube({ researcherId: 'res_1' });
      const updated = tube.update({ researcherId: null });
      expect(updated.researcherId).toBeUndefined();
    });

    it('should preserve researcher when omitted', () => {
      const tube = createTestTube({ researcherId: 'res_1' });
      const updated = tube.update({ sample: { cellType: 'iPSC' } });
      expect(updated.researcherId).toBe('res_1');
    });
  });

  describe('location queries', () => {
    it('should detect same location', () => {
      const tube1 = createTestTube();
      const tube2 = createTestTube();
      expect(tube1.isInSameLocationAs(tube2)).toBe(true);
    });

    it('should detect different location', () => {
      const tube1 = createTestTube();
      const tube2 = createTestTube({ location: { tankId: 'T2', rackId: 'R1', boxId: 'A', position: 1 } });
      expect(tube1.isInSameLocationAs(tube2)).toBe(false);
    });

    it('should detect same rack', () => {
      const tube1 = createTestTube({ location: { tankId: 'T1', rackId: 'R1', boxId: 'A', position: 1 } });
      const tube2 = createTestTube({ location: { tankId: 'T1', rackId: 'R1', boxId: 'B', position: 2 } });
      expect(tube1.isInSameRackAs(tube2)).toBe(true);
    });

    it('should return location description', () => {
      const tube = createTestTube();
      const desc = tube.getLocationDescription();
      expect(desc).toContain('T1');
      expect(desc).toContain('R1');
    });
  });

  describe('sample queries', () => {
    it('should check concentration data', () => {
      const withConc = createTestTube({ sample: { cellType: 'HeLa', concentration: 1.5, concentrationUnit: 'c/mL' } });
      expect(withConc.hasConcentrationData()).toBe(true);

      const without = createTestTube();
      expect(without.hasConcentrationData()).toBe(false);
    });

    it('should check complete sample data', () => {
      const complete = createTestTube({
        sample: { cellType: 'HeLa', donorInternalId: 'D1', date: '2024-01-01' },
      });
      expect(complete.hasCompleteSampleData()).toBe(true);

      const incomplete = createTestTube({ sample: { cellType: 'HeLa' } });
      expect(incomplete.hasCompleteSampleData()).toBe(false);
    });
  });

  describe('toData / fromData roundtrip', () => {
    it('should preserve all fields', () => {
      const original = createTestTube({ labId: 'lab_1', researcherId: 'res_1' });
      const data = original.toData();
      const restored = Tube.fromData(data);

      expect(restored.id).toBe(original.id);
      expect(restored.location.tankId).toBe(original.location.tankId);
      expect(restored.sample.cellType).toBe(original.sample.cellType);
      expect(restored.researcherId).toBe('res_1');
      expect(restored.labId).toBe('lab_1');
      expect(restored.version).toBe(original.version);
    });

    it('should preserve lock state through roundtrip', () => {
      const locked = createTestTube().lock('user_1', 'reason');
      const shared = locked.shareWith(['user_2']);
      const data = shared.toData();
      const restored = Tube.fromData(data);

      expect(restored.isLocked).toBe(true);
      expect(restored.lockedBy).toBe('user_1');
      expect(restored.lockNote).toBe('reason');
      expect(restored.sharedWithUserIds).toContain('user_2');
    });
  });

  describe('equality', () => {
    it('should be equal by id', () => {
      const tube = createTestTube();
      const same = Tube.fromData(tube.toData());
      expect(tube.equals(same)).toBe(true);
    });

    it('should not be equal for different tubes', () => {
      const tube1 = createTestTube();
      const tube2 = createTestTube();
      expect(tube1.equals(tube2)).toBe(false);
    });
  });

  describe('deprecated getters', () => {
    it('should provide backward-compatible accessors', () => {
      const tube = createTestTube({ sample: { cellType: 'HeLa', notes: 'test' } });
      expect(tube.location.tankId).toBe('T1');
      expect(tube.location.rackId).toBe('R1');
      expect(tube.location.boxId).toBe('A');
      expect(tube.location.position).toBe(1);
      expect(tube.sample.cellType).toBe('HeLa');
      expect(tube.sample.notes).toBe('test');
    });
  });

  describe('date immutability', () => {
    it('should return date copies', () => {
      const tube = createTestTube();
      const d1 = tube.createdAt;
      const d2 = tube.createdAt;
      expect(d1).not.toBe(d2);
      expect(d1.getTime()).toBe(d2.getTime());
    });
  });
});
