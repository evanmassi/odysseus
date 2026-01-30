import { EmailService } from '@domain/services/EmailService';
import { logger } from '@utils/logger';

/**
 * Console Email Service Implementation
 *
 * Development mode email service that logs emails to console
 * Use when SMTP credentials not configured
 */
export class ConsoleEmailService implements EmailService {
  private verificationBaseUrl: string;

  constructor(verificationBaseUrl: string) {
    this.verificationBaseUrl = verificationBaseUrl;
  }

  async sendVerificationEmail(email: string, token: string, username: string): Promise<void> {
    logger.debug('[ConsoleEmailService] Verification email generated (dev mode)', {
      subject: 'Verify your Odysseus account',
      expiresIn: '48 hours'
    });
  }

  async sendPasswordResetEmail(email: string, token: string): Promise<void> {
    logger.debug('[ConsoleEmailService] Password reset email generated (dev mode)');
  }
}
