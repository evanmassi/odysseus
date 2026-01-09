import nodemailer from 'nodemailer';
import { EmailService } from '@domain/services/EmailService';

/**
 * Nodemailer Email Service Implementation
 *
 * Sends emails via SMTP using Nodemailer library
 * Configured via environment variables
 */
export class NodemailerEmailService implements EmailService {
  private transporter: nodemailer.Transporter;
  private fromAddress: string;
  private verificationBaseUrl: string;

  constructor(
    smtpHost: string,
    smtpPort: number,
    smtpUser: string,
    smtpPass: string,
    fromAddress: string,
    verificationBaseUrl: string
  ) {
    this.fromAddress = fromAddress;
    this.verificationBaseUrl = verificationBaseUrl;

    this.transporter = nodemailer.createTransport({
      host: smtpHost,
      port: smtpPort,
      secure: smtpPort === 465, // Use TLS for port 465
      auth: {
        user: smtpUser,
        pass: smtpPass
      }
    });
  }

  async sendVerificationEmail(email: string, token: string, username: string): Promise<void> {
    const verificationUrl = `${this.verificationBaseUrl}?token=${token}`;

    await this.transporter.sendMail({
      from: this.fromAddress,
      to: email,
      subject: 'Verify your Odysseus account',
      html: this.verificationEmailTemplate(username, verificationUrl),
      text: `Hi ${username},\n\nClick the link below to verify your email address:\n${verificationUrl}\n\nThis link expires in 48 hours.\n\nIf you didn't create this account, you can ignore this email.`
    });
  }

  async sendPasswordResetEmail(email: string, token: string): Promise<void> {
    // TODO: Implement password reset email
    throw new Error('Password reset email not yet implemented');
  }

  private verificationEmailTemplate(username: string, url: string): string {
    return `
      <!DOCTYPE html>
      <html>
        <head>
          <style>
            body {
              font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
              line-height: 1.6;
              color: #333;
              max-width: 600px;
              margin: 0 auto;
              padding: 20px;
            }
            .container {
              background: #f9f9f9;
              border-radius: 8px;
              padding: 30px;
              margin: 20px 0;
            }
            h2 {
              color: #2563eb;
              margin-top: 0;
            }
            .button {
              display: inline-block;
              padding: 12px 24px;
              background: #2563eb;
              color: white;
              text-decoration: none;
              border-radius: 6px;
              margin: 20px 0;
            }
            .footer {
              font-size: 12px;
              color: #666;
              margin-top: 30px;
              padding-top: 20px;
              border-top: 1px solid #ddd;
            }
          </style>
        </head>
        <body>
          <div class="container">
            <h2>Welcome to Odysseus, ${username}!</h2>
            <p>Thank you for creating an account. Please verify your email address to complete your registration.</p>
            <a href="${url}" class="button">Verify Email Address</a>
            <p>Or copy and paste this link into your browser:</p>
            <p style="word-break: break-all; color: #666;">${url}</p>
            <div class="footer">
              <p>This verification link expires in 48 hours.</p>
              <p>If you didn't create this account, you can safely ignore this email.</p>
            </div>
          </div>
        </body>
      </html>
    `;
  }
}
