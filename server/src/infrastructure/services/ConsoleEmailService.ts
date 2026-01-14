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
    const verificationUrl = `${this.verificationBaseUrl}?token=${token}`;

    logger.debug('Email verification (dev mode)', {
      to: email,
      subject: 'Verify your Odysseus account',
      username,
      verificationUrl,
      expiresIn: '48 hours'
    });
  }

  async sendPasswordResetEmail(email: string, token: string): Promise<void> {
    logger.debug('Password reset email (dev mode)', {
      to: email,
      tokenProvided: !!token
    });
  }
}
