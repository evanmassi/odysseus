/**
 * Tube Entity Tests
 *
 * Tests tube creation, location management, sample data, locking, and sharing.
 */

import { Tube } from './Tube';
import { Location } from '@domain/valueObjects/Location';
import { ValidationError } from '@domain/errors/ValidationError';

describe('Tube Entity', () => {
  const validLocation = {
    tankId: 'T1',
    rackId: '1',
    boxId: 'A',
    position: 1,
  };

  const validSample = {
    cellType: 'HeLa',
    donorInternalId: 'DONOR001',
    concentration: 1000000,
    concentrationUnit: 'c/mL' as const,
    date: '2024-01-15',
  };

  describe('create()', () => {
    it('should create a tube with valid location and sample', () => {
      const tube = Tube.create({
        location: validLocation,
        sample: validSample,
        researcherId: 'researcher_123',
      });

      expect(tube.id).toMatch(/^tube_/);
      expect(tube.location.tankId).toBe('T1');
      expect(tube.location.position).toBe(1);
      expect(tube.sample.cellType).toBe('HeLa');
      expect(tube.researcherId).toBe('researcher_123');
      expect(tube.version).toBe(1);
    });

    it('should generate unique IDs for each tube', () => {
      const tube1 = Tube.create({ location: validLocation, sample: validSample });
      const tube2 = Tube.create({ location: validLocation, sample: validSample });

      expect(tube1.id).not.toBe(tube2.id);
    });

    it('should accept existing ID if provided', () => {
      const tube = Tube.create({
        id: 'tube_custom_123',
        location: validLocation,
        sample: validSample,
      });

      expect(tube.id).toBe('tube_custom_123');
    });

    it('should create tube without researcher', () => {
      const tube = Tube.create({
        location: validLocation,
        sample: validSample,
      });

      expect(tube.researcherId).toBeUndefined();
    });

    it('should accept Location value object directly', () => {
      const location = Location.create(validLocation);
      const tube = Tube.create({
        location,
        sample: validSample,
      });

      expect(tube.location.equals(location)).toBe(true);
    });

    it('should store createdByName', () => {
      const tube = Tube.create({
        location: validLocation,
        sample: validSample,
        createdByName: 'Dr. Smith',
      });

      expect(tube.createdByName).toBe('Dr. Smith');
    });

    it('should initialize as unlocked', () => {
      const tube = Tube.create({ location: validLocation, sample: validSample });

      expect(tube.isLocked).toBe(false);
      expect(tube.lockedBy).toBeUndefined();
      expect(tube.sharedWithUserIds).toEqual([]);
    });
  });

  describe('fromData()', () => {
    it('should reconstitute tube from persistence data', () => {
      const now = new Date();
      const data = {
        id: 'tube_123',
        location: validLocation,
        sample: validSample,
        researcherId: 'researcher_456',
        createdByName: 'Dr. Jones',
        timestamps: {
          createdAt: now.toISOString(),
          updatedAt: now.toISOString(),
        },
        version: 3,
      };

      const tube = Tube.fromData(data);

      expect(tube.id).toBe('tube_123');
      expect(tube.researcherId).toBe('researcher_456');
      expect(tube.createdByName).toBe('Dr. Jones');
      expect(tube.version).toBe(3);
    });

    it('should reconstitute locked tube with shared users', () => {
      const now = new Date();
      const data = {
        id: 'tube_123',
        location: validLocation,
        sample: validSample,
        timestamps: {
          createdAt: now.toISOString(),
          updatedAt: now.toISOString(),
        },
        isLocked: true,
        lockedBy: 'user_abc',
        lockNote: 'Under analysis',
        lockedAt: now.toISOString(),
        sharedWithUserIds: ['user_def', 'user_ghi'],
      };

      const tube = Tube.fromData(data);

      expect(tube.isLocked).toBe(true);
      expect(tube.lockedBy).toBe('user_abc');
      expect(tube.lockNote).toBe('Under analysis');
      expect(tube.sharedWithUserIds).toEqual(['user_def', 'user_ghi']);
    });

    it('should handle Date objects for timestamps', () => {
      const now = new Date();
      const data = {
        id: 'tube_123',
        location: validLocation,
        sample: validSample,
        timestamps: {
          createdAt: now,
          updatedAt: now,
        },
      };

      const tube = Tube.fromData(data);

      expect(tube.createdAt.getTime()).toBe(now.getTime());
    });

    it('should default version to 1 if not provided', () => {
      const now = new Date();
      const data = {
        id: 'tube_123',
        location: validLocation,
        sample: validSample,
        timestamps: {
          createdAt: now.toISOString(),
          updatedAt: now.toISOString(),
        },
      };

      const tube = Tube.fromData(data);

      expect(tube.version).toBe(1);
    });
  });

  describe('moveTo()', () => {
    it('should update location when moving to new position', () => {
      const tube = Tube.create({ location: validLocation, sample: validSample });
      const originalUpdatedAt = tube.updatedAt;

      const newLocation = Location.create({
        tankId: 'T2',
        rackId: '2',
        boxId: 'B',
        position: 5,
      });

      // Small delay to ensure timestamp difference
      tube.moveTo(newLocation);

      expect(tube.location.tankId).toBe('T2');
      expect(tube.location.position).toBe(5);
    });

    it('should not update if location is unchanged', () => {
      const tube = Tube.create({ location: validLocation, sample: validSample });
      const originalLocation = tube.location;

      const sameLocation = Location.create(validLocation);
      tube.moveTo(sameLocation);

      expect(tube.location.equals(originalLocation)).toBe(true);
    });
  });

  describe('updateSample()', () => {
    it('should update sample fields', () => {
      const tube = Tube.create({ location: validLocation, sample: validSample });

      tube.updateSample({ cellType: 'iPSC' });

      expect(tube.sample.cellType).toBe('iPSC');
      expect(tube.sample.concentration).toBe(1000000);
    });

    it('should clear field when set to null (PATCH semantics)', () => {
      const tube = Tube.create({ location: validLocation, sample: validSample });

      tube.updateSample({ donorInternalId: null });

      expect(tube.sample.donorInternalId).toBeUndefined();
    });

    it('should preserve field when undefined (PATCH semantics)', () => {
      const tube = Tube.create({ location: validLocation, sample: validSample });

      tube.updateSample({ cellType: 'NewType' });

      expect(tube.sample.donorInternalId).toBe('DONOR001');
    });

    it('should update notes', () => {
      const tube = Tube.create({ location: validLocation, sample: validSample });

      tube.updateSample({ notes: 'Important sample' });

      expect(tube.sample.notes).toBe('Important sample');
    });
  });

  describe('lock() / unlock()', () => {
    it('should lock tube and return new instance', () => {
      const tube = Tube.create({ location: validLocation, sample: validSample });

      const lockedTube = tube.lock('user_123', 'For experiment');

      expect(lockedTube.isLocked).toBe(true);
      expect(lockedTube.lockedBy).toBe('user_123');
      expect(lockedTube.lockNote).toBe('For experiment');
      expect(lockedTube.lockedAt).toBeDefined();
      expect(lockedTube.version).toBe(tube.version + 1);
    });

    it('should throw ValidationError when locking already locked tube', () => {
      const tube = Tube.create({ location: validLocation, sample: validSample });
      const lockedTube = tube.lock('user_123');

      expect(() => lockedTube.lock('user_456')).toThrow(ValidationError);
    });

    it('should unlock tube and return new instance', () => {
      const tube = Tube.create({ location: validLocation, sample: validSample });
      const lockedTube = tube.lock('user_123', 'Testing');

      const unlockedTube = lockedTube.unlock();

      expect(unlockedTube.isLocked).toBe(false);
      expect(unlockedTube.lockedBy).toBeUndefined();
      expect(unlockedTube.lockNote).toBeUndefined();
      expect(unlockedTube.lockedAt).toBeUndefined();
      expect(unlockedTube.sharedWithUserIds).toEqual([]);
    });

    it('should throw ValidationError when unlocking unlocked tube', () => {
      const tube = Tube.create({ location: validLocation, sample: validSample });

      expect(() => tube.unlock()).toThrow(ValidationError);
    });

    it('should preserve ID through lock/unlock cycle', () => {
      const tube = Tube.create({ location: validLocation, sample: validSample });
      const originalId = tube.id;

      const lockedTube = tube.lock('user_123');
      const unlockedTube = lockedTube.unlock();

      expect(unlockedTube.id).toBe(originalId);
    });
  });

  describe('updateLockNote()', () => {
    it('should update lock note on locked tube', () => {
      const tube = Tube.create({ location: validLocation, sample: validSample });
      const lockedTube = tube.lock('user_123', 'Original note');

      const updatedTube = lockedTube.updateLockNote('Updated note');

      expect(updatedTube.lockNote).toBe('Updated note');
      expect(updatedTube.version).toBe(lockedTube.version + 1);
    });

    it('should clear lock note when undefined passed', () => {
      const tube = Tube.create({ location: validLocation, sample: validSample });
      const lockedTube = tube.lock('user_123', 'Some note');

      const updatedTube = lockedTube.updateLockNote(undefined);

      expect(updatedTube.lockNote).toBeUndefined();
    });

    it('should throw ValidationError when updating note on unlocked tube', () => {
      const tube = Tube.create({ location: validLocation, sample: validSample });

      expect(() => tube.updateLockNote('Note')).toThrow(ValidationError);
    });
  });

  describe('shareWith() / revokeAccess()', () => {
    it('should add users to shared list', () => {
      const tube = Tube.create({ location: validLocation, sample: validSample });
      const lockedTube = tube.lock('user_owner');

      const sharedTube = lockedTube.shareWith(['user_a', 'user_b']);

      expect(sharedTube.sharedWithUserIds).toContain('user_a');
      expect(sharedTube.sharedWithUserIds).toContain('user_b');
    });

    it('should deduplicate shared users', () => {
      const tube = Tube.create({ location: validLocation, sample: validSample });
      const lockedTube = tube.lock('user_owner');
      const sharedTube = lockedTube.shareWith(['user_a']);

      const resharedTube = sharedTube.shareWith(['user_a', 'user_b']);

      expect(resharedTube.sharedWithUserIds.filter(id => id === 'user_a').length).toBe(1);
    });

    it('should revoke access from specified users', () => {
      const tube = Tube.create({ location: validLocation, sample: validSample });
      const lockedTube = tube.lock('user_owner');
      const sharedTube = lockedTube.shareWith(['user_a', 'user_b', 'user_c']);

      const revokedTube = sharedTube.revokeAccess(['user_b']);

      expect(revokedTube.sharedWithUserIds).toContain('user_a');
      expect(revokedTube.sharedWithUserIds).toContain('user_c');
      expect(revokedTube.sharedWithUserIds).not.toContain('user_b');
    });

    it('should handle revoking non-existent user gracefully', () => {
      const tube = Tube.create({ location: validLocation, sample: validSample });
      const lockedTube = tube.lock('user_owner');
      const sharedTube = lockedTube.shareWith(['user_a']);

      const revokedTube = sharedTube.revokeAccess(['user_nonexistent']);

      expect(revokedTube.sharedWithUserIds).toEqual(['user_a']);
    });
  });

  describe('canBeAccessedBy()', () => {
    it('should allow access when tube is unlocked', () => {
      const tube = Tube.create({ location: validLocation, sample: validSample });

      expect(tube.canBeAccessedBy('any_user')).toBe(true);
    });

    it('should allow access to lock owner', () => {
      const tube = Tube.create({ location: validLocation, sample: validSample });
      const lockedTube = tube.lock('user_owner');

      expect(lockedTube.canBeAccessedBy('user_owner')).toBe(true);
    });

    it('should allow access to shared user', () => {
      const tube = Tube.create({ location: validLocation, sample: validSample });
      const lockedTube = tube.lock('user_owner');
      const sharedTube = lockedTube.shareWith(['user_shared']);

      expect(sharedTube.canBeAccessedBy('user_shared')).toBe(true);
    });

    it('should deny access to non-owner, non-shared user', () => {
      const tube = Tube.create({ location: validLocation, sample: validSample });
      const lockedTube = tube.lock('user_owner');

      expect(lockedTube.canBeAccessedBy('user_other')).toBe(false);
    });
  });

  describe('isLockedBy()', () => {
    it('should return true for lock owner', () => {
      const tube = Tube.create({ location: validLocation, sample: validSample });
      const lockedTube = tube.lock('user_owner');

      expect(lockedTube.isLockedBy('user_owner')).toBe(true);
    });

    it('should return false for other users', () => {
      const tube = Tube.create({ location: validLocation, sample: validSample });
      const lockedTube = tube.lock('user_owner');

      expect(lockedTube.isLockedBy('user_other')).toBe(false);
    });

    it('should return false for unlocked tube', () => {
      const tube = Tube.create({ location: validLocation, sample: validSample });

      expect(tube.isLockedBy('any_user')).toBe(false);
    });
  });

  describe('update()', () => {
    it('should update location partially', () => {
      const tube = Tube.create({ location: validLocation, sample: validSample });

      const updatedTube = tube.update({
        location: { position: 50 },
      });

      expect(updatedTube.location.position).toBe(50);
      expect(updatedTube.location.tankId).toBe('T1');
    });

    it('should update sample data', () => {
      const tube = Tube.create({ location: validLocation, sample: validSample });

      const updatedTube = tube.update({
        sample: { cellType: 'Neuron' },
      });

      expect(updatedTube.sample.cellType).toBe('Neuron');
    });

    it('should clear researcherId when set to null', () => {
      const tube = Tube.create({
        location: validLocation,
        sample: validSample,
        researcherId: 'researcher_123',
      });

      const updatedTube = tube.update({ researcherId: null });

      expect(updatedTube.researcherId).toBeUndefined();
    });

    it('should preserve researcherId when not in update', () => {
      const tube = Tube.create({
        location: validLocation,
        sample: validSample,
        researcherId: 'researcher_123',
      });

      const updatedTube = tube.update({ sample: { notes: 'New note' } });

      expect(updatedTube.researcherId).toBe('researcher_123');
    });

    it('should increment version on update', () => {
      const tube = Tube.create({ location: validLocation, sample: validSample });
      const originalVersion = tube.version;

      const updatedTube = tube.update({ sample: { notes: 'Test' } });

      expect(updatedTube.version).toBe(originalVersion + 1);
    });

    it('should preserve lock state through update', () => {
      const tube = Tube.create({ location: validLocation, sample: validSample });
      const lockedTube = tube.lock('user_123', 'Testing');
      const sharedTube = lockedTube.shareWith(['user_shared']);

      const updatedTube = sharedTube.update({ sample: { notes: 'Note' } });

      expect(updatedTube.isLocked).toBe(true);
      expect(updatedTube.lockedBy).toBe('user_123');
      expect(updatedTube.sharedWithUserIds).toContain('user_shared');
    });
  });

  describe('Business Queries', () => {
    it('should detect expired tubes (> 2 years old)', () => {
      const threeYearsAgo = new Date();
      threeYearsAgo.setFullYear(threeYearsAgo.getFullYear() - 3);

      const tube = Tube.create({
        location: validLocation,
        sample: {
          ...validSample,
          date: threeYearsAgo.toISOString().split('T')[0],
        },
      });

      expect(tube.isExpired()).toBe(true);
    });

    it('should not mark recent tubes as expired', () => {
      // Use a date within the last 2 years
      const recentDate = new Date();
      recentDate.setMonth(recentDate.getMonth() - 6); // 6 months ago

      const tube = Tube.create({
        location: validLocation,
        sample: {
          ...validSample,
          date: recentDate.toISOString().split('T')[0],
        },
      });

      expect(tube.isExpired()).toBe(false);
    });

    it('should detect complete sample data', () => {
      const tube = Tube.create({
        location: validLocation,
        sample: {
          cellType: 'HeLa',
          donorInternalId: 'DONOR001',
          date: '2024-01-15',
        },
      });

      expect(tube.hasCompleteSampleData()).toBe(true);
    });

    it('should detect incomplete sample data', () => {
      const tube = Tube.create({
        location: validLocation,
        sample: {
          cellType: 'HeLa',
        },
      });

      expect(tube.hasCompleteSampleData()).toBe(false);
    });

    it('should detect concentration data presence', () => {
      const tube = Tube.create({ location: validLocation, sample: validSample });

      expect(tube.hasConcentrationData()).toBe(true);
    });

    it('should detect missing concentration data', () => {
      const tube = Tube.create({
        location: validLocation,
        sample: { cellType: 'HeLa' },
      });

      expect(tube.hasConcentrationData()).toBe(false);
    });
  });

  describe('Location Comparisons', () => {
    it('should detect tubes in same location', () => {
      const tube1 = Tube.create({ location: validLocation, sample: validSample });
      const tube2 = Tube.create({ location: validLocation, sample: validSample });

      expect(tube1.isInSameLocationAs(tube2)).toBe(true);
    });

    it('should detect tubes in different locations', () => {
      const tube1 = Tube.create({ location: validLocation, sample: validSample });
      const tube2 = Tube.create({
        location: { ...validLocation, position: 2 },
        sample: validSample,
      });

      expect(tube1.isInSameLocationAs(tube2)).toBe(false);
    });

    it('should detect tubes in same rack', () => {
      const tube1 = Tube.create({ location: validLocation, sample: validSample });
      const tube2 = Tube.create({
        location: { ...validLocation, boxId: 'B', position: 5 },
        sample: validSample,
      });

      expect(tube1.isInSameRackAs(tube2)).toBe(true);
    });
  });

  describe('toData()', () => {
    it('should convert to persistence format', () => {
      const tube = Tube.create({
        location: validLocation,
        sample: validSample,
        researcherId: 'researcher_123',
        createdByName: 'Dr. Smith',
      });

      const data = tube.toData();

      expect(data.id).toBe(tube.id);
      expect(data.location).toEqual({
        tankId: 'T1',
        rackId: '1',
        boxId: 'A',
        position: 1,
      });
      expect(data.sample.cellType).toBe('HeLa');
      expect(data.researcherId).toBe('researcher_123');
      expect(data.createdByName).toBe('Dr. Smith');
      expect(data.version).toBe(1);
      expect(data.timestamps.createdAt).toBeDefined();
    });

    it('should include lock data when locked', () => {
      const tube = Tube.create({ location: validLocation, sample: validSample });
      const lockedTube = tube.lock('user_123', 'Testing');
      const sharedTube = lockedTube.shareWith(['user_abc']);

      const data = sharedTube.toData();

      expect(data.isLocked).toBe(true);
      expect(data.lockedBy).toBe('user_123');
      expect(data.lockNote).toBe('Testing');
      expect(data.lockedAt).toBeDefined();
      expect(data.sharedWithUserIds).toContain('user_abc');
    });

    it('should omit lock data when unlocked', () => {
      const tube = Tube.create({ location: validLocation, sample: validSample });
      const data = tube.toData();

      expect(data.isLocked).toBeUndefined();
      expect(data.lockedBy).toBeUndefined();
      expect(data.sharedWithUserIds).toBeUndefined();
    });
  });

  describe('Equality and String Representation', () => {
    it('should check equality by ID', () => {
      const tube1 = Tube.create({ location: validLocation, sample: validSample });

      const tube2Reconstituted = Tube.fromData({
        id: tube1.id,
        location: { ...validLocation, position: 50 },
        sample: { cellType: 'Different' },
        timestamps: {
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
      });

      expect(tube1.equals(tube2Reconstituted)).toBe(true);
    });

    it('should return false for equals with null', () => {
      const tube = Tube.create({ location: validLocation, sample: validSample });

      expect(tube.equals(null as unknown as Tube)).toBe(false);
    });

    it('should provide location description', () => {
      const tube = Tube.create({ location: validLocation, sample: validSample });

      expect(tube.getLocationDescription()).toContain('T1');
      expect(tube.getLocationDescription()).toContain('1');
    });

    it('should have consistent toString', () => {
      const tube = Tube.create({ location: validLocation, sample: validSample });

      expect(tube.toString()).toContain(tube.id);
      expect(tube.toString()).toContain('at');
    });
  });

  describe('Immutable Getters', () => {
    it('should return date copies for immutability', () => {
      const tube = Tube.create({ location: validLocation, sample: validSample });
      const createdAt1 = tube.createdAt;
      const createdAt2 = tube.createdAt;

      expect(createdAt1).not.toBe(createdAt2);
      expect(createdAt1.getTime()).toBe(createdAt2.getTime());
    });

    it('should return sharedWithUserIds copy for immutability', () => {
      const tube = Tube.create({ location: validLocation, sample: validSample });
      const lockedTube = tube.lock('user_123');
      const sharedTube = lockedTube.shareWith(['user_a']);

      const ids1 = sharedTube.sharedWithUserIds;
      const ids2 = sharedTube.sharedWithUserIds;

      expect(ids1).not.toBe(ids2);
      expect(ids1).toEqual(ids2);
    });

    it('should return lockedAt copy for immutability', () => {
      const tube = Tube.create({ location: validLocation, sample: validSample });
      const lockedTube = tube.lock('user_123');

      const lockedAt1 = lockedTube.lockedAt;
      const lockedAt2 = lockedTube.lockedAt;

      expect(lockedAt1).not.toBe(lockedAt2);
      expect(lockedAt1!.getTime()).toBe(lockedAt2!.getTime());
    });
  });
});
