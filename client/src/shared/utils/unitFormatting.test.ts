/**
 * Unit Formatting Tests
 *
 * The pluralizer's count handling, uncountable/irregular units, already-plural inputs and suffix
 * rules, plus the registry rule that decides when a quantity's unit pluralizes at all. Both live
 * in shared-schemas; the tests stay here because that package has no test runner.
 */
import { formatQuantity, pluralizeUnit } from '@odysseus/shared-schemas';
import { describe, it, expect } from 'vitest';

describe('pluralizeUnit', () => {
  it('returns the singular for a count of 1', () => {
    expect(pluralizeUnit('box', 1)).toBe('box');
  });

  it('pluralizes for counts other than 1 (including zero)', () => {
    expect(pluralizeUnit('box', 0)).toBe('boxes');
    expect(pluralizeUnit('box', 2)).toBe('boxes');
  });

  it('leaves uncountable units unchanged', () => {
    expect(pluralizeUnit('ml', 2)).toBe('ml');
    expect(pluralizeUnit('each', 5)).toBe('each');
  });

  it('handles irregular plurals', () => {
    expect(pluralizeUnit('mouse', 2)).toBe('mice');
    expect(pluralizeUnit('person', 3)).toBe('people');
  });

  it('does not double-pluralize already-plural inputs', () => {
    expect(pluralizeUnit('cells', 2)).toBe('cells');
    expect(pluralizeUnit('boxes', 2)).toBe('boxes');
  });

  it('applies the suffix rules', () => {
    expect(pluralizeUnit('half', 2)).toBe('halves'); // consonant + f → ves
    expect(pluralizeUnit('shelf', 2)).toBe('shelves');
    expect(pluralizeUnit('dish', 2)).toBe('dishes'); // sibilant → es
    expect(pluralizeUnit('city', 2)).toBe('cities'); // consonant + y → ies
    expect(pluralizeUnit('vial', 2)).toBe('vials'); // default → s
  });

  it('uses -s (not -oes) for consonant-o units', () => {
    expect(pluralizeUnit('kilo', 2)).toBe('kilos');
    expect(pluralizeUnit('photo', 2)).toBe('photos');
  });

  it('preserves casing', () => {
    expect(pluralizeUnit('BOX', 2)).toBe('BOXES');
    expect(pluralizeUnit('Box', 2)).toBe('Boxes');
  });

  it('returns blank or whitespace input unchanged', () => {
    expect(pluralizeUnit('', 2)).toBe('');
    expect(pluralizeUnit('   ', 2)).toBe('   ');
  });
});

describe('formatQuantity', () => {
  it('pluralizes countable units', () => {
    expect(formatQuantity(5, 'vial')).toBe('5 vials');
    expect(formatQuantity(2, 'box')).toBe('2 boxes');
    expect(formatQuantity(1, 'vial')).toBe('1 vial');
    expect(formatQuantity(0, 'tube')).toBe('0 tubes');
  });

  it('leaves dimensional units alone — a measure is not a count', () => {
    expect(formatQuantity(5, 'mL')).toBe('5 mL');
    expect(formatQuantity(500, 'g')).toBe('500 g');
    expect(formatQuantity(1.5, 'mM')).toBe('1.5 mM');
  });

  it('leaves an unknown unit unchanged, since its dimension is unknown', () => {
    expect(formatQuantity(5, 'beads/50 µL')).toBe('5 beads/50 µL');
  });
});
