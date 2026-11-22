import { calculateBoard, type BoardName } from '../formulas/boardCalculation';

import { CELLS_PER_WELL, EXTRA, MASS_PER_WELL, TOTAL_WELL_VOLUME } from './termList';
import {
  findTerm,
  settledValue,
  termMeaning,
  unitMismatch,
  withPerLabwareKind,
} from './termLookup';

const value = (name: string, unit = ''): BoardName => ({
  kind: 'value',
  id: name,
  name,
  value: '1',
  unit,
});

const namesOf = (...entries: BoardName[]) => calculateBoard(entries).names;

describe('findTerm', () => {
  it('finds a value under its word or any accepted spelling, whatever its capitals', () => {
    for (const spelling of ['Well volume', 'Total well vol.', 'total WELL volume']) {
      const names = namesOf(value(spelling, 'µL'));
      expect(findTerm(names, TOTAL_WELL_VOLUME, [''])?.name).toBe(spelling);
    }
  });

  it('prefers the material’s own value over the whole experiment’s', () => {
    const names = namesOf(value('Overage', '%'), value('Raji extra (dead vol.)', '%'));
    expect(findTerm(names, EXTRA, ['Raji', ''])?.name).toBe('Raji extra (dead vol.)');
    expect(findTerm(names, EXTRA, ['Jurkat', ''])?.name).toBe('Overage');
  });

  it('tells a per-well cell count from a per-well mass by its unit', () => {
    const names = namesOf(value('Raji per well', 'cells'), value('Medium per well', 'µg'));
    expect(findTerm(names, CELLS_PER_WELL, ['Raji'])?.name).toBe('Raji per well');
    expect(findTerm(names, CELLS_PER_WELL, ['Medium'])).toBeUndefined();
    expect(findTerm(names, MASS_PER_WELL, ['Medium'])?.name).toBe('Medium per well');
  });

  it('settles a typed value on the standard word and its usual unit', () => {
    expect(settledValue('Overage', '')).toEqual({ label: 'Extra (dead vol.)', unit: '%' });
    expect(settledValue('per well', 'µg')).toEqual({ label: 'Mass/well', unit: 'µg' });
    expect(settledValue('Per well', '')).toEqual({ label: 'Cells/well', unit: 'cells' });
    expect(settledValue('Extra', 'µL')).toEqual({ label: 'Extra', unit: 'µL' });
    expect(settledValue('Raji count', '')).toEqual({ label: 'Raji count', unit: '' });
    expect(settledValue('Fold', 'X')).toEqual({ label: 'Fold', unit: 'X' });
    expect(settledValue('Count', '')).toEqual({ label: 'Count', unit: '' });
    expect(settledValue('Amount', '')).toEqual({ label: 'Amount', unit: '' });
  });

  it('accepts a value whose unit is blank or not a known unit', () => {
    const names = namesOf(value('Raji cells/well'), value('Extra', 'auto'));
    expect(findTerm(names, CELLS_PER_WELL, ['Raji'])?.name).toBe('Raji cells/well');
    expect(findTerm(names, EXTRA, [''])?.name).toBe('Extra');
  });

  it('shows a per-well number with /well after its unit, or the labware kind on another labware tab', () => {
    expect(withPerLabwareKind('40 µL', 'Raji vol./well')).toBe('40 µL/well');
    expect(withPerLabwareKind('4.00E+4 cells', 'Raji cells/well')).toBe('4.00E+4 cells/well');
    expect(withPerLabwareKind('2 mL', 'Medium vol./tube')).toBe('2 mL/tube');
    expect(withPerLabwareKind('20 µL', 'Drug X volume added')).toBe('20 µL/well');
    expect(withPerLabwareKind('50 µL', 'Surface cocktail vol./well')).toBe('50 µL/well');
    expect(withPerLabwareKind('1.2 mL', 'Raji total needed')).toBe('1.2 mL');
    expect(withPerLabwareKind('?', 'Raji vol./well')).toBe('?');
  });

  it('gives a word its meaning under any spelling, another labware kind included', () => {
    expect(termMeaning('Vol./well')).toBe('Volume of it added to each well');
    expect(termMeaning('Volume added')).toBe('Volume of it added to each well');
    expect(termMeaning('Vol./tube')).toBe('Volume of it added to each well');
    expect(termMeaning('Round to')).toBe('Volumes round up to this, to match your pipette');
    expect(termMeaning('Seeding count')).toBeUndefined();
  });

  it('says when a value carries a unit its word cannot use', () => {
    expect(unitMismatch('Extra (dead vol.)', 'µL')).toBe(
      "Extra (dead vol.) should be a %, so the math isn't using it"
    );
    expect(unitMismatch('Extra (dead vol.)', '%')).toBeUndefined();
    expect(unitMismatch('Per well', 'µg')).toBeUndefined();
    expect(unitMismatch('Seeding count', 'µL')).toBeUndefined();
  });
});
