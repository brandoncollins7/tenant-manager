import { Logger } from '@nestjs/common';
import { EmailPayload, EmailProvider } from '../email.interface';

export class ConsoleProvider implements EmailProvider {
  private readonly logger = new Logger(ConsoleProvider.name);

  isConfigured(): boolean {
    return true;
  }

  async send(payload: EmailPayload): Promise<void> {
    this.logger.warn(`[DEV] Email to ${payload.to}`);
    this.logger.warn(`[DEV] Subject: ${payload.subject}`);
    this.logger.warn(`[DEV] From: ${payload.from}`);
  }
}
