import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Resend } from 'resend';

@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);
  private resend: Resend | null = null;
  private readonly fromEmail: string;

  constructor(private configService: ConfigService) {
    const apiKey = this.configService.get<string>('RESEND_API_KEY');
    if (apiKey && apiKey !== 're_xxxxx') {
      this.resend = new Resend(apiKey);
    }
    this.fromEmail =
      this.configService.get<string>('EMAIL_FROM') ||
      'Chore Manager <noreply@example.com>';
  }

  async sendMagicLink(email: string, verifyUrl: string): Promise<void> {
    const subject = 'Sign in to Chore Manager';
    const html = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>${subject}</title>
        </head>
        <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; padding: 20px; max-width: 600px; margin: 0 auto;">
          <h1 style="color: #333; font-size: 24px;">Sign in to Chore Manager</h1>
          <p style="color: #666; font-size: 16px; line-height: 1.5;">
            Click the button below to sign in to your account. This link will expire in 15 minutes.
          </p>
          <a href="${verifyUrl}" style="display: inline-block; background-color: #2563eb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 8px; font-weight: 600; margin: 20px 0;">
            Sign In
          </a>
          <p style="color: #999; font-size: 14px; margin-top: 30px;">
            If you didn't request this email, you can safely ignore it.
          </p>
          <p style="color: #999; font-size: 12px;">
            Or copy and paste this URL into your browser:<br>
            <span style="color: #666; word-break: break-all;">${verifyUrl}</span>
          </p>
        </body>
      </html>
    `;

    if (this.resend) {
      try {
        this.logger.log(`Attempting to send email from: ${this.fromEmail} to: ${email}`);
        const result = await this.resend.emails.send({
          from: this.fromEmail,
          to: email,
          subject,
          html,
        });
        this.logger.log(`Resend API response:`, JSON.stringify(result));
        this.logger.log(`Magic link email sent to ${email}`);
      } catch (error) {
        this.logger.error(`Failed to send magic link email to ${email}`, error);
        this.logger.error(`Error details:`, JSON.stringify(error));
        throw error;
      }
    } else {
      // Development: log the URL instead of sending email
      this.logger.warn(`[DEV] Magic link for ${email}: ${verifyUrl}`);
    }
  }

  async sendChoreReminder(
    email: string,
    occupantName: string,
    choreDate: string,
  ): Promise<void> {
    const subject = `Reminder: Chores due ${choreDate}`;
    const html = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
        </head>
        <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; padding: 20px; max-width: 600px; margin: 0 auto;">
          <h1 style="color: #333; font-size: 24px;">Chore Reminder</h1>
          <p style="color: #666; font-size: 16px; line-height: 1.5;">
            Hi ${occupantName},
          </p>
          <p style="color: #666; font-size: 16px; line-height: 1.5;">
            This is a reminder that your chores are due on <strong>${choreDate}</strong>.
          </p>
          <p style="color: #666; font-size: 16px; line-height: 1.5;">
            Don't forget to take photos of the cleaned areas as proof!
          </p>
        </body>
      </html>
    `;

    if (this.resend) {
      try {
        await this.resend.emails.send({
          from: this.fromEmail,
          to: email,
          subject,
          html,
        });
      } catch (error) {
        this.logger.error(`Failed to send reminder email to ${email}`, error);
      }
    } else {
      this.logger.warn(`[DEV] Reminder for ${email}: ${subject}`);
    }
  }

  async sendSwapRequest(
    email: string,
    requesterName: string,
    targetName: string,
    week: string,
  ): Promise<void> {
    const subject = `Swap Request from ${requesterName}`;
    const html = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
        </head>
        <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; padding: 20px; max-width: 600px; margin: 0 auto;">
          <h1 style="color: #333; font-size: 24px;">Swap Request</h1>
          <p style="color: #666; font-size: 16px; line-height: 1.5;">
            Hi ${targetName},
          </p>
          <p style="color: #666; font-size: 16px; line-height: 1.5;">
            <strong>${requesterName}</strong> has requested to swap chore days with you for <strong>${week}</strong>.
          </p>
          <p style="color: #666; font-size: 16px; line-height: 1.5;">
            Log in to the app to approve or reject this request.
          </p>
        </body>
      </html>
    `;

    if (this.resend) {
      try {
        await this.resend.emails.send({
          from: this.fromEmail,
          to: email,
          subject,
          html,
        });
      } catch (error) {
        this.logger.error(`Failed to send swap request email to ${email}`, error);
      }
    } else {
      this.logger.warn(`[DEV] Swap request email for ${email}: ${subject}`);
    }
  }

  async sendRequestToAdmin(
    adminEmail: string,
    tenant: any,
    request: any,
  ): Promise<void> {
    const typeLabel = request.type === 'CLEANING_SUPPLIES' ? 'Cleaning Supplies' : 'Maintenance Issue';
    const subject = `New Request from Room ${tenant.room.roomNumber}`;
    const frontendUrl = this.configService.get<string>('FRONTEND_URL') || 'http://localhost:5173';

    const html = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
        </head>
        <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; padding: 20px; max-width: 600px; margin: 0 auto;">
          <h1 style="color: #333; font-size: 24px;">New ${typeLabel} Request</h1>
          <div style="background-color: #f3f4f6; border-radius: 8px; padding: 20px; margin: 20px 0;">
            <p style="color: #374151; font-size: 14px; margin: 8px 0;">
              <strong>Room:</strong> ${tenant.room.roomNumber}
            </p>
            <p style="color: #374151; font-size: 14px; margin: 8px 0;">
              <strong>Type:</strong> ${typeLabel}
            </p>
            <p style="color: #374151; font-size: 14px; margin: 8px 0;">
              <strong>Description:</strong><br>
              ${request.description}
            </p>
            <p style="color: #374151; font-size: 14px; margin: 8px 0;">
              <strong>Contact:</strong> ${tenant.email}${tenant.phone ? ` • ${tenant.phone}` : ''}
            </p>
            ${request.photoPath ? '<p style="color: #374151; font-size: 14px; margin: 8px 0;"><strong>Photo attached:</strong> Yes</p>' : ''}
          </div>
          <a href="${frontendUrl}/admin/requests" style="display: inline-block; background-color: #2563eb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 8px; font-weight: 600; margin: 20px 0;">
            View in Admin Dashboard
          </a>
        </body>
      </html>
    `;

    if (this.resend) {
      try {
        await this.resend.emails.send({
          from: this.fromEmail,
          to: adminEmail,
          subject,
          html,
        });
        this.logger.log(`Request notification email sent to admin ${adminEmail}`);
      } catch (error) {
        this.logger.error(`Failed to send request email to admin ${adminEmail}`, error);
      }
    } else {
      this.logger.warn(`[DEV] Request notification for admin ${adminEmail}: ${subject}`);
    }
  }

  async sendRequestResolved(
    tenantEmail: string,
    request: any,
  ): Promise<void> {
    const typeLabel = request.type === 'CLEANING_SUPPLIES' ? 'Cleaning Supplies' : 'Maintenance Issue';
    const subject = `Your ${typeLabel} Request Has Been Resolved`;

    const html = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
        </head>
        <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; padding: 20px; max-width: 600px; margin: 0 auto;">
          <h1 style="color: #333; font-size: 24px;">Request Resolved</h1>
          <p style="color: #666; font-size: 16px; line-height: 1.5;">
            Your ${typeLabel.toLowerCase()} request has been resolved.
          </p>
          <div style="background-color: #f3f4f6; border-radius: 8px; padding: 20px; margin: 20px 0;">
            <p style="color: #374151; font-size: 14px; margin: 8px 0;">
              <strong>Original Request:</strong><br>
              ${request.description}
            </p>
            ${request.notes ? `
            <p style="color: #374151; font-size: 14px; margin: 16px 0 8px 0;">
              <strong>Resolution Notes:</strong><br>
              ${request.notes}
            </p>
            ` : ''}
          </div>
          <p style="color: #666; font-size: 16px; line-height: 1.5;">
            Thank you for your patience!
          </p>
        </body>
      </html>
    `;

    if (this.resend) {
      try {
        await this.resend.emails.send({
          from: this.fromEmail,
          to: tenantEmail,
          subject,
          html,
        });
        this.logger.log(`Request resolved email sent to ${tenantEmail}`);
      } catch (error) {
        this.logger.error(`Failed to send resolved email to ${tenantEmail}`, error);
      }
    } else {
      this.logger.warn(`[DEV] Request resolved email for ${tenantEmail}: ${subject}`);
    }
  }
}
