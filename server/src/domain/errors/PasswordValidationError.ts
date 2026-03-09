import { DomainError } from './DomainError';

/**
 * Password Validation Error
 *
 * Password does not meet validation requirements. Maps to HTTP 400.
 */
export class PasswordValidationError extends DomainError {
  readonly code = 'PASSWORD_VALIDATION_ERROR';
  readonly statusCode = 400;

  constructor(message: string, context?: Record<string, unknown>) {
    super(message, context);
  }
}
