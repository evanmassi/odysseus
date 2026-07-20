/**
 * Email Verification Error
 *
 * Email verification operation failure. Maps to HTTP 400.
 */

import { API_ERROR_CODES } from '@odysseus/shared-schemas';

import { DomainError } from './DomainError';
export class EmailVerificationError extends DomainError {
  readonly code = API_ERROR_CODES.VALIDATION_FAILED;
  readonly statusCode = 400;

  constructor(message: string, context?: Record<string, unknown>) {
    super(message, context);
  }

  static expired(): EmailVerificationError {
    return new EmailVerificationError(
      'Verification token expired. Please request a new verification email.'
    );
  }

  static invalid(): EmailVerificationError {
    return new EmailVerificationError(
      'Invalid verification token. Please check your email or request a new verification link.'
    );
  }

  static noToken(): EmailVerificationError {
    return new EmailVerificationError('No verification token found for this account.');
  }

  static rateLimited(waitMinutes: number): EmailVerificationError {
    return new EmailVerificationError(
      `Please wait ${waitMinutes} minutes before requesting another verification email.`,
      { waitMinutes }
    );
  }
}
