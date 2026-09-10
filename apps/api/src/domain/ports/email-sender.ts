export interface EmailMessage {
  from: string;
  to: string;
  subject: string;
  body: string;
  html?: string;
  text?: string;
}

export interface EmailSender {
  send(message: EmailMessage): Promise<void>;
}
