/**
 * CSV Generator Utility
 *
 * Converts arrays of objects to CSV format with proper escaping.
 */

import { toDate } from '@infrastructure/database/PostgresContext';

function escapeValue(value: unknown, forceText = false): string {
  if (value === null || value === undefined) {
    return '';
  }

  const stringValue = String(value);
  if (!stringValue) return '';

  if (forceText && /^\d/.test(stringValue)) {
    return `="${stringValue.replace(/"/g, '""')}"`;
  }

  // Prevent CSV formula injection: a spreadsheet evaluates a cell beginning with = + - @ (or
  // tab/CR) as a formula. Prefix an apostrophe to neutralize it, but leave genuine numbers alone
  // so negatives aren't turned into text.
  const guarded = /^[=+\-@\t\r]/.test(stringValue) && Number.isNaN(Number(stringValue))
    ? `'${stringValue}`
    : stringValue;

  if (guarded.includes(',') || guarded.includes('"') || guarded.includes('\n') || guarded.includes('\r')) {
    return `"${guarded.replace(/"/g, '""')}"`;
  }

  return guarded;
}

/** If columns not provided, uses keys from first object. */
export function generateCsv<T extends object>(
  data: T[],
  columns?: Array<{ key: keyof T; header: string; forceText?: boolean }>
): string {
  if (data.length === 0) {
    return '';
  }

  const columnConfig: Array<{ key: keyof T; header: string; forceText?: boolean }> =
    columns ?? Object.keys(data[0]).map(key => ({
      key: key as keyof T,
      header: key
    }));

  const headerRow = columnConfig.map(col => escapeValue(col.header)).join(',');

  const dataRows = data.map(row =>
    columnConfig.map(col => escapeValue(row[col.key], col.forceText)).join(',')
  );

  return [headerRow, ...dataRows].join('\n');
}

export function formatDateForCsv(date: Date | string | null | undefined): string {
  if (!date) return '';

  const dateObj = toDate(date);

  if (isNaN(dateObj.getTime())) return '';

  return dateObj.toISOString();
}
