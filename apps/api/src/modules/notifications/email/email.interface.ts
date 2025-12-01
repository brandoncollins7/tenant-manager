export interface EmailPayload {
  from: string;
  to: string;
  subject: string;
  html: string;
  headers?: Record<string, string>;
  tags?: { name: string; value: string }[];
}

export interface EmailProvider {
  send(payload: EmailPayload): Promise<void>;
  isConfigured(): boolean;
}

export const EMAIL_PROVIDER = 'EMAIL_PROVIDER';