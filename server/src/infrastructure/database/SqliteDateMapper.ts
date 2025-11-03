/**
 * SqliteDateMapper - Centralized date conversion utilities
 *
 * Date-only fields are ALWAYS strings (YYYY-MM-DD)
 * This prevents timezone bugs by treating dates as calendar dates, not timestamps.
 *
 * Storage:    YYYY-MM-DD strings in database
 * Transport:  YYYY-MM-DD strings in API
 * Comparison: Direct string comparison
 */
export class SqliteDateMapper {

  /**
   * ISO date regex for YYYY-MM-DD validation
   */
  private static readonly ISO_DATE_REGEX = /^\d{4}-\d{2}-\d{2}$/;

  /**
   * Normalize any date input to YYYY-MM-DD string format
   * Handles: Date objects, ISO strings, YYYY-MM-DD strings
   */
  static toDbDate(date: Date | string | null | undefined): string {
    if (!date) return '';

    try {
      // Already in YYYY-MM-DD format
      if (typeof date === 'string' && this.ISO_DATE_REGEX.test(date)) {
        return date;
      }

      // Convert Date object or ISO string to YYYY-MM-DD
      // Use UTC methods to avoid timezone shifting
      const dateObj = date instanceof Date ? date : new Date(date);

      if (isNaN(dateObj.getTime())) {
        console.warn('Invalid date input:', date);
        return '';
      }

      // Extract components using UTC to prevent timezone shifts
      const year = dateObj.getUTCFullYear();
      const month = String(dateObj.getUTCMonth() + 1).padStart(2, '0');
      const day = String(dateObj.getUTCDate()).padStart(2, '0');

      return `${year}-${month}-${day}`;
    } catch (error) {
      console.error('Error normalizing date:', error);
      return '';
    }
  }

  /**
   * Convert Date to SQLite datetime string (ISO format)
   */
  static toDbDateTime(date: Date): string {
    return date.toISOString();
  }

  /**
   * Return SQLite date string as-is (YYYY-MM-DD)
   * Date-only fields should remain as strings to prevent timezone bugs
   */
  static fromDbDate(dateString: string | null): string | null {
    if (!dateString) return null;
    return dateString; // Return string as-is, no Date object conversion
  }

  /**
   * Convert SQLite datetime string to Date object
   */
  static fromDbDateTime(dateTimeString: string | null): Date | null {
    if (!dateTimeString) return null;
    return new Date(dateTimeString);
  }

  /**
   * Convert Date to SQLite timestamp (milliseconds since epoch)
   */
  static toDbTimestamp(date: Date): number {
    return date.getTime();
  }

  /**
   * Convert SQLite timestamp to Date object
   */
  static fromDbTimestamp(timestamp: number | null): Date | null {
    if (!timestamp) return null;
    return new Date(timestamp);
  }

  /**
   * Get current timestamp as SQLite datetime string
   */
  static now(): string {
    return new Date().toISOString();
  }

  /**
   * Get current timestamp as SQLite date string (YYYY-MM-DD)
   */
  static today(): string {
    return this.toDbDate(new Date());
  }
}
