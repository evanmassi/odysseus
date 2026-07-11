/**
 * Email Delivery Contract
 *
 * Domain interface — implementation lives in infrastructure.
 */
export interface EmailService {
  /** @param token Unhashed verification token */
  sendVerificationEmail(email: string, token: string, username: string): Promise<void>;
}
