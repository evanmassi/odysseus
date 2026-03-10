/**
 * Field Change Record
 *
 * Represents a single field change for audit tracking and event payloads.
 */
export interface FieldChange {
  /** Supports dot-notation paths (e.g., 'gridConfig.rows') */
  field: string;
  oldValue: unknown;
  newValue: unknown;
}
