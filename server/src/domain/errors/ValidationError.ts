/**
 * Validation Error
 *
 * Domain validation rule violation. Maps to HTTP 400.
 */

import { DomainError } from './DomainError';
export class ValidationError extends DomainError {
  readonly code = 'VALIDATION_ERROR';
  readonly statusCode = 400;

  constructor(
    message: string,
    context?: Record<string, unknown>
  ) {
    super(message, context);
  }
}
