/**
 * Donor Entity Tests
 */

import { Donor } from './Donor';

describe('Donor', () => {
  describe('create', () => {
    it('should create with generated id and isCurated false by default', () => {
      const donor = Donor.create({
        labId: 'lab_123',
        donorSourceId: 'DS-001',
      });
      expect(donor.id).toMatch(/^donor_/);
      expect(donor.labId).toBe('lab_123');
      expect(donor.donorSourceId).toBe('DS-001');
      expect(donor.isCurated).toBe(false);
    });

    it('should allow isCurated to be set on creation', () => {
      const donor = Donor.create({
        labId: 'lab_123',
        donorSourceId: 'DS-001',
        isCurated: true,
      });
      expect(donor.isCurated).toBe(true);
    });

    it('should accept all optional fields', () => {
      const donor = Donor.create({
        labId: 'lab_123',
        donorSourceId: 'DS-001',
        donorInternalId: 'INT-001',
        species: 'Human',
        age: '45',
        sex: 'Male',
        ethnicity: 'Caucasian',
        clinicalStatus: 'Diseased',
        diagnosis: 'AML',
        diseaseStage: 'Stage III',
        notes: 'Enrolled in trial',
      });
      expect(donor.species).toBe('Human');
      expect(donor.age).toBe('45');
      expect(donor.sex).toBe('Male');
      expect(donor.ethnicity).toBe('Caucasian');
      expect(donor.clinicalStatus).toBe('Diseased');
      expect(donor.diagnosis).toBe('AML');
      expect(donor.diseaseStage).toBe('Stage III');
      expect(donor.notes).toBe('Enrolled in trial');
    });

    it('should create with only internal ID', () => {
      const donor = Donor.create({
        labId: 'lab_123',
        donorInternalId: 'INT-001',
      });
      expect(donor.donorInternalId).toBe('INT-001');
      expect(donor.donorSourceId).toBeUndefined();
    });

    it('should throw when neither source nor internal ID provided', () => {
      expect(() => Donor.create({ labId: 'lab_123' })).toThrow(
        'At least one donor ID (source or internal) is required'
      );
    });
  });

  describe('fromData', () => {
    it('should reconstruct from persisted data', () => {
      const donor = Donor.fromData({
        id: 'donor_test',
        labId: 'lab_123',
        donorSourceId: 'DS-001',
        donorInternalId: 'INT-001',
        species: 'Human',
        isCurated: true,
        createdAt: '2024-06-15T00:00:00.000Z',
        updatedAt: '2024-06-20T00:00:00.000Z',
      });
      expect(donor.id).toBe('donor_test');
      expect(donor.donorSourceId).toBe('DS-001');
      expect(donor.species).toBe('Human');
      expect(donor.isCurated).toBe(true);
      expect(donor.createdAt.toISOString()).toBe('2024-06-15T00:00:00.000Z');
      expect(donor.updatedAt.toISOString()).toBe('2024-06-20T00:00:00.000Z');
    });

    it('should handle Date objects for timestamps', () => {
      const now = new Date();
      const donor = Donor.fromData({
        id: 'donor_test',
        labId: 'lab_123',
        donorSourceId: 'DS-001',
        isCurated: false,
        createdAt: now,
        updatedAt: now,
      });
      expect(donor.createdAt.getTime()).toBe(now.getTime());
    });

    it('should map undefined for missing optional fields', () => {
      const donor = Donor.fromData({
        id: 'donor_test',
        labId: 'lab_123',
        donorSourceId: 'DS-001',
        isCurated: false,
        createdAt: new Date(),
        updatedAt: new Date(),
      });
      expect(donor.donorInternalId).toBeUndefined();
      expect(donor.species).toBeUndefined();
      expect(donor.age).toBeUndefined();
      expect(donor.notes).toBeUndefined();
    });
  });

  describe('update', () => {
    it('should update provided fields and set isCurated to true', () => {
      const donor = Donor.create({
        labId: 'lab_123',
        donorSourceId: 'DS-001',
      });
      expect(donor.isCurated).toBe(false);

      donor.update({ species: 'Human', age: '30' });

      expect(donor.species).toBe('Human');
      expect(donor.age).toBe('30');
      expect(donor.isCurated).toBe(true);
    });

    it('should update timestamp on update', () => {
      const donor = Donor.create({
        labId: 'lab_123',
        donorSourceId: 'DS-001',
      });
      const originalUpdatedAt = donor.updatedAt.getTime();

      // Small delay to ensure timestamp difference
      donor.update({ species: 'Mouse' });

      expect(donor.updatedAt.getTime()).toBeGreaterThanOrEqual(originalUpdatedAt);
    });

    it('should clear field when null is passed (tri-state: null = clear)', () => {
      const donor = Donor.create({
        labId: 'lab_123',
        donorSourceId: 'DS-001',
        species: 'Human',
      });
      expect(donor.species).toBe('Human');

      donor.update({ species: null });

      expect(donor.species).toBeUndefined();
    });

    it('should preserve field when undefined is passed (tri-state: undefined = no change)', () => {
      const donor = Donor.create({
        labId: 'lab_123',
        donorSourceId: 'DS-001',
        species: 'Human',
      });

      donor.update({ age: '45' });

      expect(donor.species).toBe('Human');
      expect(donor.age).toBe('45');
    });

    it('should throw if update would clear both IDs', () => {
      const donor = Donor.create({
        labId: 'lab_123',
        donorSourceId: 'DS-001',
        donorInternalId: 'INT-001',
      });

      expect(() =>
        donor.update({
          donorSourceId: null,
          donorInternalId: null,
        })
      ).toThrow('At least one donor ID (source or internal) is required');
    });

    it('should allow clearing one ID if the other remains', () => {
      const donor = Donor.create({
        labId: 'lab_123',
        donorSourceId: 'DS-001',
        donorInternalId: 'INT-001',
      });

      donor.update({ donorSourceId: null });

      expect(donor.donorSourceId).toBeUndefined();
      expect(donor.donorInternalId).toBe('INT-001');
    });
  });

  describe('date immutability', () => {
    it('should return copies of createdAt', () => {
      const donor = Donor.create({
        labId: 'lab_123',
        donorSourceId: 'DS-001',
      });
      const date1 = donor.createdAt;
      const date2 = donor.createdAt;
      expect(date1).not.toBe(date2);
      expect(date1.getTime()).toBe(date2.getTime());
    });

    it('should return copies of updatedAt', () => {
      const donor = Donor.create({
        labId: 'lab_123',
        donorSourceId: 'DS-001',
      });
      const date1 = donor.updatedAt;
      const date2 = donor.updatedAt;
      expect(date1).not.toBe(date2);
      expect(date1.getTime()).toBe(date2.getTime());
    });
  });
});
