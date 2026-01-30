/**
 * Concentration Converter Tests
 *
 * Tests scientific notation parsing for concentration values.
 */

import { describe, it, expect } from 'vitest';

import { normalizeConcentration } from './concentrationConverter';

describe('concentrationConverter', () => {
  describe('normalizeConcentration()', () => {
    describe('undefined/null/empty handling', () => {
      it('should return undefined for undefined input', () => {
        expect(normalizeConcentration(undefined)).toBeUndefined();
      });

      it('should return undefined for null input', () => {
        expect(normalizeConcentration(null as unknown as string)).toBeUndefined();
      });

      it('should return undefined for empty string', () => {
        expect(normalizeConcentration('')).toBeUndefined();
      });

      it('should return undefined for whitespace-only string', () => {
        expect(normalizeConcentration('   ')).toBeUndefined();
      });
    });

    describe('zero handling', () => {
      it('should return 0 for numeric zero', () => {
        expect(normalizeConcentration(0)).toBe(0);
      });

      it('should return 0 for string zero', () => {
        expect(normalizeConcentration('0')).toBe(0);
      });
    });

    describe('regular numbers', () => {
      it('should handle positive integer', () => {
        expect(normalizeConcentration(5000000)).toBe(5000000);
      });

      it('should handle positive integer string', () => {
        expect(normalizeConcentration('5000000')).toBe(5000000);
      });

      it('should handle decimal number', () => {
        expect(normalizeConcentration(1.5)).toBe(1.5);
      });

      it('should handle decimal string', () => {
        expect(normalizeConcentration('1.5')).toBe(1.5);
      });

      it('should handle negative number', () => {
        expect(normalizeConcentration(-100)).toBe(-100);
      });

      it('should remove commas from large numbers', () => {
        expect(normalizeConcentration('1,000,000')).toBe(1000000);
      });

      it('should remove spaces from numbers', () => {
        expect(normalizeConcentration('1 000 000')).toBe(1000000);
      });
    });

    describe('scientific notation - lowercase e', () => {
      it('should parse 5e6', () => {
        expect(normalizeConcentration('5e6')).toBe(5000000);
      });

      it('should parse 1e3', () => {
        expect(normalizeConcentration('1e3')).toBe(1000);
      });

      it('should parse 5.0e6', () => {
        expect(normalizeConcentration('5.0e6')).toBe(5000000);
      });

      it('should parse 2.5e4', () => {
        expect(normalizeConcentration('2.5e4')).toBe(25000);
      });
    });

    describe('scientific notation - uppercase E', () => {
      it('should parse 5E6', () => {
        expect(normalizeConcentration('5E6')).toBe(5000000);
      });

      it('should parse 5.0E6', () => {
        expect(normalizeConcentration('5.0E6')).toBe(5000000);
      });
    });

    describe('scientific notation - explicit positive exponent', () => {
      it('should parse 5e+6', () => {
        expect(normalizeConcentration('5e+6')).toBe(5000000);
      });

      it('should parse 5E+6', () => {
        expect(normalizeConcentration('5E+6')).toBe(5000000);
      });

      it('should parse 5.0e+6', () => {
        expect(normalizeConcentration('5.0e+6')).toBe(5000000);
      });
    });

    describe('scientific notation - leading zero in exponent', () => {
      it('should parse 5e06', () => {
        expect(normalizeConcentration('5e06')).toBe(5000000);
      });

      it('should parse 5E06', () => {
        expect(normalizeConcentration('5E06')).toBe(5000000);
      });

      it('should parse 5.0e06', () => {
        expect(normalizeConcentration('5.0e06')).toBe(5000000);
      });

      it('should parse 5e+06', () => {
        expect(normalizeConcentration('5e+06')).toBe(5000000);
      });
    });

    describe('scientific notation - negative exponent', () => {
      it('should parse 5e-3 (0.005)', () => {
        expect(normalizeConcentration('5e-3')).toBe(0.005);
      });

      it('should parse 1e-6 (0.000001)', () => {
        expect(normalizeConcentration('1e-6')).toBe(0.000001);
      });
    });

    describe('edge cases', () => {
      it('should return undefined for NaN number', () => {
        expect(normalizeConcentration(NaN)).toBeUndefined();
      });

      it('should return undefined for non-numeric string', () => {
        expect(normalizeConcentration('abc')).toBeUndefined();
      });

      it('should handle partial scientific notation (parseFloat fallback)', () => {
        // JavaScript parseFloat('5e') returns 5, so implementation follows that
        expect(normalizeConcentration('5e')).toBe(5);
      });

      it('should handle very small numbers', () => {
        expect(normalizeConcentration('1e-10')).toBe(1e-10);
      });

      it('should handle very large numbers', () => {
        expect(normalizeConcentration('1e15')).toBe(1e15);
      });

      it('should handle trimming whitespace', () => {
        expect(normalizeConcentration('  5e6  ')).toBe(5000000);
      });
    });
  });
});
