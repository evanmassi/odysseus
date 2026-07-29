/**
 * CSV Value Escaping
 *
 * Quotes a field only when it would otherwise break the row — a comma, a quote,
 * or a newline — doubling embedded quotes per RFC 4180.
 */

export function escapeCsvValue(value: string): string {
  if (value.includes(',') || value.includes('"') || value.includes('\n')) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}
