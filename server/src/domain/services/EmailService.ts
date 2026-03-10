/**
 * Email Delivery Contract
 *
 * Domain interface — implementation lives in infrastructure.
 */
export interface EmailService {
  /** @param token Unhashed verification token */
  sendVerificationEmail(email: string, token: string, username: string): Promise<void>;

  /** @param token Unhashed reset token */
  sendPasswordResetEmail(email: string, token: string): Promise<void>;
}
