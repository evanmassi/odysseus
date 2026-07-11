/**
 * Researcher Entity Tests
 */

import { Researcher } from './Researcher';

describe('Researcher', () => {
  describe('create', () => {
    it('should create with generated id, active, and approved by default', () => {
      const researcher = Researcher.create('person_123');
      expect(researcher.id).toMatch(/^researcher_/);
      expect(researcher.personId).toBe('person_123');
      expect(researcher.active).toBe(true);
      expect(researcher.approvalStatus).toBe('approved');
      expect(researcher.source).toBe('admin');
    });

    it('should approve admin-created researchers regardless of user approval', () => {
      const researcher = Researcher.create('person_123', {
        source: 'admin',
        isUserApproved: false,
      });
      expect(researcher.approvalStatus).toBe('approved');
    });

    it('should set registration-created researchers to pending when user not approved', () => {
      const researcher = Researcher.create('person_123', {
        source: 'registration',
        isUserApproved: false,
      });
      expect(researcher.approvalStatus).toBe('pending');
    });

    it('should approve registration-created researchers when user is approved', () => {
      const researcher = Researcher.create('person_123', {
        source: 'registration',
        isUserApproved: true,
      });
      expect(researcher.approvalStatus).toBe('approved');
    });

    it('should accept optional labId', () => {
      const researcher = Researcher.create('person_123', { labId: 'lab_456' });
      expect(researcher.labId).toBe('lab_456');
    });

    it('should throw for empty personId', () => {
      expect(() => Researcher.create('')).toThrow('Person ID is required');
    });

    it('should throw for whitespace-only personId', () => {
      expect(() => Researcher.create('   ')).toThrow('Person ID is required');
    });
  });

  describe('active status', () => {
    it('should activate', () => {
      const researcher = Researcher.create('person_123');
      researcher.deactivate();
      expect(researcher.active).toBe(false);
      researcher.activate();
      expect(researcher.active).toBe(true);
    });

    it('should deactivate', () => {
      const researcher = Researcher.create('person_123');
      researcher.deactivate();
      expect(researcher.active).toBe(false);
    });
  });

  describe('fromData / toData roundtrip', () => {
    it('should preserve all fields through roundtrip', () => {
      const original = Researcher.create('person_123', {
        source: 'registration',
        isUserApproved: true,
        labId: 'lab_456',
      });
      const data = original.toData();
      const restored = Researcher.fromData(data);

      expect(restored.id).toBe(original.id);
      expect(restored.personId).toBe('person_123');
      expect(restored.active).toBe(true);
      expect(restored.approvalStatus).toBe('approved');
      expect(restored.source).toBe('registration');
      expect(restored.labId).toBe('lab_456');
    });

    it('should handle string dates from persistence', () => {
      const restored = Researcher.fromData({
        id: 'researcher_test',
        personId: 'person_123',
        active: true,
        createdAt: '2024-01-01T00:00:00.000Z',
      });
      expect(restored.createdAt.toISOString()).toBe('2024-01-01T00:00:00.000Z');
    });

    it('should default approvalStatus to approved when missing', () => {
      const restored = Researcher.fromData({
        id: 'researcher_test',
        personId: 'person_123',
        active: true,
        createdAt: new Date(),
      });
      expect(restored.approvalStatus).toBe('approved');
    });

    it('should default source to admin when missing', () => {
      const restored = Researcher.fromData({
        id: 'researcher_test',
        personId: 'person_123',
        active: true,
        createdAt: new Date(),
      });
      expect(restored.source).toBe('admin');
    });

    it('should handle undefined labId', () => {
      const original = Researcher.create('person_123');
      const data = original.toData();
      const restored = Researcher.fromData(data);
      expect(restored.labId).toBeUndefined();
    });
  });

  describe('date immutability', () => {
    it('should return copies of createdAt', () => {
      const researcher = Researcher.create('person_123');
      const date1 = researcher.createdAt;
      const date2 = researcher.createdAt;
      expect(date1).not.toBe(date2);
      expect(date1.getTime()).toBe(date2.getTime());
    });
  });
});
