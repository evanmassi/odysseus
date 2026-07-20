/**
 * Order-Then-Name Comparator
 *
 * Sorts entities by their `sortOrder`, falling back to a locale name compare —
 * the standard ordering for categories and other user-arrangeable lists.
 */
export function compareByOrderThenName<T extends { sortOrder: number; name: string }>(
  a: T,
  b: T
): number {
  return a.sortOrder - b.sortOrder || a.name.localeCompare(b.name);
}
