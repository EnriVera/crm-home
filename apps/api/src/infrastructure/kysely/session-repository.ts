import type {
  Session,
  SessionRepository,
} from "../../domain/ports/session-repository";
import type { Transaction } from "../../domain/ports/transaction";
import type { Database } from "./database";

export class KyselySessionRepository implements SessionRepository {
  constructor(private readonly db: Database) {}

  async create(session: Session, trx?: Transaction): Promise<void> {
    const db = this.resolve(trx);
    await db
      .insertInto("session")
      .values({
        sess_id: session.id,
        sess_user_id: session.userId,
        sess_token_hash: session.tokenHash,
        sess_expires_at: session.expiresAt,
      })
      .execute();
  }

  async findByTokenHash(
    hash: string,
    trx?: Transaction,
  ): Promise<Session | undefined> {
    const db = this.resolve(trx);
    const row = await db
      .selectFrom("session")
      .select([
        "sess_id",
        "sess_user_id",
        "sess_token_hash",
        "sess_expires_at",
        "sess_deleted_at",
      ])
      .where("sess_token_hash", "=", hash)
      .where("sess_deleted_at", "is", null)
      .executeTakeFirst();

    return row ? this.mapRow(row) : undefined;
  }

  async softDelete(hash: string, trx?: Transaction): Promise<void> {
    const db = this.resolve(trx);
    await db
      .updateTable("session")
      .set({ sess_deleted_at: new Date() })
      .where("sess_token_hash", "=", hash)
      .execute();
  }

  async updateExpiresAt(
    id: string,
    expiresAt: Date,
    trx?: Transaction,
  ): Promise<void> {
    const db = this.resolve(trx);
    await db
      .updateTable("session")
      .set({ sess_expires_at: expiresAt })
      .where("sess_id", "=", id)
      .execute();
  }

  private resolve(trx?: Transaction): Database {
    // SAFETY: Transaction is an opaque domain token; only Kysely transaction
    // objects are ever passed from the transaction manager.
    return (trx as Database | undefined) ?? this.db;
  }

  private mapRow(row: {
    sess_id: string;
    sess_user_id: string;
    sess_token_hash: string;
    sess_expires_at: Date;
    sess_deleted_at: Date | null;
  }): Session {
    return {
      id: row.sess_id,
      userId: row.sess_user_id,
      tokenHash: row.sess_token_hash,
      expiresAt: row.sess_expires_at,
      deletedAt: row.sess_deleted_at ?? undefined,
    };
  }
}
