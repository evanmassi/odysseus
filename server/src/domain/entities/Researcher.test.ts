/**
 * Researcher Entity Tests
 */

import { Researcher } from './Researcher';

describe('Researcher', () => {
  describe('create', () => {
    it('should create with generated id, active, and admin source by default', () => {
      const researcher = Researcher.create('person_123');
      expect(researcher.id).toMatch(/^researcher_/);
      expect(researcher.personId).toBe('person_123');
      expect(researcher.active).toBe(true);
      expect(researcher.source).toBe('admin');
    });

    it('should record a registration source', () => {
      const researcher = Researcher.create('person_123', { source: 'registration' });
      expect(researcher.source).toBe('registration');
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
        labId: 'lab_456',
      });
      const data = original.toData();
      const restored = Researcher.fromData(data);

      expect(restored.id).toBe(original.id);
      expect(restored.personId).toBe('person_123');
      expect(restored.active).toBe(true);
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
