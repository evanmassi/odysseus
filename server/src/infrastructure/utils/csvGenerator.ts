/**
 * CSV Generator Utility
 *
 * Converts arrays of objects to CSV format with proper escaping.
 */

import { toDate } from '@infrastructure/database/PostgresContext';

function escapeValue(value: unknown): string {
  if (value === null || value === undefined) {
    return '';
  }

  const stringValue = String(value);

  if (stringValue.includes(',') || stringValue.includes('"') || stringValue.includes('\n') || stringValue.includes('\r')) {
    return `"${stringValue.replace(/"/g, '""')}"`;
  }

  return stringValue;
}

/** If columns not provided, uses keys from first object. */
export function generateCsv<T extends object>(
  data: T[],
  columns?: Array<{ key: keyof T; header: string }>
): string {
  if (data.length === 0) {
    return '';
  }

  const columnConfig = columns ?? Object.keys(data[0]).map(key => ({
    key: key as keyof T,
    header: key
  }));

  const headerRow = columnConfig.map(col => escapeValue(col.header)).join(',');

  const dataRows = data.map(row =>
    columnConfig.map(col => escapeValue(row[col.key])).join(',')
  );

  return [headerRow, ...dataRows].join('\n');
}

export function formatDateForCsv(date: Date | string | null | undefined): string {
  if (!date) return '';

  const dateObj = toDate(date);

  if (isNaN(dateObj.getTime())) return '';

  return dateObj.toISOString();
}
