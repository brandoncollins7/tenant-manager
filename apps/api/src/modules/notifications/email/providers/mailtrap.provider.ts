import { Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';
import { EmailPayload, EmailProvider } from '../email.interface';

export class MailtrapProvider implements EmailProvider {
  private readonly logger = new Logger(MailtrapProvider.name);
  private transporter: nodemailer.Transporter | null = null;

  constructor(private configService: ConfigService) {
    const host = this.configService.get<string>('MAILTRAP_HOST');
    const port = this.configService.get<number>('MAILTRAP_PORT') || 587;
    const user = this.configService.get<string>('MAILTRAP_USER');
    const pass = this.configService.get<string>('MAILTRAP_PASS');

    if (host && user && pass) {
      this.transporter = nodemailer.createTransport({
        host,
        port,
        auth: {
          user,
          pass,
        },
      });
      this.logger.log(`Mailtrap email provider initialized (${host}:${port})`);
    }
  }

  isConfigured(): boolean {
    return this.transporter !== null;
  }

  async send(payload: EmailPayload): Promise<void> {
    if (!this.transporter) {
      throw new Error('Mailtrap is not configured');
    }

    const result = await this.transporter.sendMail({
      from: payload.from,
      to: payload.to,
      subject: payload.subject,
      html: payload.html,
      headers: payload.headers,
    });

    this.logger.log(`Email sent via Mailtrap to ${payload.to}`, result.messageId);
  }
}
