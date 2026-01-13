/**
 * Database Error Utilities
 *
 * Helpers for detecting and handling database-specific errors.
 * Abstracts away database implementation details from application layer.
 */

/** Type guard for objects with a code property. */
function hasCode(value: unknown): value is { code: string } {
  return (
    typeof value === 'object' &&
    value !== null &&
    'code' in value &&
    typeof (value as { code: unknown }).code === 'string'
  );
}

/** Type guard for objects with a message property. */
function hasMessage(value: unknown): value is { message: string } {
  return (
    typeof value === 'object' &&
    value !== null &&
    'message' in value &&
    typeof (value as { message: unknown }).message === 'string'
  );
}

/**
 * Check if an error is a database constraint violation
 *
 * PostgreSQL integrity constraint violation codes (Class 23):
 * - 23505: unique_violation
 * - 23503: foreign_key_violation
 * - 23502: not_null_violation
 * - 23514: check_violation
 * - 23000: integrity_constraint_violation (generic)
 */
export function isDatabaseConstraintError(error: unknown): boolean {
  if (!error) return false;

  // Check error code (Class 23 = Integrity Constraint Violation)
  if (hasCode(error) && error.code.startsWith('23')) {
    return true;
  }

  // Check error message (fallback)
  if (hasMessage(error)) {
    const message = error.message.toLowerCase();
    if (
      message.includes('unique constraint') ||
      message.includes('violates') ||
      message.includes('duplicate key')
    ) {
      return true;
    }
  }

  return false;
}

/**
 * Check if error is specifically a unique constraint violation
 */
export function isUniqueConstraintError(error: unknown): boolean {
  return hasCode(error) && error.code === '23505';
}

/**
 * Check if error is specifically a foreign key violation
 */
export function isForeignKeyError(error: unknown): boolean {
  return hasCode(error) && error.code === '23503';
}

/**
 * Check if constraint error is specifically for email uniqueness
 */
export function isEmailConstraintError(error: unknown): boolean {
  if (!isDatabaseConstraintError(error)) return false;

  return hasMessage(error) && error.message.toLowerCase().includes('email');
}

/**
 * Check if constraint error is specifically for username uniqueness
 */
export function isUsernameConstraintError(error: unknown): boolean {
  if (!isDatabaseConstraintError(error)) return false;

  return hasMessage(error) && error.message.toLowerCase().includes('username');
}

/**
 * Check if constraint error is for tube position uniqueness.
 * PostgreSQL UNIQUE(tank_id, rack_id, box_id, position) constraint.
 */
export function isPositionConstraintError(error: unknown): boolean {
  if (!isUniqueConstraintError(error)) return false;

  // Check if error message mentions position-related columns
  if (hasMessage(error)) {
    const message = error.message.toLowerCase();
    return message.includes('position') || message.includes('tank_id');
  }

  return false;
}
