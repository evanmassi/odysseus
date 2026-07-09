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
      `Storage configuration was modified by another user. Expected version ${expectedVersion}, but current version is ${currentVersion}. Please refresh and try again.`,
      currentVersion,
      expectedVersion,
      { resourceType: 'StorageConfiguration' }
    );
  }

  static tube(tubeId: string, expectedVersion: number, currentVersion: number): ConflictError {
    return new ConflictError(
      `Tube was modified by another user. Expected version ${expectedVersion}, but current version is ${currentVersion}. Please refresh and try again.`,
      currentVersion,
      expectedVersion,
      { resourceType: 'Tube', tubeId }
    );
  }
}
