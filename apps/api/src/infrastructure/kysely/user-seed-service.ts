import type { IdGenerator } from "../../domain/ports/id-generator";
import type { Transaction } from "../../domain/ports/transaction";
import type { User } from "../../domain/ports/user-repository";
import type { UserSeedService } from "../../domain/ports/user-seed-service";
import type { Database } from "./database";

export interface KyselyUserSeedServiceDependencies {
  db: Database;
  idGenerator: IdGenerator;
}

export class KyselyUserSeedService implements UserSeedService {
  constructor(private readonly deps: KyselyUserSeedServiceDependencies) {}

  async seed(email: string, trx?: Transaction): Promise<User> {
    const db = this.resolve(trx);
    const now = new Date();
    const userId = this.deps.idGenerator.generate();

    const name = email.split("@")[0] ?? email;

    await db
      .insertInto("user")
      .values({
        user_id: userId,
        user_email: email,
        user_name: name,
        user_theme: "system",
        user_sino_emailverificado: 1,
        user_accepted_terms_at: now,
        user_terms_version: "1.0",
      })
      .execute();

    const ars = await db
      .selectFrom("currency")
      .select("curr_id")
      .where("curr_symbol", "=", "$")
      .limit(1)
      .executeTakeFirstOrThrow(() => new Error("ARS currency not found"));

    await db
      .insertInto("task_state")
      .values([
        {
          tast_id: this.deps.idGenerator.generate(),
          tast_user_id: userId,
          tast_name: "Pendiente",
          tast_order: 1,
        },
        {
          tast_id: this.deps.idGenerator.generate(),
          tast_user_id: userId,
          tast_name: "En progreso",
          tast_order: 2,
        },
        {
          tast_id: this.deps.idGenerator.generate(),
          tast_user_id: userId,
          tast_name: "Completado",
          tast_order: 3,
        },
      ])
      .execute();

    await db
      .insertInto("accounts")
      .values({
        acco_id: this.deps.idGenerator.generate(),
        acco_user_id: userId,
        acco_name: "Efectivo",
        acco_icon: "wallet",
        acco_color: "#64748b",
        acco_curr_id: ars.curr_id,
        acco_initial_amount: 0,
      })
      .execute();

    const types = [
      { modules: ["tasks"], name: "Tarea" },
      { modules: ["schedules"], name: "Evento" },
      { modules: ["incomes"], name: "Ingreso" },
    ];

    for (const type of types) {
      const typeId = this.deps.idGenerator.generate();
      await db
        .insertInto("types")
        .values({
          type_id: typeId,
          type_user_id: userId,
          type_name: type.name,
          type_modules: type.modules,
        })
        .execute();

      await db
        .insertInto("categories")
        .values({
          cate_id: this.deps.idGenerator.generate(),
          cate_user_id: userId,
          cate_name: "General",
          cate_type_id: typeId,
        })
        .execute();
    }

    return {
      id: userId,
      email,
      name,
      theme: "system",
      emailVerified: true,
      acceptedTermsAt: now,
      termsVersion: "1.0",
    };
  }

  private resolve(trx?: Transaction): Database {
    // SAFETY: Transaction is an opaque domain token; only Kysely transaction
    // objects are ever passed from the transaction manager.
    return (trx as Database | undefined) ?? this.deps.db;
  }
}
