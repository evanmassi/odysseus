import { amountUnit, findAmounts, readTypedAmount } from './textAmounts';

const read = (text: string) =>
  findAmounts(text).map(({ text: shown, value, unit, kind }) => [shown, value, unit, kind]);

describe('findAmounts', () => {
  it('reads each amount with its unit and kind, however it is spelled', () => {
    expect(read('Spin 300 rcf, 5 mins at 4C; add 1,500 cells in 10 ug/ml for 2 days.')).toEqual([
      ['300 rcf', 300, '× g', 'g-force'],
      ['5 mins', 5, 'min', 'time'],
      ['4C', 4, '°C', 'temperature'],
      ['1,500 cells', 1500, 'cells', 'cell-count'],
      ['10 ug/ml', 10, 'µg/mL', 'mass-conc'],
      ['2 days', 2, 'd', 'time'],
    ]);
  });

  it('reads named conditions and ratios', () => {
    expect(read('Dilute 1:1000 and leave overnight on ice, or 1 h at RT.')).toEqual([
      ['1:1000', undefined, undefined, undefined],
      ['overnight', undefined, undefined, 'time'],
      ['on ice', undefined, undefined, 'temperature'],
      ['1 h', 1, 'h', 'time'],
      ['RT', undefined, undefined, 'temperature'],
    ]);
  });

  it('reads a bare g as g-force in a spin and grams on a balance', () => {
    expect(read('Spin at 400 g. Weigh 5 g.')).toEqual([
      ['400 g', 400, '× g', 'g-force'],
      ['5 g', 5, 'g', 'mass'],
    ]);
  });

  it('keeps ranges and freezer temperatures whole', () => {
    expect(findAmounts('Rest 5–10 min, store at -80 °C.')).toMatchObject([
      { text: '5–10 min', value: 5, isRange: true },
      { text: '-80 °C', value: -80 },
    ]);
  });

  it('ignores words that only start like a unit or numbers inside names', () => {
    expect(read('Do 3 spins with IL-6 and CD4.')).toEqual([]);
  });
});

describe('readTypedAmount', () => {
  it('splits an amount typed with its unit, and nothing else', () => {
    expect(readTypedAmount('25µg/mL')).toEqual({ value: '25', unit: 'µg/mL' });
    expect(readTypedAmount(' 10 ug/ml ')).toEqual({ value: '10', unit: 'µg/mL' });
    expect(readTypedAmount('25')).toBeUndefined();
    expect(readTypedAmount('Drug X top dose')).toBeUndefined();
  });
});

describe('amountUnit', () => {
  it('turns a typed spelling into the standard unit', () => {
    expect(amountUnit('uL', 100)).toBe('µL');
    expect(amountUnit('xg', 300)).toBe('× g');
    expect(amountUnit('Hours', 2)).toBe('h');
    expect(amountUnit('g', undefined)).toBeUndefined();
  });
});
