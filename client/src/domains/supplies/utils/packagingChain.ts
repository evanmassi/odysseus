/**
 * Packaging Chain
 *
 * Traversals over a supply item's nested packaging levels: the unit→stock-unit
 * multiplier and the base-up chain ordering.
 */

interface PackagingChainLevel {
  unitName: string;
  quantity: number;
  parentUnit: string | null;
}

/** Units of `stockUnit` contained in one `fromUnit`, walking up the packaging chain. */
export function computePackagingMultiplier(
  levels: PackagingChainLevel[],
  fromUnit: string,
  stockUnit: string
): number {
  if (!fromUnit || fromUnit === stockUnit) return 1;
  let multiplier = 1;
  let current = fromUnit;
  for (let i = 0; i < levels.length + 1; i++) {
    const level = levels.find(l => l.unitName === current);
    if (!level) return 1;
    multiplier *= level.quantity;
    if (level.parentUnit === null || level.parentUnit === stockUnit) return multiplier;
    current = level.parentUnit;
  }
  return multiplier;
}

/** Orders levels from the base unit up, following each level's `parentUnit`. */
export function orderPackagingChain<T extends { unitName: string; parentUnit: string | null }>(
  levels: T[]
): T[] {
  const ordered: T[] = [];
  const bottom = levels.find(l => l.parentUnit === null);
  if (bottom) {
    ordered.push(bottom);
    let current = bottom;
    for (let i = 0; i < levels.length; i++) {
      const next = levels.find(l => l.parentUnit === current.unitName);
      if (!next) break;
      ordered.push(next);
      current = next;
    }
  }
  return ordered;
}
