import { EmailService } from '@domain/services/EmailService';

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

    console.log('\n=== EMAIL VERIFICATION (DEV MODE) ===');
    console.log(`To: ${email}`);
    console.log(`Subject: Verify your Odysseus account`);
    console.log(`\nHi ${username},`);
    console.log(`\nClick the link below to verify your email address:`);
    console.log(`\n${verificationUrl}`);
    console.log(`\nThis link expires in 48 hours.`);
    console.log(`\nIf you didn't create this account, you can ignore this email.`);
    console.log('=====================================\n');
  }

  async sendPasswordResetEmail(email: string, token: string): Promise<void> {
    // TODO: Implement for Gap #9 - Password Reset Flow
    console.log('\n=== PASSWORD RESET EMAIL (DEV MODE) ===');
    console.log(`To: ${email}`);
    console.log(`Token: ${token}`);
    console.log('========================================\n');
  }
}
