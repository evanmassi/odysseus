/**
 * Date Formatting Utilities
 *
 * Treat date-only fields as strings, never Date objects.
 * This eliminates timezone bugs when storing dates without times.
 *
 * Storage:    YYYY-MM-DD strings in database
 * Transport:  YYYY-MM-DD strings in API
 * Comparison: Direct string comparison
 * Display:    Format using Intl.DateTimeFormat
 */

import { logger } from '@infra/logger';

const ISO_DATE_REGEX = /^\d{4}-\d{2}-\d{2}$/;

export function normalizeDateString(input: string | Date | null | undefined): string {
  if (!input) return '';

  try {
    if (typeof input === 'string' && ISO_DATE_REGEX.test(input)) {
      return input;
    }

    const date = input instanceof Date ? input : new Date(input);

    if (isNaN(date.getTime())) {
      logger.warn('Invalid date input', { input });
      return '';
    }

    // UTC methods prevent timezone shifting for date-only values
    const year = date.getUTCFullYear();
    const month = String(date.getUTCMonth() + 1).padStart(2, '0');
    const day = String(date.getUTCDate()).padStart(2, '0');

    return `${year}-${month}-${day}`;
  } catch (error) {
    logger.error('Error normalizing date', { error });
    return '';
  }
}

const MONTH_ABBR = [
  'Jan',
  'Feb',
  'Mar',
  'Apr',
  'May',
  'Jun',
  'Jul',
  'Aug',
  'Sep',
  'Oct',
  'Nov',
  'Dec',
];

export function formatDateForDisplay(dateString: string | Date | null | undefined): string {
  const normalized = normalizeDateString(dateString);
  if (!normalized) return '';

  const [year, month, day] = normalized.split('-').map(Number);
  return `${day} ${MONTH_ABBR[month - 1]} ${year}`;
}

export function parseDateInputValue(value: string): string {
  return normalizeDateString(value);
}

export function formatDateForInput(dateString: string | Date | null | undefined): string {
  return normalizeDateString(dateString);
}
