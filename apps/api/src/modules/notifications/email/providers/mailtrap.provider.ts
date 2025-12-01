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

    this.logger.log(`Mailtrap config: host=${host}, port=${port}, user=${user ? '***' : 'MISSING'}, pass=${pass ? '***' : 'MISSING'}`);

    if (host && user && pass) {
      this.transporter = nodemailer.createTransport({
        host,
        port,
        secure: false,
        auth: {
          user,
          pass,
        },
        connectionTimeout: 10000,
        greetingTimeout: 10000,
        socketTimeout: 10000,
        logger: true,
        debug: true,
      });
      this.logger.log(`Mailtrap email provider initialized (${host}:${port})`);
    } else {
      this.logger.warn('Mailtrap provider not configured - missing credentials');
    }
  }

  isConfigured(): boolean {
    return this.transporter !== null;
  }

  async send(payload: EmailPayload): Promise<void> {
    if (!this.transporter) {
      throw new Error('Mailtrap is not configured');
    }

    this.logger.log(`[Mailtrap] Sending email to ${payload.to}...`);
    this.logger.log(`[Mailtrap] Subject: ${payload.subject}`);

    try {
      this.logger.log('[Mailtrap] Calling transporter.sendMail...');
      const result = await this.transporter.sendMail({
        from: payload.from,
        to: payload.to,
        subject: payload.subject,
        html: payload.html,
        headers: payload.headers,
      });

      this.logger.log(`[Mailtrap] Email sent successfully! MessageId: ${result.messageId}`);
      this.logger.log(`[Mailtrap] Response: ${JSON.stringify(result)}`);
    } catch (error) {
      this.logger.error(`[Mailtrap] Failed to send email to ${payload.to}`);
      this.logger.error(`[Mailtrap] Error: ${error.message}`);
      this.logger.error(`[Mailtrap] Stack: ${error.stack}`);
      throw error;
    }
  }
}
