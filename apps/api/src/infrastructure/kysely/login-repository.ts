import type {
  Login,
  LoginRepository,
} from "../../domain/ports/login-repository";
import type { Transaction } from "../../domain/ports/transaction";
import type { Database } from "./database";

export class KyselyLoginRepository implements LoginRepository {
  constructor(private readonly db: Database) {}

  async create(login: Login, trx?: Transaction): Promise<void> {
    const db = this.resolve(trx);
    await db
      .insertInto("login")
      .values({
        logi_id: login.id,
        logi_email: login.email,
        logi_code: login.code,
        logi_expires_at: login.expiresAt,
        logi_attempts: login.attempts,
        logi_created_at: login.createdAt,
      })
      .execute();
  }

  async findLatestByEmail(
    email: string,
    trx?: Transaction,
  ): Promise<Login | undefined> {
    const db = this.resolve(trx);
    const row = await db
      .selectFrom("login")
      .select([
        "logi_id",
        "logi_email",
        "logi_code",
        "logi_expires_at",
        "logi_attempts",
        "logi_created_at",
        "logi_consumed_at",
      ])
      .where("logi_email", "=", email)
      .where("logi_consumed_at", "is", null)
      .orderBy("logi_created_at", "desc")
      .limit(1)
      .executeTakeFirst();

    return row ? this.mapRow(row) : undefined;
  }

  async incrementAttempts(id: string, trx?: Transaction): Promise<void> {
    const db = this.resolve(trx);
    await db
      .updateTable("login")
      .set((eb) => ({ logi_attempts: eb("logi_attempts", "+", 1) }))
      .where("logi_id", "=", id)
      .execute();
  }

  async markConsumed(id: string, trx?: Transaction): Promise<void> {
    const db = this.resolve(trx);
    await db
      .updateTable("login")
      .set({ logi_consumed_at: new Date() })
      .where("logi_id", "=", id)
      .execute();
  }

  async countRecentByEmail(
    email: string,
    since: Date,
    trx?: Transaction,
  ): Promise<number> {
    const db = this.resolve(trx);
    const result = await db
      .selectFrom("login")
      .select((eb) => eb.fn.countAll().as("count"))
      .where("logi_email", "=", email)
      .where("logi_created_at", ">=", since)
      .executeTakeFirst();

    return Number(result?.count ?? 0);
  }

  private resolve(trx?: Transaction): Database {
    // SAFETY: Transaction is an opaque domain token; only Kysely transaction
    // objects are ever passed from the transaction manager.
    return (trx as Database | undefined) ?? this.db;
  }

  private mapRow(row: {
    logi_id: string;
    logi_email: string;
    logi_code: string;
    logi_expires_at: Date;
    logi_attempts: number;
    logi_created_at: Date;
    logi_consumed_at: Date | null;
  }): Login {
    return {
      id: row.logi_id,
      email: row.logi_email,
      code: row.logi_code,
      expiresAt: row.logi_expires_at,
      attempts: row.logi_attempts,
      createdAt: row.logi_created_at,
      consumedAt: row.logi_consumed_at ?? undefined,
    };
  }
}
