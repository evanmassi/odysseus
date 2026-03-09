/**
 * Access Control Service Types
 *
 * Type definitions for access control and permission checking operations.
 */

/**
 * Result of an access control check
 */
export interface AccessResult {
  allowed: boolean;
  reason: string;
  metadata?: Record<string, unknown>;
}

/**
 * Result of a bulk access control check
 */
export interface BulkAccessResult {
  allowed: boolean;
  allowedTubes: string[];
  deniedTubes: string[];
  errors: string[];
}

/**
 * Types of bulk operations that can be performed
 */
export type BulkOperation = 'edit' | 'delete' | 'move';
