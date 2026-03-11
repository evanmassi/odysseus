/**
 * Database Error Utilities
 *
 * Type guards for PostgreSQL error codes and constraint violation messages.
 */

function hasCode(value: unknown): value is { code: string } {
  return (
    typeof value === 'object' &&
    value !== null &&
    'code' in value &&
    typeof (value as { code: unknown }).code === 'string'
  );
}

function hasMessage(value: unknown): value is { message: string } {
  return (
    typeof value === 'object' &&
    value !== null &&
    'message' in value &&
    typeof (value as { message: unknown }).message === 'string'
  );
}

/**
 * PostgreSQL integrity constraint violation codes (Class 23):
 * - 23505: unique_violation
 * - 23503: foreign_key_violation
 * - 23502: not_null_violation
 * - 23514: check_violation
 * - 23000: integrity_constraint_violation (generic)
 */
export function isDatabaseConstraintError(error: unknown): boolean {
  if (!error) return false;

  if (hasCode(error) && error.code.startsWith('23')) {
    return true;
  }

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

export function isUniqueConstraintError(error: unknown): boolean {
  return hasCode(error) && error.code === '23505';
}

export function isEmailConstraintError(error: unknown): boolean {
  if (!isDatabaseConstraintError(error)) return false;

  return hasMessage(error) && error.message.toLowerCase().includes('email');
}

/** PostgreSQL UNIQUE(tank_id, rack_id, box_id, position) constraint. */
export function isPositionConstraintError(error: unknown): boolean {
  if (!isUniqueConstraintError(error)) return false;

  if (hasMessage(error)) {
    const message = error.message.toLowerCase();
    return message.includes('position') || message.includes('tank_id');
  }

  return false;
}
