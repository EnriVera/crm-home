import { sql } from "kysely";
import type { ExpenseRepository } from "../../domain/ports/expense-repository";
import type { Database } from "./database";
import { mapExpenseRow, type ExpenseDbRow } from "./_mappers";

/**
 * Adapter kysely de `ExpenseRepository`. CRUD de gastos (plata que sale
 * de una cuenta).
 *
 * Misma forma que `KyselyIncomeRepository` (CRUD + filtros + soft-delete)
 * con un campo extra `expe_receipt_url` (link al comprobante).
 */
export class KyselyExpenseRepository implements ExpenseRepository {
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
      .selectFrom("expense")
      .selectAll()
      .where("expe_user_id", "=", params.userId)
      .where("expe_deleted_at", "is", null);

    if (params.search.length > 0) {
      const like = `%${params.search}%`;
      query = query.where((eb) =>
        eb.or([
          eb("expe_description", "ilike", like),
          eb("expe_category", "ilike", like),
        ]),
      );
    }
    if (params.dateFrom !== null) {
      query = query.where("expe_date", ">=", params.dateFrom);
    }
    if (params.dateTo !== null) {
      query = query.where("expe_date", "<=", params.dateTo);
    }

    const rows = await query
      .orderBy("expe_date", "desc")
      .limit(cappedLimit)
      .execute();

    return rows.map((row) => mapExpenseRow(row as ExpenseDbRow));
  }

  async findById(params: { userId: string; expenseId: string }) {
    const row = await this.db
      .selectFrom("expense")
      .selectAll()
      .where("expe_user_id", "=", params.userId)
      .where("expe_id", "=", params.expenseId)
      .where("expe_deleted_at", "is", null)
      .executeTakeFirst();
    return row ? mapExpenseRow(row as ExpenseDbRow) : null;
  }

  async insert(params: {
    userId: string;
    accountId: string;
    amount: string;
    currencyId: string;
    description: string | null;
    category: string | null;
    date: string;
    receiptUrl: string | null;
  }) {
    const row = await this.db
      .insertInto("expense")
      .values({
        expe_id: sql<string>`gen_random_uuid()`,
        expe_user_id: params.userId,
        expe_acco_id: params.accountId,
        expe_amount: params.amount,
        expe_currency_id: params.currencyId,
        expe_description: params.description,
        expe_category: params.category,
        expe_date: params.date,
        expe_receipt_url: params.receiptUrl,
        expe_updated_at: sql<Date>`NOW()`,
      })
      .returningAll()
      .executeTakeFirstOrThrow();
    return mapExpenseRow(row as ExpenseDbRow);
  }

  async update(params: {
    userId: string;
    expenseId: string;
    accountId?: string;
    amount?: string;
    currencyId?: string;
    description?: string | null;
    category?: string | null;
    date?: string;
    receiptUrl?: string | null;
  }) {
    const setValues: Partial<{
      expe_acco_id: string;
      expe_amount: string;
      expe_currency_id: string;
      expe_description: string | null;
      expe_category: string | null;
      expe_date: string;
      expe_receipt_url: string | null;
      expe_updated_at: Date;
    }> = {};
    if (params.accountId !== undefined)
      setValues.expe_acco_id = params.accountId;
    if (params.amount !== undefined) setValues.expe_amount = params.amount;
    if (params.currencyId !== undefined)
      setValues.expe_currency_id = params.currencyId;
    if (params.description !== undefined)
      setValues.expe_description = params.description;
    if (params.category !== undefined)
      setValues.expe_category = params.category;
    if (params.date !== undefined) setValues.expe_date = params.date;
    if (params.receiptUrl !== undefined)
      setValues.expe_receipt_url = params.receiptUrl;
    setValues.expe_updated_at = new Date();

    const row = await this.db
      .updateTable("expense")
      .set(setValues)
      .where("expe_user_id", "=", params.userId)
      .where("expe_id", "=", params.expenseId)
      .where("expe_deleted_at", "is", null)
      .returningAll()
      .executeTakeFirstOrThrow();
    return mapExpenseRow(row as ExpenseDbRow);
  }

  async softDelete(params: { userId: string; expenseId: string }) {
    const row = await this.db
      .updateTable("expense")
      .set({ expe_deleted_at: new Date() })
      .where("expe_user_id", "=", params.userId)
      .where("expe_id", "=", params.expenseId)
      .where("expe_deleted_at", "is", null)
      .returningAll()
      .executeTakeFirstOrThrow();
    return mapExpenseRow(row as ExpenseDbRow);
  }
}
