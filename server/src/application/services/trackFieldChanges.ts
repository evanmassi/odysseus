/**
 * Field Change Tracking
 *
 * Diffs a PATCH request against the entity it will be applied to, producing the audit trail's
 * before/after pairs. Absent means unchanged and null means cleared, so both normalize to
 * `undefined` before the comparison — a field patched to the value it already held records nothing.
 */

import type { FieldChange } from '@domain/types/fieldChangeTypes';

export interface TrackedField<TData> {
  key: keyof TData;
  getter: () => unknown;
}

export function trackFieldChanges<TData extends object>(
  data: TData,
  fields: TrackedField<TData>[]
): FieldChange[] {
  const changes: FieldChange[] = [];

  for (const { key, getter } of fields) {
    const newValue = data[key];
    if (newValue === undefined) continue;

    const oldValue = getter();
    const normalizedNew = newValue ?? undefined;
    if (oldValue !== normalizedNew) {
      changes.push({ field: key as string, oldValue, newValue: normalizedNew });
    }
  }

  return changes;
}
