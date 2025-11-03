/**
 * EmailService Interface - Domain Layer
 *
 * Interface in domain, implementation in infrastructure
 * Email is an external concern, so implementation details belong in infrastructure
 */
export interface EmailService {
  /**
   * Send verification email with token link
   * @param email - User's email address
   * @param token - Verification token (unhashed)
   * @param username - User's username for personalization
   */
  sendVerificationEmail(email: string, token: string, username: string): Promise<void>;

  /**
   * Send password reset email with token link
   * @param email - User's email address
   * @param token - Reset token (unhashed)
   */
  sendPasswordResetEmail(email: string, token: string): Promise<void>;
}
