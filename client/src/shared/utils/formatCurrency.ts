/**
 * Currency Formatter
 *
 * Formats numeric amounts as USD currency strings for display.
 */

const USD = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' });

export function formatCurrency(amount: number | undefined): string | undefined {
  if (amount === undefined) return undefined;
  return USD.format(amount);
}
