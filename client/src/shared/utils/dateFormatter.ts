/**
 * Date formatting utilities
 *
 * DEPRECATED: This file is being phased out in favor of dateUtils.ts
 * which provides timezone-safe date-only handling. Use dateUtils.ts for new code.
 *
 * @deprecated Use dateUtils.ts instead
 */

import { normalizeDateString, formatDateForDisplay as newFormatDateForDisplay } from './dateUtils';

/**
 * Format date string for display (M/D/YYYY format)
 *
 * @deprecated Use formatDateForDisplay from dateUtils.ts instead
 * @param dateStr - YYYY-MM-DD string or Date object
 * @returns Formatted date string (M/D/YYYY)
 */
export function formatDateForDisplay(dateStr: string | Date | null | undefined): string {
  // Use new timezone-safe implementation
  return newFormatDateForDisplay(normalizeDateString(dateStr));
}

/**
 * Format date for HTML input[type="date"] (YYYY-MM-DD format)
 *
 * @deprecated Use normalizeDateString or formatDateForInput from dateUtils.ts instead
 * @param dateStr - Any date string format
 * @returns YYYY-MM-DD string
 */
export function formatDateForInput(dateStr: string | Date | null | undefined): string {
  return normalizeDateString(dateStr);
}

/**
 * Get current date as ISO string
 *
 * @deprecated Use getTodayDateString from dateUtils.ts for date-only fields
 * @returns ISO string with time component
 */
export function getCurrentDateISO(): string {
  return new Date().toISOString();
}
