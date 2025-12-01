import { Logger } from '@nestjs/common';
import { Subject } from 'rxjs';
import { EmailPayload, EmailProvider } from '../email.interface';

export interface DevEmail {
  id: string;
  from: string;
  to: string;
  subject: string;
  html: string;
  timestamp: Date;
}

// Singleton store for dev emails - shared between provider and controller
class DevEmailStore {
  private static instance: DevEmailStore;
  private emails: DevEmail[] = [];
  private readonly maxEmails = 50;
  readonly emailSubject = new Subject<DevEmail>();

  static getInstance(): DevEmailStore {
    if (!DevEmailStore.instance) {
      DevEmailStore.instance = new DevEmailStore();
    }
    return DevEmailStore.instance;
  }

  addEmail(email: DevEmail): void {
    this.emails.unshift(email);
    if (this.emails.length > this.maxEmails) {
      this.emails = this.emails.slice(0, this.maxEmails);
    }
    this.emailSubject.next(email);
  }

  getAll(): DevEmail[] {
    return this.emails;
  }

  getById(id: string): DevEmail | undefined {
    return this.emails.find((e) => e.id === id);
  }

  clear(): void {
    this.emails = [];
  }
}

export const devEmailStore = DevEmailStore.getInstance();

export class BrowserProvider implements EmailProvider {
  private readonly logger = new Logger(BrowserProvider.name);

  isConfigured(): boolean {
    return true;
  }

  async send(payload: EmailPayload): Promise<void> {
    const email: DevEmail = {
      id: crypto.randomUUID(),
      from: payload.from,
      to: payload.to,
      subject: payload.subject,
      html: payload.html,
      timestamp: new Date(),
    };

    devEmailStore.addEmail(email);
    this.logger.log(`[DEV] Email queued for browser: ${payload.to} - ${payload.subject}`);
  }
}
