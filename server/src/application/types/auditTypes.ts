/**
 * Audit Change Tracking Types
 *
 * Type definitions for audit trail and change tracking.
 */

export interface AuditChange {
  field: string;
  oldValue: unknown;
  newValue: unknown;
}
