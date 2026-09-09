import type {
  EmailSending,
  EmailSendingRepository,
} from "../../domain/ports/email-sending-repository";
import type { Transaction } from "../../domain/ports/transaction";
import type { Database } from "./database";

export class KyselyEmailSendingRepository implements EmailSendingRepository {
  constructor(private readonly db: Database) {}

  async create(message: EmailSending, trx?: Transaction): Promise<void> {
    const db = this.resolve(trx);
    await db
      .insertInto("email_sending")
      .values({
        emse_id: message.id,
        emse_login_id: message.loginId,
        emse_from: message.from,
        emse_to: message.to,
        emse_subject: message.subject,
        emse_body: message.body,
        emse_status: message.status,
      })
      .execute();
  }

  async findPending(limit: number, trx?: Transaction): Promise<EmailSending[]> {
    const db = this.resolve(trx);
    const rows = await db
      .selectFrom("email_sending")
      .select([
        "emse_id",
        "emse_login_id",
        "emse_from",
        "emse_to",
        "emse_subject",
        "emse_body",
        "emse_status",
        "emse_created_at",
        "emse_sent_at",
      ])
      .where("emse_status", "=", "pending")
      .orderBy("emse_created_at", "asc")
      .limit(limit)
      .execute();

    return rows.map((row) => this.mapRow(row));
  }

  async markSent(id: string, trx?: Transaction): Promise<void> {
    const db = this.resolve(trx);
    await db
      .updateTable("email_sending")
      .set({ emse_status: "sent", emse_sent_at: new Date() })
      .where("emse_id", "=", id)
      .execute();
  }

  async markFailed(id: string, trx?: Transaction): Promise<void> {
    const db = this.resolve(trx);
    await db
      .updateTable("email_sending")
      .set({ emse_status: "failed" })
      .where("emse_id", "=", id)
      .execute();
  }

  private resolve(trx?: Transaction): Database {
    // SAFETY: Transaction is an opaque domain token; only Kysely transaction
    // objects are ever passed from the transaction manager.
    return (trx as Database | undefined) ?? this.db;
  }

  private mapRow(row: {
    emse_id: string;
    emse_login_id: string;
    emse_from: string;
    emse_to: string;
    emse_subject: string;
    emse_body: string;
    emse_status: "pending" | "sent" | "failed";
    emse_created_at: Date;
    emse_sent_at: Date | null;
  }): EmailSending {
    return {
      id: row.emse_id,
      loginId: row.emse_login_id,
      from: row.emse_from,
      to: row.emse_to,
      subject: row.emse_subject,
      body: row.emse_body,
      status: row.emse_status,
      createdAt: row.emse_created_at,
      sentAt: row.emse_sent_at ?? undefined,
    };
  }
}
