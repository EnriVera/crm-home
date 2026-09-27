import { sql } from "kysely";
import type { TransferRepository } from "../../domain/ports/transfer-repository";
import type { Database } from "./database";
import { mapTransferRow, type TransferDbRow } from "./_mappers";

/**
 * Adapter kysely de `TransferRepository`. CRUD de transfers entre cuentas.
 *
 * Misma forma que `KyselyIncomeRepository` + `KyselyExpenseRepository` con
 * 2 FKs a accounts (from + to). El CHECK constraint
 * `tran_from_acco_id != tran_to_acco_id` se valida a nivel DB.
 */
export class KyselyTransferRepository implements TransferRepository {
  constructor(private readonly db: Database) {}

  async list(params: {
    userId: string;
    search: string;
    dateFrom: string | null;
    dateTo: string | null;
    limit: number;
  }) {
    const cappedLimit = Math.min(params.limit, 100);
    let query = this.db
      .selectFrom("transfer")
      .selectAll()
      .where("tran_user_id", "=", params.userId)
      .where("tran_deleted_at", "is", null);

    if (params.search.length > 0) {
      const like = `%${params.search}%`;
      query = query.where("tran_description", "ilike", like);
    }
    if (params.dateFrom !== null) {
      query = query.where("tran_date", ">=", params.dateFrom);
    }
    if (params.dateTo !== null) {
      query = query.where("tran_date", "<=", params.dateTo);
    }

    const rows = await query
      .orderBy("tran_date", "desc")
      .limit(cappedLimit)
      .execute();

    return rows.map((row) => mapTransferRow(row as TransferDbRow));
  }

  async findById(params: { userId: string; transferId: string }) {
    const row = await this.db
      .selectFrom("transfer")
      .selectAll()
      .where("tran_user_id", "=", params.userId)
      .where("tran_id", "=", params.transferId)
      .where("tran_deleted_at", "is", null)
      .executeTakeFirst();
    return row ? mapTransferRow(row as TransferDbRow) : null;
  }

  async insert(params: {
    userId: string;
    fromAccountId: string;
    toAccountId: string;
    amount: string;
    currencyId: string;
    description: string | null;
    date: string;
  }) {
    const row = await this.db
      .insertInto("transfer")
      .values({
        tran_id: sql<string>`gen_random_uuid()`,
        tran_user_id: params.userId,
        tran_from_acco_id: params.fromAccountId,
        tran_to_acco_id: params.toAccountId,
        tran_amount: params.amount,
        tran_currency_id: params.currencyId,
        tran_description: params.description,
        tran_date: params.date,
      })
      .returningAll()
      .executeTakeFirstOrThrow();
    return mapTransferRow(row as TransferDbRow);
  }

  async update(params: {
    userId: string;
    transferId: string;
    fromAccountId?: string;
    toAccountId?: string;
    amount?: string;
    currencyId?: string;
    description?: string | null;
    date?: string;
  }) {
    const setValues: Partial<{
      tran_from_acco_id: string;
      tran_to_acco_id: string;
      tran_amount: string;
      tran_currency_id: string;
      tran_description: string | null;
      tran_date: string;
    }> = {};
    if (params.fromAccountId !== undefined)
      setValues.tran_from_acco_id = params.fromAccountId;
    if (params.toAccountId !== undefined)
      setValues.tran_to_acco_id = params.toAccountId;
    if (params.amount !== undefined) setValues.tran_amount = params.amount;
    if (params.currencyId !== undefined)
      setValues.tran_currency_id = params.currencyId;
    if (params.description !== undefined)
      setValues.tran_description = params.description;
    if (params.date !== undefined) setValues.tran_date = params.date;

    const row = await this.db
      .updateTable("transfer")
      .set(setValues)
      .where("tran_user_id", "=", params.userId)
      .where("tran_id", "=", params.transferId)
      .where("tran_deleted_at", "is", null)
      .returningAll()
      .executeTakeFirstOrThrow();
    return mapTransferRow(row as TransferDbRow);
  }

  async softDelete(params: { userId: string; transferId: string }) {
    const row = await this.db
      .updateTable("transfer")
      .set({ tran_deleted_at: new Date() })
      .where("tran_user_id", "=", params.userId)
      .where("tran_id", "=", params.transferId)
      .where("tran_deleted_at", "is", null)
      .returningAll()
      .executeTakeFirstOrThrow();
    return mapTransferRow(row as TransferDbRow);
  }
}
