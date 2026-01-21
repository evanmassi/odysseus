/**
 * CSV Generator Utility
 *
 * Converts arrays of objects to CSV format with proper escaping.
 * No external dependencies - simple, focused implementation.
 */

/**
 * Escape a value for CSV format
 * - Wraps in quotes if contains comma, quote, or newline
 * - Escapes internal quotes by doubling them
 */
function escapeValue(value: unknown): string {
  if (value === null || value === undefined) {
    return '';
  }

  const stringValue = String(value);

  // Check if escaping is needed
  if (stringValue.includes(',') || stringValue.includes('"') || stringValue.includes('\n') || stringValue.includes('\r')) {
    // Escape quotes by doubling them, then wrap in quotes
    return `"${stringValue.replace(/"/g, '""')}"`;
  }

  return stringValue;
}

/**
 * Convert array of objects to CSV string
 *
 * @param data Array of objects to convert
 * @param columns Optional column configuration. If not provided, uses keys from first object.
 * @returns CSV string with headers and data rows
 */
export function generateCsv<T extends object>(
  data: T[],
  columns?: Array<{ key: keyof T; header: string }>
): string {
  if (data.length === 0) {
    return '';
  }

  // Determine columns - either from config or from first object keys
  const columnConfig = columns ?? Object.keys(data[0]).map(key => ({
    key: key as keyof T,
    header: key
  }));

  // Generate header row
  const headerRow = columnConfig.map(col => escapeValue(col.header)).join(',');

  // Generate data rows
  const dataRows = data.map(row =>
    columnConfig.map(col => escapeValue(row[col.key])).join(',')
  );

  return [headerRow, ...dataRows].join('\n');
}

/**
 * Format date for CSV export (ISO format for universal compatibility)
 */
export function formatDateForCsv(date: Date | string | null | undefined): string {
  if (!date) return '';

  const dateObj = date instanceof Date ? date : new Date(date);

  if (isNaN(dateObj.getTime())) return '';

  return dateObj.toISOString();
}

/**
 * Format date for human-readable CSV export (YYYY-MM-DD)
 */
export function formatDateShort(date: Date | string | null | undefined): string {
  if (!date) return '';

  const dateObj = date instanceof Date ? date : new Date(date);

  if (isNaN(dateObj.getTime())) return '';

  return dateObj.toISOString().split('T')[0];
}
