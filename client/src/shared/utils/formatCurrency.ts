/**
 * Currency Formatter
 *
 * Formats numeric amounts as USD currency strings for display.
 */

export function formatCurrency(amount: number | undefined): string | undefined {
  if (amount === undefined) return undefined;
  return `$${amount.toFixed(2)}`;
}
