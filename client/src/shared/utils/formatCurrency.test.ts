/**
 * Currency Formatter Tests
 *
 * Covers undefined passthrough and USD formatting (separators, negatives, decimals).
 */
import { describe, it, expect } from 'vitest';

import { formatCurrency } from './formatCurrency';

describe('formatCurrency', () => {
  it('returns undefined for undefined input', () => {
    expect(formatCurrency(undefined)).toBeUndefined();
  });

  it('formats whole and fractional amounts with two decimals', () => {
    expect(formatCurrency(0)).toBe('$0.00');
    expect(formatCurrency(5)).toBe('$5.00');
    expect(formatCurrency(5.5)).toBe('$5.50');
  });

  it('adds thousands separators', () => {
    expect(formatCurrency(1234.5)).toBe('$1,234.50');
    expect(formatCurrency(1000000)).toBe('$1,000,000.00');
  });

  it('places the sign before the symbol for negative amounts', () => {
    expect(formatCurrency(-5)).toBe('-$5.00');
    expect(formatCurrency(-1234.5)).toBe('-$1,234.50');
  });
});
