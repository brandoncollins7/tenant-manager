import { Inject, Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { randomUUID } from 'crypto';
import { EMAIL_PROVIDER, EmailProvider } from './email';

@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);
  private readonly fromEmail: string;

  constructor(
    private configService: ConfigService,
    @Inject(EMAIL_PROVIDER) private provider: EmailProvider,
  ) {
    this.fromEmail =
      this.configService.get<string>('EMAIL_FROM') ||
      'Rentably <noreply@rentably.app>';
    this.logger.log(`EmailService initialized with provider: ${provider.constructor.name}`);
    this.logger.log(`Provider configured: ${provider.isConfigured()}`);
    this.logger.log(`From email: ${this.fromEmail}`);
  }

  async sendMagicLink(email: string, verifyUrl: string): Promise<void> {
    this.logger.log(`=== sendMagicLink called for ${email} ===`);
    const subject = 'Sign in to Rentably';
    const html = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>${subject}</title>
        </head>
        <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; padding: 20px; max-width: 600px; margin: 0 auto;">
          <h1 style="color: #333; font-size: 24px;">Sign in to Rentably</h1>
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

    if (this.provider.isConfigured()) {
      try {
        this.logger.log(`Attempting to send email from: ${this.fromEmail} to: ${email}`);
        await this.provider.send({
          from: this.fromEmail,
          to: email,
          subject,
          html,
          headers: {
            'X-Entity-Ref-ID': randomUUID(),
          },
          tags: [
            { name: 'category', value: 'auth' },
          ],
        });
        this.logger.log(`Magic link email sent to ${email}`);
      } catch (error) {
        this.logger.error(`Failed to send magic link email to ${email}`, error);
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

    if (this.provider.isConfigured()) {
      try {
        await this.provider.send({
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

    if (this.provider.isConfigured()) {
      try {
        await this.provider.send({
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

    if (this.provider.isConfigured()) {
      try {
        await this.provider.send({
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

    if (this.provider.isConfigured()) {
      try {
        await this.provider.send({
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

  async sendAdminOnboarding(
    email: string,
    name: string,
    role: string,
    verifyUrl: string,
    unitNames?: string[],
  ): Promise<void> {
    const roleLabel = role === 'SUPER_ADMIN' ? 'Super Administrator' : 'Property Manager';
    const subject = `Welcome to Rentably - You've been added as ${roleLabel === 'Super Administrator' ? 'a' : 'a'} ${roleLabel}`;

    const unitsSection = unitNames && unitNames.length > 0
      ? `
          <div style="background-color: #f3f4f6; border-radius: 8px; padding: 20px; margin: 20px 0;">
            <p style="color: #374151; font-size: 14px; font-weight: 600; margin: 0 0 12px 0;">
              Your Assigned Properties:
            </p>
            <ul style="color: #374151; font-size: 14px; margin: 0; padding-left: 20px;">
              ${unitNames.map(name => `<li style="margin: 4px 0;">${name}</li>`).join('')}
            </ul>
          </div>
        `
      : '';

    const html = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>${subject}</title>
        </head>
        <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; padding: 20px; max-width: 600px; margin: 0 auto; background-color: #ffffff;">
          <div style="text-align: center; margin-bottom: 30px;">
            <h1 style="color: #2563eb; font-size: 32px; margin: 0;">Rentably</h1>
          </div>

          <h2 style="color: #333; font-size: 24px; margin-bottom: 16px;">Welcome to the team, ${name}!</h2>

          <p style="color: #666; font-size: 16px; line-height: 1.6; margin-bottom: 20px;">
            You've been added as ${roleLabel === 'Super Administrator' ? 'a' : 'a'} <strong>${roleLabel}</strong> for Rentably.
          </p>

          ${role === 'SUPER_ADMIN'
            ? `
              <p style="color: #666; font-size: 16px; line-height: 1.6; margin-bottom: 20px;">
                As a Super Administrator, you have full access to manage all properties, tenants, admins, and system settings.
              </p>
            `
            : `
              <p style="color: #666; font-size: 16px; line-height: 1.6; margin-bottom: 20px;">
                As a Property Manager, you can manage tenants, chores, and maintenance requests for your assigned properties.
              </p>
              ${unitsSection}
            `
          }

          <div style="background-color: #eff6ff; border-left: 4px solid #2563eb; border-radius: 4px; padding: 16px; margin: 24px 0;">
            <p style="color: #1e40af; font-size: 14px; margin: 0; line-height: 1.5;">
              <strong>Getting Started:</strong><br>
              Click the button below to sign in and access your admin dashboard. This link will expire in 24 hours.
            </p>
          </div>

          <div style="text-align: center; margin: 30px 0;">
            <a href="${verifyUrl}" style="display: inline-block; background-color: #2563eb; color: white; padding: 14px 32px; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 16px;">
              Sign In & Get Started
            </a>
          </div>

          <p style="color: #999; font-size: 14px; margin-top: 30px; padding-top: 20px; border-top: 1px solid #e5e7eb;">
            If you didn't expect this email or have any questions, please contact your system administrator.
          </p>

          <p style="color: #999; font-size: 12px; margin-top: 20px;">
            Or copy and paste this URL into your browser:<br>
            <span style="color: #666; word-break: break-all;">${verifyUrl}</span>
          </p>
        </body>
      </html>
    `;

    if (this.provider.isConfigured()) {
      try {
        this.logger.log(`Attempting to send admin onboarding email from: ${this.fromEmail} to: ${email}`);
        await this.provider.send({
          from: this.fromEmail,
          to: email,
          subject,
          html,
          headers: {
            'X-Entity-Ref-ID': randomUUID(),
          },
          tags: [
            { name: 'category', value: 'admin-onboarding' },
          ],
        });
        this.logger.log(`Admin onboarding email sent to ${email}`);
      } catch (error) {
        this.logger.error(`Failed to send admin onboarding email to ${email}`, error);
        throw error;
      }
    } else {
      // Development: log the URL instead of sending email
      this.logger.warn(`[DEV] Admin onboarding for ${email} (${roleLabel}): ${verifyUrl}`);
    }
  }

  async sendDailyChoreReport(
    adminEmail: string,
    adminName: string,
    unitName: string,
    date: string,
    completions: Array<{
      occupantName: string;
      choreName: string;
      status: string;
      completedAt?: Date | null;
    }>,
  ): Promise<void> {
    const completed = completions.filter(c => c.status === 'COMPLETED').length;
    const missed = completions.filter(c => c.status === 'MISSED').length;
    const total = completions.length;
    const completionRate = total > 0 ? Math.round((completed / total) * 100) : 0;

    const subject = `Rentably Daily Report: ${unitName} - ${date}`;

    const rowsHtml = completions
      .map(c => {
        const isMissed = c.status === 'MISSED';
        const statusIcon = isMissed ? '&#10007;' : '&#10003;';
        const statusText = isMissed ? 'Missed' : 'Completed';
        const statusColor = isMissed ? '#dc2626' : '#16a34a';
        const rowBg = isMissed ? '#fef2f2' : 'transparent';
        const timeStr = c.completedAt
          ? new Date(c.completedAt).toLocaleTimeString('en-US', {
              hour: 'numeric',
              minute: '2-digit',
              hour12: true,
            })
          : '-';

        return `
          <tr style="background-color: ${rowBg};">
            <td style="padding: 12px; border-bottom: 1px solid #e5e7eb;">${c.occupantName}</td>
            <td style="padding: 12px; border-bottom: 1px solid #e5e7eb;">${c.choreName}</td>
            <td style="padding: 12px; border-bottom: 1px solid #e5e7eb; color: ${statusColor}; font-weight: 600;">
              ${statusIcon} ${statusText}
            </td>
            <td style="padding: 12px; border-bottom: 1px solid #e5e7eb; color: #6b7280;">${timeStr}</td>
          </tr>
        `;
      })
      .join('');

    const html = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
        </head>
        <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; padding: 20px; max-width: 600px; margin: 0 auto;">
          <h1 style="color: #333; font-size: 24px;">Daily Chore Report for ${unitName}</h1>
          <p style="color: #666; font-size: 16px; line-height: 1.5;">
            Hi ${adminName}, here's the chore completion summary for <strong>${date}</strong>.
          </p>

          <div style="background-color: #f3f4f6; border-radius: 8px; padding: 16px; margin: 20px 0; text-align: center;">
            <span style="color: #16a34a; font-weight: 600;">&#10003; ${completed} Completed</span>
            <span style="color: #9ca3af; margin: 0 8px;">|</span>
            <span style="color: #dc2626; font-weight: 600;">&#10007; ${missed} Missed</span>
            <span style="color: #9ca3af; margin: 0 8px;">|</span>
            <span style="color: #374151; font-weight: 600;">${completionRate}% Completion Rate</span>
          </div>

          <table style="width: 100%; border-collapse: collapse; margin-top: 20px;">
            <thead>
              <tr style="background-color: #f9fafb;">
                <th style="padding: 12px; text-align: left; border-bottom: 2px solid #e5e7eb; color: #374151; font-weight: 600;">Occupant</th>
                <th style="padding: 12px; text-align: left; border-bottom: 2px solid #e5e7eb; color: #374151; font-weight: 600;">Chore</th>
                <th style="padding: 12px; text-align: left; border-bottom: 2px solid #e5e7eb; color: #374151; font-weight: 600;">Status</th>
                <th style="padding: 12px; text-align: left; border-bottom: 2px solid #e5e7eb; color: #374151; font-weight: 600;">Time</th>
              </tr>
            </thead>
            <tbody>
              ${rowsHtml}
            </tbody>
          </table>

          <p style="color: #999; font-size: 12px; margin-top: 30px;">
            This is an automated daily report from Rentably.
          </p>
        </body>
      </html>
    `;

    if (this.provider.isConfigured()) {
      try {
        await this.provider.send({
          from: this.fromEmail,
          to: adminEmail,
          subject,
          html,
          tags: [{ name: 'category', value: 'daily-report' }],
        });
        this.logger.log(`Daily chore report sent to ${adminEmail} for ${unitName}`);
      } catch (error) {
        this.logger.error(`Failed to send daily report to ${adminEmail}`, error);
      }
    } else {
      this.logger.warn(`[DEV] Daily chore report for ${adminEmail}: ${subject}`);
      this.logger.warn(`[DEV] Summary: ${completed} completed, ${missed} missed (${completionRate}%)`);
    }
  }
}
