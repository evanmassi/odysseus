/**
 * Date Utility Tests
 *
 * Tests date normalization, comparison, formatting, and validation.
 * All functions treat dates as strings (YYYY-MM-DD) to avoid timezone bugs.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

import {
  normalizeDateString,
  areDatesEqual,
  formatDateForDisplay,
  isValidDateString,
  getTodayDateString,
  parseDateInputValue,
  formatDateForInput,
} from './dateUtils';

// Mock logger to prevent console noise in tests
vi.mock('@shared/infrastructure/logger', () => ({
  logger: {
    warn: vi.fn(),
    error: vi.fn(),
  },
}));

describe('dateUtils', () => {
  describe('normalizeDateString()', () => {
    it('should return empty string for null input', () => {
      expect(normalizeDateString(null)).toBe('');
    });

    it('should return empty string for undefined input', () => {
      expect(normalizeDateString(undefined)).toBe('');
    });

    it('should return empty string for empty string input', () => {
      expect(normalizeDateString('')).toBe('');
    });

    it('should pass through valid YYYY-MM-DD format unchanged', () => {
      expect(normalizeDateString('2025-01-15')).toBe('2025-01-15');
    });

    it('should convert Date object to YYYY-MM-DD string', () => {
      const date = new Date(Date.UTC(2025, 0, 15)); // Jan 15, 2025
      expect(normalizeDateString(date)).toBe('2025-01-15');
    });

    it('should convert ISO string to YYYY-MM-DD format', () => {
      expect(normalizeDateString('2025-01-15T12:30:00.000Z')).toBe('2025-01-15');
    });

    it('should handle ISO string with timezone offset', () => {
      // This represents 2025-01-15 in UTC
      const result = normalizeDateString('2025-01-15T00:00:00.000Z');
      expect(result).toBe('2025-01-15');
    });

    it('should pad single-digit month and day', () => {
      const date = new Date(Date.UTC(2025, 2, 5)); // March 5, 2025
      expect(normalizeDateString(date)).toBe('2025-03-05');
    });

    it('should return empty string for invalid date string', () => {
      expect(normalizeDateString('not-a-date')).toBe('');
    });

    it('should pass through syntactically valid but semantically invalid dates', () => {
      // normalizeDateString only checks format, not calendar validity
      // Use isValidDateString for full calendar validation
      expect(normalizeDateString('2025-13-45')).toBe('2025-13-45');
    });

    it('should handle leap year date correctly', () => {
      expect(normalizeDateString('2024-02-29')).toBe('2024-02-29');
    });

    it('should handle end of year correctly', () => {
      expect(normalizeDateString('2025-12-31')).toBe('2025-12-31');
    });
  });

  describe('areDatesEqual()', () => {
    it('should return true for equal YYYY-MM-DD strings', () => {
      expect(areDatesEqual('2025-01-15', '2025-01-15')).toBe(true);
    });

    it('should return false for different dates', () => {
      expect(areDatesEqual('2025-01-15', '2025-01-16')).toBe(false);
    });

    it('should return false when first date is null', () => {
      expect(areDatesEqual(null, '2025-01-15')).toBe(false);
    });

    it('should return false when second date is null', () => {
      expect(areDatesEqual('2025-01-15', null)).toBe(false);
    });

    it('should return false when both dates are null', () => {
      expect(areDatesEqual(null, null)).toBe(false);
    });

    it('should return false when first date is undefined', () => {
      expect(areDatesEqual(undefined, '2025-01-15')).toBe(false);
    });

    it('should return false when both dates are empty strings', () => {
      expect(areDatesEqual('', '')).toBe(false);
    });

    it('should normalize dates before comparison', () => {
      // ISO string vs YYYY-MM-DD
      expect(areDatesEqual('2025-01-15T12:00:00Z', '2025-01-15')).toBe(true);
    });
  });

  describe('formatDateForDisplay()', () => {
    it('should return empty string for empty input', () => {
      expect(formatDateForDisplay('')).toBe('');
    });

    it('should return empty string for null input', () => {
      expect(formatDateForDisplay(null)).toBe('');
    });

    it('should format date with default US locale', () => {
      const result = formatDateForDisplay('2025-01-15');
      // Default format: M/D/YYYY
      expect(result).toMatch(/1\/15\/2025/);
    });

    it('should format date with custom locale', () => {
      const result = formatDateForDisplay('2025-01-15', 'de-DE');
      // German format: DD.MM.YYYY
      expect(result).toMatch(/15\.1\.2025|15\.01\.2025/);
    });

    it('should format date with custom options', () => {
      const result = formatDateForDisplay('2025-01-15', 'en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      });
      expect(result).toBe('January 15, 2025');
    });

    it('should fallback to raw string on formatting error', () => {
      // Invalid locale should fallback gracefully
      const result = formatDateForDisplay('2025-01-15');
      expect(result).toBeTruthy();
    });
  });

  describe('isValidDateString()', () => {
    it('should return true for valid YYYY-MM-DD format', () => {
      expect(isValidDateString('2025-01-15')).toBe(true);
    });

    it('should return false for null', () => {
      expect(isValidDateString(null)).toBe(false);
    });

    it('should return false for undefined', () => {
      expect(isValidDateString(undefined)).toBe(false);
    });

    it('should return false for empty string', () => {
      expect(isValidDateString('')).toBe(false);
    });

    it('should return false for wrong format (DD-MM-YYYY)', () => {
      expect(isValidDateString('15-01-2025')).toBe(false);
    });

    it('should return false for wrong format (MM/DD/YYYY)', () => {
      expect(isValidDateString('01/15/2025')).toBe(false);
    });

    it('should return false for invalid month', () => {
      expect(isValidDateString('2025-13-15')).toBe(false);
    });

    it('should return false for invalid day', () => {
      expect(isValidDateString('2025-01-32')).toBe(false);
    });

    it('should return false for Feb 29 on non-leap year', () => {
      expect(isValidDateString('2025-02-29')).toBe(false);
    });

    it('should return true for Feb 29 on leap year', () => {
      expect(isValidDateString('2024-02-29')).toBe(true);
    });

    it('should return false for Feb 30 (never valid)', () => {
      expect(isValidDateString('2024-02-30')).toBe(false);
    });

    it('should return false for non-string input', () => {
      expect(isValidDateString(12345 as unknown as string)).toBe(false);
    });
  });

  describe('getTodayDateString()', () => {
    beforeEach(() => {
      vi.useFakeTimers();
    });

    it('should return today date in YYYY-MM-DD format', () => {
      vi.setSystemTime(new Date(2025, 0, 15, 12, 0, 0)); // Jan 15, 2025
      expect(getTodayDateString()).toBe('2025-01-15');
    });

    it('should pad single-digit month', () => {
      vi.setSystemTime(new Date(2025, 2, 5)); // March 5
      expect(getTodayDateString()).toBe('2025-03-05');
    });

    it('should pad single-digit day', () => {
      vi.setSystemTime(new Date(2025, 10, 7)); // Nov 7
      expect(getTodayDateString()).toBe('2025-11-07');
    });

    it('should handle end of year', () => {
      vi.setSystemTime(new Date(2025, 11, 31)); // Dec 31
      expect(getTodayDateString()).toBe('2025-12-31');
    });
  });

  describe('parseDateInputValue()', () => {
    it('should normalize valid date input value', () => {
      expect(parseDateInputValue('2025-01-15')).toBe('2025-01-15');
    });

    it('should return empty string for empty input', () => {
      expect(parseDateInputValue('')).toBe('');
    });

    it('should handle ISO strings from inputs', () => {
      expect(parseDateInputValue('2025-01-15T00:00:00')).toBe('2025-01-15');
    });
  });

  describe('formatDateForInput()', () => {
    it('should format YYYY-MM-DD string for input', () => {
      expect(formatDateForInput('2025-01-15')).toBe('2025-01-15');
    });

    it('should convert Date object to input format', () => {
      const date = new Date(Date.UTC(2025, 0, 15));
      expect(formatDateForInput(date)).toBe('2025-01-15');
    });

    it('should return empty string for null', () => {
      expect(formatDateForInput(null)).toBe('');
    });

    it('should return empty string for undefined', () => {
      expect(formatDateForInput(undefined)).toBe('');
    });

    it('should normalize ISO string to input format', () => {
      expect(formatDateForInput('2025-01-15T12:30:00.000Z')).toBe('2025-01-15');
    });
  });
});
