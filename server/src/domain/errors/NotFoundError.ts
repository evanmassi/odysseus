import { DomainError } from './DomainError';

/**
 * Not Found Error
 *
 * Requested domain entity does not exist. Maps to HTTP 404.
 */
export class NotFoundError extends DomainError {
  readonly code = 'NOT_FOUND_ERROR';
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

  static configuration(): NotFoundError {
    return new NotFoundError('Configuration not found');
  }
}
