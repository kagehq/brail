import { Injectable, Logger } from '@nestjs/common';
import { Resend } from 'resend';

@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);
  private resend: Resend | null = null;
  private readonly fromEmail: string;
  private readonly isProduction: boolean;

  constructor() {
    const apiKey = process.env.RESEND_API_KEY;
    this.fromEmail = process.env.FROM_EMAIL || 'noreply@brail.app';
    this.isProduction = process.env.NODE_ENV === 'production';

    if (apiKey) {
      this.resend = new Resend(apiKey);
      this.logger.log('Email service initialized with Resend');
    } else {
      this.logger.warn('RESEND_API_KEY not found - emails will be logged to console');
    }
  }

  async sendMagicLink(email: string, magicLink: string): Promise<void> {
    if (!this.resend || !this.isProduction) {
      // Dev mode: log to console
      this.logger.log('\n==================================================');
      this.logger.log('🔐 MAGIC LINK (DEV MODE)');
      this.logger.log('==================================================');
      this.logger.log(`Email: ${email}`);
      this.logger.log(`Link:  ${magicLink}`);
      this.logger.log('==================================================\n');
      return;
    }

    try {
      // Production mode: send via Resend
      await this.resend.emails.send({
        from: this.fromEmail,
        to: email,
        subject: 'Sign in to Brail',
        html: this.getMagicLinkTemplate(magicLink),
      });

      this.logger.log(`Magic link sent to ${email}`);
    } catch (error) {
      this.logger.error(`Failed to send magic link to ${email}:`, error);
      throw new Error('Failed to send magic link email');
    }
  }

  private getMagicLinkTemplate(magicLink: string): string {
    return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Sign in to Brail</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #000000;">
  <table role="presentation" style="width: 100%; border-collapse: collapse;">
    <tr>
      <td align="center" style="padding: 40px 0;">
        <table role="presentation" style="width: 100%; max-width: 600px; border-collapse: collapse;">
          <!-- Header -->
          <tr>
            <td style="padding: 40px 30px; text-align: center; background-color: #000000;">
              <h1 style="margin: 0; font-size: 32px; font-weight: bold; color: #ffffff;">
                🚀 Brail
              </h1>
            </td>
          </tr>
          
          <!-- Body -->
          <tr>
            <td style="padding: 40px 30px; background-color: #111111; border-radius: 8px;">
              <h2 style="margin: 0 0 20px 0; font-size: 24px; font-weight: 600; color: #ffffff;">
                Sign in to your account
              </h2>
              
              <p style="margin: 0 0 30px 0; font-size: 16px; line-height: 24px; color: #d4d4d8;">
                Click the button below to sign in to Brail. This link will expire in 15 minutes.
              </p>
              
              <table role="presentation" style="margin: 0 0 30px 0;">
                <tr>
                  <td>
                    <a href="${magicLink}" style="display: inline-block; padding: 14px 32px; background-color: #60a5fa; color: #000000; text-decoration: none; font-weight: 600; font-size: 16px; border-radius: 8px;">
                      Sign in to Brail
                    </a>
                  </td>
                </tr>
              </table>
              
              <p style="margin: 0 0 10px 0; font-size: 14px; line-height: 20px; color: #a1a1aa;">
                Or copy and paste this link into your browser:
              </p>
              
              <p style="margin: 0; padding: 12px; background-color: #1c1c1c; border: 1px solid #27272a; border-radius: 6px; font-size: 13px; color: #60a5fa; word-break: break-all;">
                ${magicLink}
              </p>
            </td>
          </tr>
          
          <!-- Footer -->
          <tr>
            <td style="padding: 30px 30px; text-align: center; background-color: #000000;">
              <p style="margin: 0; font-size: 14px; color: #71717a;">
                If you didn't request this email, you can safely ignore it.
              </p>
              <p style="margin: 10px 0 0 0; font-size: 12px; color: #52525b;">
                © ${new Date().getFullYear()} Brail. All rights reserved.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
    `;
  }
}

