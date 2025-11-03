import { DomainError } from './DomainError';

/**
 * Email Verification Error - Thrown when email verification fails
 * Maps to HTTP 400 Bad Request
 */
export class EmailVerificationError extends DomainError {
  readonly code = 'EMAIL_VERIFICATION_ERROR';
  readonly statusCode = 400;

  constructor(
    message: string,
    context?: Record<string, any>
  ) {
    super(message, context);
  }

  /**
   * Create error for expired token
   */
  static expired(): EmailVerificationError {
    return new EmailVerificationError(
      'Verification token expired. Please request a new verification email.'
    );
  }

  /**
   * Create error for invalid token
   */
  static invalid(): EmailVerificationError {
    return new EmailVerificationError(
      'Invalid verification token. Please check your email or request a new verification link.'
    );
  }

  /**
   * Create error for missing token
   */
  static noToken(): EmailVerificationError {
    return new EmailVerificationError(
      'No verification token found for this account.'
    );
  }

  /**
   * Create error for rate limiting
   */
  static rateLimited(waitMinutes: number): EmailVerificationError {
    return new EmailVerificationError(
      `Please wait ${waitMinutes} minutes before requesting another verification email.`,
      { waitMinutes }
    );
  }
}
