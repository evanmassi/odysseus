/**
 * Validation Error
 *
 * Domain validation rule violation. Maps to HTTP 400.
 */

import { API_ERROR_CODES } from '@odysseus/shared-schemas';

import { DomainError } from './DomainError';
export class ValidationError extends DomainError {
  readonly code = API_ERROR_CODES.VALIDATION_FAILED;
  readonly statusCode = 400;

  constructor(
    message: string,
    context?: Record<string, unknown>
  ) {
    super(message, context);
  }
}
