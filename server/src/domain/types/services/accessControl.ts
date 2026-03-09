/**
 * Access Control Service Types
 *
 * Type definitions for access control and permission checking operations.
 */

export interface AccessResult {
  allowed: boolean;
  reason: string;
  metadata?: Record<string, unknown>;
}

export interface BulkAccessResult {
  allowed: boolean;
  allowedTubes: string[];
  deniedTubes: string[];
  errors: string[];
}

export type BulkOperation = 'edit' | 'delete' | 'move';
