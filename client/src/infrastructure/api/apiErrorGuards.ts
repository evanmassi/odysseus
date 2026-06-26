/**
 * API Error Guards
 *
 * Predicates for classifying ApiError responses (offline writes, conflicts).
 */
import { OfflineWriteError, OFFLINE_WRITE_BLOCKED_CODE } from './HttpTransport';

/** Use to avoid showing duplicate error notifications for offline writes. */
export function isOfflineError(error: unknown): boolean {
  return (
    error instanceof OfflineWriteError ||
    (typeof error === 'object' &&
      error !== null &&
      'code' in error &&
      (error as { code: unknown }).code === OFFLINE_WRITE_BLOCKED_CODE)
  );
}

/** Checks if error is a 409 Conflict from optimistic locking. */
export const isConflictError = (error: unknown): boolean => {
  return (
    typeof error === 'object' &&
    error !== null &&
    'status' in error &&
    (error as { status: unknown }).status === 409
  );
};
