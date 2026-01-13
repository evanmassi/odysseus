import { DomainError } from './DomainError';

/**
 * Thrown when optimistic locking detects concurrent modification.
 * Maps to HTTP 409 Conflict.
 */
export class ConflictError extends DomainError {
  readonly code = 'CONFLICT_ERROR';
  readonly statusCode = 409;

  constructor(
    message: string,
    public readonly currentVersion: number,
    public readonly expectedVersion: number,
    context?: Record<string, unknown>
  ) {
    super(message, {
      ...context,
      currentVersion,
      expectedVersion
    });
  }

  static configuration(expectedVersion: number, currentVersion: number): ConflictError {
    return new ConflictError(
      `Configuration was modified by another user. Expected version ${expectedVersion}, but current version is ${currentVersion}. Please refresh and try again.`,
      currentVersion,
      expectedVersion,
      { resourceType: 'Configuration' }
    );
  }
}
