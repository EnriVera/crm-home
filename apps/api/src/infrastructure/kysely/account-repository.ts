import { sql } from "kysely";
import type {
  AccountRepository,
  AccountRow,
} from "../../domain/ports/account-repository";
import type { Database } from "./database";

/**
 * Adapter kysely de `AccountRepository`.
 *
 * El balance se calcula en la misma query del list (PRD-v2 §8.6 "Saldos
 * calculados, no mutados"):
 *
 *   balance = initial + Σ ingresos − Σ gastos + Σ transferencias entrantes
 *             − Σ transferencias salientes
 *
 * sobre movimientos no borrados (`*_deleted_at IS NULL`). Las subqueries
 * filtran por user además de por cuenta: una cuenta solo puede tener
 * movimientos del dueño, pero el filtro hace la garantía explícita.
 *
 * Multi-tenant: todas las queries filtran por `acco_user_id`.
 */
export class KyselyAccountRepository implements AccountRepository {
  constructor(private readonly db: Database) {}

  async listByUser(userId: string): Promise<AccountRow[]> {
    const rows = await this.db
      .selectFrom("accounts as a")
      .leftJoin(
        (eb) =>
          eb
            .selectFrom("income")
            .select((eb2) => [
              "inco_acco_id",
              eb2.fn.sum("inco_amount").as("total"),
            ])
            .where("inco_user_id", "=", userId)
            .where("inco_deleted_at", "is", null)
            .groupBy("inco_acco_id")
            .as("i"),
        (join) => join.onRef("i.inco_acco_id", "=", "a.acco_id"),
      )
      .leftJoin(
        (eb) =>
          eb
            .selectFrom("expense")
            .select((eb2) => [
              "expe_acco_id",
              eb2.fn.sum("expe_amount").as("total"),
            ])
            .where("expe_user_id", "=", userId)
            .where("expe_deleted_at", "is", null)
            .groupBy("expe_acco_id")
            .as("e"),
        (join) => join.onRef("e.expe_acco_id", "=", "a.acco_id"),
      )
      .leftJoin(
        (eb) =>
          eb
            .selectFrom("transfer")
            .select((eb2) => [
              "tran_to_acco_id",
              eb2.fn.sum("tran_amount").as("total"),
            ])
            .where("tran_user_id", "=", userId)
            .where("tran_deleted_at", "is", null)
            .groupBy("tran_to_acco_id")
            .as("ti"),
        (join) => join.onRef("ti.tran_to_acco_id", "=", "a.acco_id"),
      )
      .leftJoin(
        (eb) =>
          eb
            .selectFrom("transfer")
            .select((eb2) => [
              "tran_from_acco_id",
              eb2.fn.sum("tran_amount").as("total"),
            ])
            .where("tran_user_id", "=", userId)
            .where("tran_deleted_at", "is", null)
            .groupBy("tran_from_acco_id")
            .as("out"),
        (join) => join.onRef("out.tran_from_acco_id", "=", "a.acco_id"),
      )
      .select((eb) => [
        "a.acco_id",
        "a.acco_user_id",
        "a.acco_name",
        "a.acco_icon",
        "a.acco_color",
        "a.acco_curr_id",
        "a.acco_initial_amount",
        sql<string>`a.acco_initial_amount + COALESCE(i.total, 0) - COALESCE(e.total, 0) + COALESCE(ti.total, 0) - COALESCE(out.total, 0)`.as(
          "balance",
        ),
        "a.acco_created_at",
      ])
      .where("a.acco_user_id", "=", userId)
      .where("a.acco_deleted_at", "is", null)
      .orderBy("a.acco_created_at")
      .execute();
    return rows.map((row) => ({
      id: row.acco_id,
      userId: row.acco_user_id,
      name: row.acco_name,
      icon: row.acco_icon,
      color: row.acco_color,
      currencyId: row.acco_curr_id,
      initialAmount: String(row.acco_initial_amount),
      balance: String(row.balance ?? row.acco_initial_amount),
      createdAt: row.acco_created_at,
    }));
  }

  async insert(params: {
    userId: string;
    name: string;
    icon: string | null;
    color: string | null;
    currencyId: string;
    initialAmount: string;
  }): Promise<AccountRow> {
    const row = await this.db
      .insertInto("accounts")
      .values({
        acco_id: sql<string>`gen_random_uuid()`,
        acco_user_id: params.userId,
        acco_name: params.name,
        acco_icon: params.icon,
        acco_color: params.color,
        acco_curr_id: params.currencyId,
        acco_initial_amount: params.initialAmount,
        acco_created_at: new Date(),
      })
      .returningAll()
      .executeTakeFirstOrThrow();
    return {
      id: row.acco_id,
      userId: row.acco_user_id,
      name: row.acco_name,
      icon: row.acco_icon,
      color: row.acco_color,
      currencyId: row.acco_curr_id,
      initialAmount: String(row.acco_initial_amount),
      // Una cuenta nueva no tiene movimientos: el balance es el inicial.
      balance: String(row.acco_initial_amount),
      createdAt: row.acco_created_at,
    };
  }

  async findById(params: {
    userId: string;
    accountId: string;
  }): Promise<AccountRow | null> {
    const row = await this.db
      .selectFrom("accounts")
      .selectAll()
      .where("acco_user_id", "=", params.userId)
      .where("acco_id", "=", params.accountId)
      .where("acco_deleted_at", "is", null)
      .executeTakeFirst();
    if (!row) return null;
    return {
      id: row.acco_id,
      userId: row.acco_user_id,
      name: row.acco_name,
      icon: row.acco_icon,
      color: row.acco_color,
      currencyId: row.acco_curr_id,
      initialAmount: String(row.acco_initial_amount),
      balance: String(row.acco_initial_amount),
      createdAt: row.acco_created_at,
    };
  }
}
