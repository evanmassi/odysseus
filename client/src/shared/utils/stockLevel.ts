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

interface ReorderCandidate {
  status: string;
  totalStock: number;
  reorderThreshold?: number;
}

/**
 * At or below the reorder point — the low-stock alert rule. Archived and discontinued
 * items are excluded: nobody reorders those.
 */
export function isBelowReorderThreshold(item: ReorderCandidate): boolean {
  return (
    item.status === 'active' &&
    item.reorderThreshold !== undefined &&
    item.totalStock <= item.reorderThreshold
  );
}
