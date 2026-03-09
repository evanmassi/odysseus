/**
 * Application Error Classes
 *
 * Structured error classes for consistent frontend error handling.
 */

export class InfrastructureError extends Error {
  readonly code: string;
  readonly details?: Record<string, unknown>;
  readonly retryable: boolean;

  constructor(
    code: 'NETWORK_ERROR' | 'API_ERROR' | 'SERVER_ERROR' | 'TIMEOUT' | 'CONNECTION_LOST',
    message: string,
    details?: Record<string, unknown>,
    retryable = true
  ) {
    super(message);
    this.name = 'InfrastructureError';
    this.code = code;
    this.details = details;
    this.retryable = retryable;
  }
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
