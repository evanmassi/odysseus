import { calculateBoard, type BoardName } from '../formulas/boardCalculation';

import { scaledAmount, wellShareOf } from './mixShares';

const added = [{ columnKey: 'volume per well', value: '20', unit: 'µL' }];

describe('mix shares', () => {
  it('reads the share of the well from the row and a Well volume value or formula', () => {
    const asValue: BoardName[] = [
      { kind: 'value', id: 'w', name: 'Well volume', value: '80', unit: 'µL' },
    ];
    expect(wellShareOf(added, calculateBoard(asValue))).toMatchObject({ share: 0.25 });
    const asFormula: BoardName[] = [
      { kind: 'value', id: 'a', name: 'Cells volume', value: '60', unit: 'µL' },
      { kind: 'formula', id: 'f', name: 'Well volume', expr: 'Cells volume + 20 µL', unit: 'µL' },
    ];
    expect(wellShareOf(added, calculateBoard(asFormula))).toMatchObject({ share: 0.25 });
  });

  it('also reads the well total from "Final well volume" or "Total well volume"', () => {
    const named: BoardName[] = [
      { kind: 'value', id: 'w', name: 'Final well volume', value: '80', unit: 'µL' },
    ];
    expect(wellShareOf(added, calculateBoard(named))).toEqual({
      share: 0.25,
      working: '× 20 µL ÷ 80 µL (Final well volume)',
    });
  });

  it('says what is missing', () => {
    expect(wellShareOf([], calculateBoard([]))).toEqual({
      missing: 'Needs a Volume per well on this row',
    });
    expect(wellShareOf(added, calculateBoard([]))).toEqual({
      missing: 'Needs the well total: add "Well volume 80 µL" under Whole experiment',
    });
  });

  it('scales an amount, keeping fold strengths and readable units', () => {
    expect(scaledAmount('4', 'X', 0.25)).toBe('1×');
    expect(scaledAmount('20', 'µg/mL', 0.25)).toBe('5 µg/mL');
    expect(scaledAmount('2', 'µg/mL', 0.25)).toBe('500 ng/mL');
  });
});
