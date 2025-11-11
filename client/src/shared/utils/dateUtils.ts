/**
 * Date utility functions for date-only fields (no time/timezone handling)
 *
 * ARCHITECTURAL PRINCIPLE: Treat date-only fields as strings, never Date objects
 * This eliminates timezone bugs used by Airbnb, Stripe, and modern SaaS applications.
 *
 * Storage:    YYYY-MM-DD strings in database
 * Transport:  YYYY-MM-DD strings in API
 * Comparison: Direct string comparison
 * Display:    Format using Intl.DateTimeFormat
 */

/**
 * Date string type (YYYY-MM-DD format)
 * Using branded type for extra type safety
 */
export type DateString = string & { readonly __brand: 'DateString' };

/**
 * ISO date regex for YYYY-MM-DD validation
 */
const ISO_DATE_REGEX = /^\d{4}-\d{2}-\d{2}$/;

/**
 * Normalize any date input to YYYY-MM-DD string format
 * Handles: Date objects, ISO strings, input[type="date"] values
 *
 * @param input - Date object, ISO string, or YYYY-MM-DD string
 * @returns Normalized YYYY-MM-DD string, or empty string if invalid
 */
export function normalizeDateString(input: string | Date | null | undefined): string {
  if (!input) return '';

  try {
    // Already in YYYY-MM-DD format
    if (typeof input === 'string' && ISO_DATE_REGEX.test(input)) {
      return input;
    }

    // Convert Date object or ISO string to YYYY-MM-DD
    // Use UTC methods to avoid timezone shifting
    const date = input instanceof Date ? input : new Date(input);

    if (isNaN(date.getTime())) {
      console.warn('Invalid date input:', input);
      return '';
    }

    // Extract components using UTC to prevent timezone shifts
    const year = date.getUTCFullYear();
    const month = String(date.getUTCMonth() + 1).padStart(2, '0');
    const day = String(date.getUTCDate()).padStart(2, '0');

    return `${year}-${month}-${day}`;
  } catch (error) {
    console.error('Error normalizing date:', error);
    return '';
  }
}

/**
 * Compare two date strings for equality
 * Safe for use with dates from different sources
 *
 * @param a - First date string
 * @param b - Second date string
 * @returns true if dates are equal, false otherwise
 */
export function areDatesEqual(a: string | null | undefined, b: string | null | undefined): boolean {
  // Normalize both inputs
  const dateA = normalizeDateString(a ?? '');
  const dateB = normalizeDateString(b ?? '');

  // Empty dates are not equal to anything (including each other)
  if (!dateA || !dateB) return false;

  return dateA === dateB;
}

/**
 * Format date string for display using locale-aware formatting
 *
 * @param dateString - YYYY-MM-DD format string
 * @param locale - Locale for formatting (default: 'en-US')
 * @param options - Intl.DateTimeFormat options
 * @returns Formatted date string for display
 */
export function formatDateForDisplay(
  dateString: string | null | undefined,
  locale: string = 'en-US',
  options: Intl.DateTimeFormatOptions = { year: 'numeric', month: 'numeric', day: 'numeric' }
): string {
  const normalized = normalizeDateString(dateString ?? '');
  if (!normalized) return '';

  try {
    // Parse YYYY-MM-DD components directly (no Date object conversion to avoid timezone issues)
    const [year, month, day] = normalized.split('-').map(Number);

    // Create date in UTC to prevent timezone shifting
    const date = new Date(Date.UTC(year, month - 1, day));

    return new Intl.DateTimeFormat(locale, { ...options, timeZone: 'UTC' }).format(date);
  } catch (error) {
    console.error('Error formatting date for display:', error);
    return normalized; // Fallback to raw string
  }
}

/**
 * Validate YYYY-MM-DD format string
 *
 * @param value - String to validate
 * @returns true if valid YYYY-MM-DD format
 */
export function isValidDateString(value: string | null | undefined): boolean {
  if (!value || typeof value !== 'string') return false;

  if (!ISO_DATE_REGEX.test(value)) return false;

  // Check if it's a real calendar date
  const [year, month, day] = value.split('-').map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));

  return (
    date.getUTCFullYear() === year &&
    date.getUTCMonth() === month - 1 &&
    date.getUTCDate() === day
  );
}

/**
 * Get today's date as YYYY-MM-DD string in local timezone
 *
 * @returns Today's date in YYYY-MM-DD format
 */
export function getTodayDateString(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');

  return `${year}-${month}-${day}`;
}

/**
 * Parse input[type="date"] value to YYYY-MM-DD
 * HTML date inputs always return YYYY-MM-DD format, but this provides type safety
 *
 * @param value - Value from date input
 * @returns Normalized YYYY-MM-DD string
 */
export function parseDateInputValue(value: string): string {
  return normalizeDateString(value);
}

/**
 * Format YYYY-MM-DD for input[type="date"] value attribute
 *
 * @param dateString - YYYY-MM-DD format string
 * @returns Value suitable for input[type="date"]
 */
export function formatDateForInput(dateString: string | null | undefined): string {
  return normalizeDateString(dateString ?? '');
}
