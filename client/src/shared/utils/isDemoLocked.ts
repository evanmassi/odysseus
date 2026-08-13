/**
 * Demo Lock Predicate
 *
 * Reports whether a record belongs to the seeded demo dataset, which cannot be deleted.
 */

export function isDemoLocked(isDemo: boolean, item: { isSeeded?: boolean }): boolean {
  return isDemo && item.isSeeded === true;
}
