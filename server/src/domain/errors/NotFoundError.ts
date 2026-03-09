import { DomainError } from './DomainError';

/**
 * Not Found Error - Thrown when requested domain entities don't exist
 * Maps to HTTP 404 Not Found
 */
export class NotFoundError extends DomainError {
  readonly code = 'NOT_FOUND_ERROR';
  readonly statusCode = 404;

  constructor(
    message: string,
    context?: Record<string, any>
  ) {
    super(message, context);
  }

  /**
   * Create not found error for a specific entity type
   */
  static forEntity(entityType: string, identifier: string | number): NotFoundError {
    return new NotFoundError(
      `${entityType} not found`, 
      { entityType, identifier }
    );
  }

  /**
   * Create not found error for tube
   */
  static tube(tubeId: string): NotFoundError {
    return NotFoundError.forEntity('Tube', tubeId);
  }

  /**
   * Create not found error for user
   */
  static user(userId: string): NotFoundError {
    return NotFoundError.forEntity('User', userId);
  }

  /**
   * Create not found error for researcher
   */
  static researcher(researcherId: string): NotFoundError {
    return NotFoundError.forEntity('Researcher', researcherId);
  }

  /**
   * Create not found error for configuration
   */
  static configuration(): NotFoundError {
    return new NotFoundError('Configuration not found');
  }

  /**
   * Create not found error for position
   */
  static position(tankId: string, rackId: string, boxId: string, position: number): NotFoundError {
    return new NotFoundError(
      'Position not found or not available',
      { tankId, rackId, boxId, position }
    );
  }
}
