/**
 * Conflict Error
 *
 * Thrown when optimistic locking detects concurrent modification. Maps to HTTP 409.
 */

import { API_ERROR_CODES } from '@odysseus/shared-schemas';

import { DomainError } from './DomainError';
export class ConflictError extends DomainError {
  readonly code = API_ERROR_CODES.DATA_CONFLICT;
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
      `The storage configuration was changed by someone else. Please refresh and try again.`,
      currentVersion,
      expectedVersion,
      { resourceType: 'StorageConfiguration' }
    );
  }

  static tube(tubeId: string, expectedVersion: number, currentVersion: number): ConflictError {
    return new ConflictError(
      `This tube was changed by someone else. Please refresh and try again.`,
      currentVersion,
      expectedVersion,
      { resourceType: 'Tube', tubeId }
    );
  }
}
