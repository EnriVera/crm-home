import type { Transaction } from "./transaction";

export type EmailSendingStatus = "pending" | "sent" | "failed";

export interface EmailSending {
  id: string;
  from: string;
  to: string;
  subject: string;
  body: string;
  loginId: string;
  status: EmailSendingStatus;
  createdAt: Date;
  sentAt?: Date;
}

export interface EmailSendingRepository {
  create(message: EmailSending, trx?: Transaction): Promise<void>;
  findPending(limit: number, trx?: Transaction): Promise<EmailSending[]>;
  markSent(id: string, trx?: Transaction): Promise<void>;
  markFailed(id: string, trx?: Transaction): Promise<void>;
}
