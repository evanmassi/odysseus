/**
 * Development Email Logger
 *
 * Logs emails to console when SMTP credentials are not configured.
 */

import type { EmailService } from '@domain/services/EmailService';
import { logger } from '@infrastructure/logging/logger';
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
}
