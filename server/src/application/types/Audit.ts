/**
 * Audit Change Tracking Types
 *
 * Type definitions for audit trail and change tracking.
 */

/**
 * Audit change record for field modifications
 */
export interface AuditChange {
  field: string;
  oldValue: unknown;
  newValue: unknown;
}
