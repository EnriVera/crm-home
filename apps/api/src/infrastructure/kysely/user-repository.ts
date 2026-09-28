import type { User, UserRepository } from "../../domain/ports/user-repository";
import type { Transaction } from "../../domain/ports/transaction";
import type { Database } from "./database";

export class KyselyUserRepository implements UserRepository {
  constructor(private readonly db: Database) {}

  async findById(id: string, trx?: Transaction): Promise<User | undefined> {
    const db = this.resolve(trx);
    const row = await db
      .selectFrom("user")
      .select([
        "user_id",
        "user_email",
        "user_name",
        "user_theme",
        "user_sino_emailverificado",
        "user_accepted_terms_at",
        "user_terms_version",
      ])
      .where("user_id", "=", id)
      .where("user_deleted_at", "is", null)
      .executeTakeFirst();

    return row ? this.mapRow(row) : undefined;
  }

  async findByEmail(
    email: string,
    trx?: Transaction,
  ): Promise<User | undefined> {
    const db = this.resolve(trx);
    const row = await db
      .selectFrom("user")
      .select([
        "user_id",
        "user_email",
        "user_name",
        "user_theme",
        "user_sino_emailverificado",
        "user_accepted_terms_at",
        "user_terms_version",
      ])
      .where("user_email", "=", email)
      .where("user_deleted_at", "is", null)
      .executeTakeFirst();

    return row ? this.mapRow(row) : undefined;
  }

  async create(user: User, trx?: Transaction): Promise<void> {
    const db = this.resolve(trx);
    await db
      .insertInto("user")
      .values({
        user_id: user.id,
        user_email: user.email,
        user_name: user.name,
        user_theme: user.theme,
        user_sino_emailverificado: user.emailVerified ? 1 : 0,
        user_accepted_terms_at: user.acceptedTermsAt,
        user_terms_version: user.termsVersion,
      })
      .execute();
  }

  async markEmailVerified(id: string, trx?: Transaction): Promise<void> {
    const db = this.resolve(trx);
    await db
      .updateTable("user")
      .set({
        user_sino_emailverificado: 1,
        user_updated_at: new Date(),
      })
      .where("user_id", "=", id)
      .execute();
  }

  async updateTheme(
    id: string,
    theme: string,
    trx?: Transaction,
  ): Promise<void> {
    const db = this.resolve(trx);
    await db
      .updateTable("user")
      .set({
        user_theme: theme,
        user_updated_at: new Date(),
      })
      .where("user_id", "=", id)
      .execute();
  }

  private resolve(trx?: Transaction): Database {
    // SAFETY: Transaction is an opaque domain token; only Kysely transaction
    // objects are ever passed from the transaction manager.
    return (trx as Database | undefined) ?? this.db;
  }

  private mapRow(row: {
    user_id: string;
    user_email: string;
    user_name: string;
    user_theme: string;
    user_sino_emailverificado: number;
    user_accepted_terms_at: Date | null;
    user_terms_version: string | null;
  }): User {
    return {
      id: row.user_id,
      email: row.user_email,
      name: row.user_name,
      theme: row.user_theme,
      emailVerified: row.user_sino_emailverificado === 1,
      acceptedTermsAt: row.user_accepted_terms_at ?? new Date(0),
      termsVersion: row.user_terms_version ?? "",
    };
  }
}
