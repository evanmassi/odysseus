import {
  DILUTION_FACTOR_NOTATION,
  displayValue,
  formatQuantityIn,
  formatNumber,
  quantityOf,
  workingValue,
} from './quantities';

describe('number display', () => {
  it('writes large and tiny numbers in scientific notation', () => {
    expect(formatNumber(40000)).toBe('4.00E+4');
    expect(formatNumber(1490000)).toBe('1.49E+6');
    expect(formatNumber(0.0000565)).toBe('5.65E-5');
    expect(formatNumber(9999)).toBe('9999');
    expect(formatNumber(99999)).toBe('1.00E+5');
  });

  it('shows typed plain numbers the same way, and leaves anything else as typed', () => {
    expect(displayValue('40000', 'cells')).toBe('4.00E+4 cells');
    expect(displayValue('1.2M', 'cells/mL')).toBe('1.2M cells/mL');
    expect(displayValue('10000', '1:N')).toBe('1:10000');
  });

  it('shows a series dilution as 1:N but works with N in formulas', () => {
    expect(displayValue('3', DILUTION_FACTOR_NOTATION)).toBe('1:3');
    expect(workingValue('3', DILUTION_FACTOR_NOTATION)).toBe('3');
    expect(quantityOf('3', DILUTION_FACTOR_NOTATION)?.magnitude).toBe(3);
  });

  it('keeps ratios as plain numbers', () => {
    const quantity = quantityOf('10000', '1:N');
    expect(quantity && formatQuantityIn(quantity, '1:N')).toEqual({ text: '1:10000' });
  });
});
