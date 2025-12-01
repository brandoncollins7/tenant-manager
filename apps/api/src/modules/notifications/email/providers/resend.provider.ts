import { Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Resend } from 'resend';
import { EmailPayload, EmailProvider } from '../email.interface';

export class ResendProvider implements EmailProvider {
  private readonly logger = new Logger(ResendProvider.name);
  private resend: Resend | null = null;

  constructor(private configService: ConfigService) {
    const apiKey = this.configService.get<string>('RESEND_API_KEY');
    if (apiKey && apiKey !== 're_xxxxx') {
      this.resend = new Resend(apiKey);
      this.logger.log('Resend email provider initialized');
    }
  }

  isConfigured(): boolean {
    return this.resend !== null;
  }

  async send(payload: EmailPayload): Promise<void> {
    if (!this.resend) {
      throw new Error('Resend is not configured');
    }

    const result = await this.resend.emails.send({
      from: payload.from,
      to: payload.to,
      subject: payload.subject,
      html: payload.html,
      headers: payload.headers,
      tags: payload.tags,
    });

    this.logger.log(`Email sent via Resend to ${payload.to}`, JSON.stringify(result));
  }
}
