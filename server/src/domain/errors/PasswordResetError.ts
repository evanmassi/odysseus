import { DomainError } from './DomainError';

/**
 * Error for password reset operations
 */
export class PasswordResetError extends DomainError {
  readonly code = 'PASSWORD_RESET_ERROR';
  readonly statusCode = 400;

  constructor(message: string, context?: Record<string, unknown>) {
    super(message, context);
    this.name = 'PasswordResetError';
  }

  static expired(): PasswordResetError {
    return new PasswordResetError('Password reset token has expired');
  }

  static invalid(): PasswordResetError {
    return new PasswordResetError('Invalid password reset token');
  }

  static tokenNotFound(): PasswordResetError {
    return new PasswordResetError('No password reset token found');
  }
}
