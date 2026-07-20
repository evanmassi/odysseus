/**
 * Lookup Value Entity Tests
 */

import { LookupValue } from './LookupValue';

describe('LookupValue', () => {
  describe('create', () => {
    it('should create with generated id and defaults', () => {
      const lv = LookupValue.create({ category: 'species', value: 'Mouse' });
      expect(lv.id).toMatch(/^lkp_/);
      expect(lv.category).toBe('species');
      expect(lv.value).toBe('Mouse');
      expect(lv.sortOrder).toBe(0);
      expect(lv.isActive).toBe(true);
    });

    it('should trim whitespace from value', () => {
      const lv = LookupValue.create({ category: 'source', value: '  Brain  ' });
      expect(lv.value).toBe('Brain');
    });

    it('should accept optional sortOrder', () => {
      const lv = LookupValue.create({ category: 'media', value: 'DMEM', sortOrder: 5 });
      expect(lv.sortOrder).toBe(5);
    });

    it('should accept optional labId', () => {
      const lv = LookupValue.create({ category: 'species', value: 'Rat', labId: 'lab_123' });
      expect(lv.labId).toBe('lab_123');
    });

    it('should throw for empty value', () => {
      expect(() => LookupValue.create({ category: 'species', value: '' })).toThrow(
        'Lookup value cannot be empty'
      );
    });

    it('should throw for whitespace-only value', () => {
      expect(() => LookupValue.create({ category: 'species', value: '   ' })).toThrow(
        'Lookup value cannot be empty'
      );
    });

    it('should throw for value exceeding 200 characters', () => {
      expect(() => LookupValue.create({ category: 'species', value: 'x'.repeat(201) })).toThrow(
        'Lookup value cannot exceed 200 characters'
      );
    });

    it('should throw for invalid category', () => {
      expect(() => LookupValue.create({ category: 'invalid' as any, value: 'Test' })).toThrow(
        'Invalid lookup category'
      );
    });
  });

  describe('rename', () => {
    it('should update value', () => {
      const lv = LookupValue.create({ category: 'species', value: 'Mouse' });
      lv.rename('Rat');
      expect(lv.value).toBe('Rat');
    });

    it('should trim whitespace', () => {
      const lv = LookupValue.create({ category: 'species', value: 'Mouse' });
      lv.rename('  Rat  ');
      expect(lv.value).toBe('Rat');
    });

    it('should throw for empty value', () => {
      const lv = LookupValue.create({ category: 'species', value: 'Mouse' });
      expect(() => lv.rename('')).toThrow('Lookup value cannot be empty');
    });

    it('should throw for value exceeding 200 characters', () => {
      const lv = LookupValue.create({ category: 'species', value: 'Mouse' });
      expect(() => lv.rename('x'.repeat(201))).toThrow('Lookup value cannot exceed 200 characters');
    });

    it('should update updatedAt', () => {
      const lv = LookupValue.create({ category: 'species', value: 'Mouse' });
      const before = lv.updatedAt;
      lv.rename('Rat');
      expect(lv.updatedAt.getTime()).toBeGreaterThanOrEqual(before.getTime());
    });
  });

  describe('fromData / toData roundtrip', () => {
    it('should preserve all fields through roundtrip', () => {
      const original = LookupValue.create({
        category: 'source',
        value: 'Brain',
        sortOrder: 3,
        labId: 'lab_1',
      });
      const data = original.toData();
      const restored = LookupValue.fromData(data);

      expect(restored.id).toBe(original.id);
      expect(restored.category).toBe('source');
      expect(restored.value).toBe('Brain');
      expect(restored.sortOrder).toBe(3);
      expect(restored.isActive).toBe(true);
      expect(restored.labId).toBe('lab_1');
    });

    it('should handle undefined labId', () => {
      const original = LookupValue.create({ category: 'species', value: 'Mouse' });
      const data = original.toData();
      const restored = LookupValue.fromData(data);
      expect(restored.labId).toBeUndefined();
    });
  });

  describe('date immutability', () => {
    it('should return copies of dates to prevent mutation', () => {
      const lv = LookupValue.create({ category: 'species', value: 'Mouse' });
      const date1 = lv.createdAt;
      const date2 = lv.createdAt;
      expect(date1).not.toBe(date2);
      expect(date1.getTime()).toBe(date2.getTime());
    });
  });
});
