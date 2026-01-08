/**
 * Represents a single field change for audit tracking and event payloads.
 *
 * Uses `unknown` instead of `any` to require type checking before use,
 * preventing accidental misuse of change values.
 */
export interface FieldChange {
  /** Name of the changed field (e.g., 'name', 'isActive', 'gridConfig.rows') */
  field: string;
  /** Value before the change */
  oldValue: unknown;
  /** Value after the change */
  newValue: unknown;
}
