/**
 * Database Error Utilities
 *
 * Helpers for detecting and handling database-specific errors.
 * Abstracts away database implementation details from application layer.
 */

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
export function isDatabaseConstraintError(error: any): boolean {
  if (!error) return false;

  // Check error code (Class 23 = Integrity Constraint Violation)
  if (error.code && typeof error.code === 'string') {
    if (error.code.startsWith('23')) {
      return true;
    }
  }

  // Check error message (fallback)
  if (error.message && typeof error.message === 'string') {
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
export function isUniqueConstraintError(error: any): boolean {
  return error?.code === '23505';
}

/**
 * Check if error is specifically a foreign key violation
 */
export function isForeignKeyError(error: any): boolean {
  return error?.code === '23503';
}

/**
 * Check if constraint error is specifically for email uniqueness
 */
export function isEmailConstraintError(error: any): boolean {
  if (!isDatabaseConstraintError(error)) return false;

  const message = error.message?.toLowerCase() || '';
  return message.includes('email');
}

/**
 * Check if constraint error is specifically for username uniqueness
 */
export function isUsernameConstraintError(error: any): boolean {
  if (!isDatabaseConstraintError(error)) return false;

  const message = error.message?.toLowerCase() || '';
  return message.includes('username');
}
