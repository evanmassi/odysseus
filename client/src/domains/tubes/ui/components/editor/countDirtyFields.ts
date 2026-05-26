/**
 * Count Dirty Fields
 *
 * Counts leaf entries in React Hook Form's nested `dirtyFields` tree.
 * `Object.keys(dirtyFields).length` only sees top-level keys (e.g. `sample`,
 * `researcherId`) — useless for forms with a nested shape.
 */

export function countDirtyFields(dirty: unknown): number {
  if (dirty === true) return 1;
  if (typeof dirty !== 'object' || dirty === null) return 0;
  return Object.values(dirty as Record<string, unknown>).reduce<number>(
    (sum, value) => sum + countDirtyFields(value),
    0
  );
}
