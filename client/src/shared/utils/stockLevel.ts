/**
 * Stock Level Tone
 *
 * On-hand quantity against the reorder threshold, as a chip/row tone for the
 * supplies and reagents item rows.
 */

type StockTone = 'success' | 'warning' | 'danger' | 'default';

/**
 * `default` when no threshold is configured. The warning band opens at twice the
 * threshold so stock is flagged before it actually reaches reorder.
 */
export function resolveStockTone(
  totalStock: number,
  reorderThreshold: number | undefined
): StockTone {
  if (reorderThreshold === undefined) return 'default';
  if (totalStock <= 0) return 'danger';
  if (totalStock <= reorderThreshold * 2) return 'warning';
  return 'success';
}
