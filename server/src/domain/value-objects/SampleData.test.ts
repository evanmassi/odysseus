/**
 * Sample Data Value Object Tests
 */

import { SampleData } from './SampleData';

describe('SampleData', () => {
  describe('create', () => {
    it('should create with all fields', () => {
      const sample = SampleData.create({
        cellType: 'HeLa',
        species: 'Human',
        concentration: 100,
        concentrationUnit: 'c/mL',
        date: '2024-01-15',
        passageNumber: 5,
      });
      expect(sample.cellType).toBe('HeLa');
      expect(sample.species).toBe('Human');
      expect(sample.concentration).toBe(100);
      expect(sample.concentrationUnit).toBe('c/mL');
      expect(sample.passageNumber).toBe(5);
    });

    it('should create empty sample', () => {
      const sample = SampleData.empty();
      expect(sample.cellType).toBeUndefined();
      expect(sample.concentration).toBeUndefined();
    });

    it('should create with minimal fields', () => {
      const sample = SampleData.create({});
      expect(sample.cellType).toBeUndefined();
    });
  });

  describe('concentration validation', () => {
    it('should reject concentration without unit', () => {
      expect(() => SampleData.create({ concentration: 10 }))
        .toThrow('Concentration requires a unit');
    });

    it('should reject unit without concentration', () => {
      expect(() => SampleData.create({ concentrationUnit: 'c/mL' }))
        .toThrow('Concentration unit requires a concentration value');
    });

    it('should reject negative concentration', () => {
      expect(() => SampleData.create({ concentration: -1, concentrationUnit: 'c/mL' }))
        .toThrow('must be greater than 0');
    });

    it('should reject zero concentration', () => {
      expect(() => SampleData.create({ concentration: 0, concentrationUnit: 'c/mL' }))
        .toThrow('must be greater than 0');
    });

    it('should reject concentration exceeding limit', () => {
      expect(() => SampleData.create({ concentration: 1e13, concentrationUnit: 'c/mL' }))
        .toThrow('exceeds reasonable limits');
    });

    it('should accept valid concentration with unit', () => {
      const sample = SampleData.create({ concentration: 500, concentrationUnit: 'c/v' });
      expect(sample.concentration).toBe(500);
      expect(sample.concentrationUnit).toBe('c/v');
    });
  });

  describe('date validation', () => {
    it('should reject invalid date format', () => {
      expect(() => SampleData.create({ date: 'not-a-date' }))
        .toThrow('valid date format');
    });

    it('should reject future date', () => {
      const future = new Date();
      future.setFullYear(future.getFullYear() + 1);
      expect(() => SampleData.create({ date: future.toISOString() }))
        .toThrow('cannot be in the future');
    });

    it('should accept past date', () => {
      const sample = SampleData.create({ date: '2020-06-15' });
      expect(sample.date).toBe('2020-06-15');
    });
  });

  describe('cell type validation', () => {
    it('should reject empty cell type', () => {
      expect(() => SampleData.create({ cellType: '' })).toThrow('cannot be empty');
    });

    it('should reject whitespace-only cell type', () => {
      expect(() => SampleData.create({ cellType: '   ' })).toThrow('cannot be empty');
    });

    it('should reject cell type exceeding 200 characters', () => {
      expect(() => SampleData.create({ cellType: 'X'.repeat(201) }))
        .toThrow('cannot exceed 200');
    });
  });

  describe('donor ID validation', () => {
    it('should reject empty donor internal ID', () => {
      expect(() => SampleData.create({ donorInternalId: '' })).toThrow('cannot be empty');
    });

    it('should reject donor internal ID exceeding 100 characters', () => {
      expect(() => SampleData.create({ donorInternalId: 'D'.repeat(101) }))
        .toThrow('cannot exceed 100');
    });

    it('should reject empty donor source ID', () => {
      expect(() => SampleData.create({ donorSourceId: '' })).toThrow('cannot be empty');
    });
  });

  describe('passage number validation', () => {
    it('should accept passage number 0', () => {
      const sample = SampleData.create({ passageNumber: 0 });
      expect(sample.passageNumber).toBe(0);
    });

    it('should accept passage number 999', () => {
      const sample = SampleData.create({ passageNumber: 999 });
      expect(sample.passageNumber).toBe(999);
    });

    it('should reject negative passage number', () => {
      expect(() => SampleData.create({ passageNumber: -1 }))
        .toThrow('integer between 0 and 999');
    });

    it('should reject passage number exceeding 999', () => {
      expect(() => SampleData.create({ passageNumber: 1000 }))
        .toThrow('integer between 0 and 999');
    });

    it('should reject non-integer passage number', () => {
      expect(() => SampleData.create({ passageNumber: 1.5 }))
        .toThrow('integer between 0 and 999');
    });
  });

  describe('string field validation', () => {
    it('should reject empty species', () => {
      expect(() => SampleData.create({ species: '' })).toThrow('cannot be empty');
    });

    it('should reject notes exceeding 1000 characters', () => {
      expect(() => SampleData.create({ notes: 'N'.repeat(1001) }))
        .toThrow('cannot exceed 1000');
    });

    it('should reject empty lot number', () => {
      expect(() => SampleData.create({ lotNumber: '  ' })).toThrow('cannot be empty');
    });
  });

  describe('update (PATCH tri-state)', () => {
    const base = SampleData.create({
      cellType: 'HeLa',
      species: 'Human',
      concentration: 100,
      concentrationUnit: 'c/mL',
      notes: 'Original',
    });

    it('should preserve fields when omitted (undefined)', () => {
      const updated = base.update({ cellType: 'Jurkat' });
      expect(updated.cellType).toBe('Jurkat');
      expect(updated.species).toBe('Human');
      expect(updated.notes).toBe('Original');
    });

    it('should set field when value provided', () => {
      const updated = base.update({ species: 'Mouse' });
      expect(updated.species).toBe('Mouse');
    });

    it('should clear field when null provided', () => {
      const updated = base.update({ species: null });
      expect(updated.species).toBeUndefined();
    });

    it('should clear both concentration and unit when concentration is null', () => {
      const updated = base.update({ concentration: null });
      expect(updated.concentration).toBeUndefined();
      expect(updated.concentrationUnit).toBeUndefined();
    });

    it('should clear both concentration and unit when unit is null', () => {
      const updated = base.update({ concentrationUnit: null });
      expect(updated.concentration).toBeUndefined();
      expect(updated.concentrationUnit).toBeUndefined();
    });

    it('should return a new instance (immutability)', () => {
      const updated = base.update({ cellType: 'Jurkat' });
      expect(base.cellType).toBe('HeLa');
      expect(updated.cellType).toBe('Jurkat');
    });
  });

  describe('hasConcentration', () => {
    it('should return true when both concentration and unit are set', () => {
      const sample = SampleData.create({ concentration: 10, concentrationUnit: 'c/mL' });
      expect(sample.hasConcentration()).toBe(true);
    });

    it('should return false for empty sample', () => {
      expect(SampleData.empty().hasConcentration()).toBe(false);
    });
  });

  describe('isExpired', () => {
    it('should return false when no date', () => {
      expect(SampleData.empty().isExpired()).toBe(false);
    });

    it('should return true for sample older than 2 years', () => {
      const oldDate = new Date();
      oldDate.setFullYear(oldDate.getFullYear() - 3);
      const sample = SampleData.create({ date: oldDate.toISOString() });
      expect(sample.isExpired()).toBe(true);
    });

    it('should return false for recent sample', () => {
      const recent = new Date();
      recent.setMonth(recent.getMonth() - 6);
      const sample = SampleData.create({ date: recent.toISOString() });
      expect(sample.isExpired()).toBe(false);
    });
  });

  describe('isComplete', () => {
    it('should return true when cellType, donorInternalId, and date are set', () => {
      const sample = SampleData.create({
        cellType: 'HeLa',
        donorInternalId: 'D001',
        date: '2024-01-01',
      });
      expect(sample.isComplete()).toBe(true);
    });

    it('should return false when missing required fields', () => {
      const sample = SampleData.create({ cellType: 'HeLa' });
      expect(sample.isComplete()).toBe(false);
    });
  });

  describe('serialization', () => {
    it('should roundtrip through toData', () => {
      const data = {
        cellType: 'HeLa',
        species: 'Human',
        concentration: 50,
        concentrationUnit: 'c/v' as const,
        passageNumber: 3,
      };
      const sample = SampleData.create(data);
      const restored = SampleData.create(sample.toData());
      expect(restored.toData()).toEqual(sample.toData());
    });

    it('should omit undefined fields in toData', () => {
      const sample = SampleData.create({ cellType: 'HeLa' });
      const data = sample.toData();
      expect(data.cellType).toBe('HeLa');
      expect(data.species).toBeUndefined();
      expect(data.concentration).toBeUndefined();
    });
  });
});
