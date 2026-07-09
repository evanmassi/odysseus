/**
 * Not Found Error
 *
 * Requested domain entity does not exist. Maps to HTTP 404.
 */

import { API_ERROR_CODES } from '@odysseus/shared-schemas';

import { DomainError } from './DomainError';
export class NotFoundError extends DomainError {
  readonly code = API_ERROR_CODES.RESOURCE_NOT_FOUND;
  readonly statusCode = 404;

  constructor(
    message: string,
    context?: Record<string, unknown>
  ) {
    super(message, context);
  }

  static forEntity(entityType: string, identifier: string | number): NotFoundError {
    return new NotFoundError(
      `${entityType} not found`,
      { entityType, identifier }
    );
  }

  static storage(): NotFoundError {
    return new NotFoundError('Storage configuration not found');
  }
}
