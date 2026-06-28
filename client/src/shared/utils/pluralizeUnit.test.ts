/**
 * Pluralize Unit Tests
 *
 * Covers count handling, uncountable/irregular units, already-plural inputs, and the suffix rules.
 */
import { describe, it, expect } from 'vitest';

import { pluralizeUnit } from './pluralizeUnit';

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
