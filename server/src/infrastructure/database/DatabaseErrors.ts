/**
 * Database Error Utilities
 *
 * Helpers for detecting and handling database-specific errors.
 * Abstracts away database implementation details from application layer.
 */

/**
 * Check if an error is a database constraint violation
 *
 * SQLite constraint error codes:
 * - SQLITE_CONSTRAINT (19): General constraint violation
 * - SQLITE_CONSTRAINT_UNIQUE: UNIQUE constraint failed
 * - SQLITE_CONSTRAINT_PRIMARYKEY: PRIMARY KEY constraint failed
 *
 * better-sqlite3 throws errors with:
 * - error.code: 'SQLITE_CONSTRAINT_UNIQUE' or similar
 * - error.message: Contains "UNIQUE constraint failed"
 */
export function isDatabaseConstraintError(error: any): boolean {
  if (!error) return false;

  // Check error code
  if (error.code && typeof error.code === 'string') {
    if (error.code.includes('SQLITE_CONSTRAINT')) {
      return true;
    }
  }

  // Check error message (fallback)
  if (error.message && typeof error.message === 'string') {
    const message = error.message.toLowerCase();
    if (
      message.includes('unique constraint') ||
      message.includes('constraint failed') ||
      message.includes('duplicate')
    ) {
      return true;
    }
  }

  return false;
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
