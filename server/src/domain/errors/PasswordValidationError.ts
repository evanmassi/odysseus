import { DomainError } from './DomainError';

/**
 * Error for password validation failures
 */
export class PasswordValidationError extends DomainError {
  readonly code = 'PASSWORD_VALIDATION_ERROR';
  readonly statusCode = 400;

  constructor(message: string, context?: Record<string, unknown>) {
    super(message, context);
    this.name = 'PasswordValidationError';
  }
}
