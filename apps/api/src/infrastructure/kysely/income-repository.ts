import { sql } from "kysely";
import type {
  IncomeRepository,
  IncomeRow,
} from "../../domain/ports/income-repository";
import type { Database } from "./database";
import { mapIncomeRow, type IncomeDbRow } from "./_mappers";

/**
 * Adapter kysely de `IncomeRepository`. CRUD de ingresos (plata que entra
 * a una cuenta).
 *
 *  - `list`: filtro por user + ILIKE en description + date range opcional.
 *    Cap a `min(limit, 100)` para no devolver respuestas gigantes.
 *  - `findById`: filtro por user + id + `inco_deleted_at IS NULL`. Retorna
 *    `null` si no existe o está borrado.
 *  - `insert`: genera UUID vía `gen_random_uuid()`. La validación
 *    `inco_amount > 0` está en el CHECK de la tabla (003_incomes.ts).
 *  - `update`: solo actualiza los campos provistos. Si no se pasa ninguno,
 *    es no-op y retorna la fila sin cambios.
 *  - `softDelete`: setea `inco_deleted_at = NOW()`. Idempotente.
 *
 * Multi-tenant: TODAS las queries filtran por `inco_user_id`.
 */
export class KyselyIncomeRepository implements IncomeRepository {
  constructor(private readonly db: Database) {}

  async list(params: {
    userId: string;
    search: string;
    dateFrom: string | null;
    dateTo: string | null;
    limit: number;
  }): Promise<IncomeRow[]> {
    const cappedLimit = Math.min(params.limit, 100);
    let query = this.db
      .selectFrom("income")
      .selectAll()
      .where("inco_user_id", "=", params.userId)
      .where("inco_deleted_at", "is", null);

    if (params.search.length > 0) {
      // Buscar en description o category (ambos opcionales)
      const like = `%${params.search}%`;
      query = query.where((eb) =>
        eb.or([
          eb("inco_description", "ilike", like),
          eb("inco_category", "ilike", like),
        ]),
      );
    }
    if (params.dateFrom !== null) {
      query = query.where("inco_date", ">=", params.dateFrom);
    }
    if (params.dateTo !== null) {
      query = query.where("inco_date", "<=", params.dateTo);
    }

    const rows = await query
      .orderBy("inco_date", "desc")
      .limit(cappedLimit)
      .execute();

    return rows.map((row) => mapIncomeRow(row as IncomeDbRow));
  }

  async findById(params: {
    userId: string;
    incomeId: string;
  }): Promise<IncomeRow | null> {
    const row = await this.db
      .selectFrom("income")
      .selectAll()
      .where("inco_user_id", "=", params.userId)
      .where("inco_id", "=", params.incomeId)
      .where("inco_deleted_at", "is", null)
      .executeTakeFirst();
    return row ? mapIncomeRow(row as IncomeDbRow) : null;
  }

  async insert(params: {
    userId: string;
    accountId: string;
    amount: string;
    currencyId: string;
    description: string | null;
    category: string | null;
    date: string;
  }): Promise<IncomeRow> {
    const row = await this.db
      .insertInto("income")
      .values({
        inco_id: sql<string>`gen_random_uuid()`,
        inco_user_id: params.userId,
        inco_acco_id: params.accountId,
        inco_amount: params.amount,
        inco_currency_id: params.currencyId,
        inco_description: params.description,
        inco_category: params.category,
        inco_date: params.date,
        inco_updated_at: sql<Date>`NOW()`,
      })
      .returningAll()
      .executeTakeFirstOrThrow();
    return mapIncomeRow(row as IncomeDbRow);
  }

  async update(params: {
    userId: string;
    incomeId: string;
    accountId?: string;
    amount?: string;
    currencyId?: string;
    description?: string | null;
    category?: string | null;
    date?: string;
  }): Promise<IncomeRow> {
    const setValues: Partial<{
      inco_acco_id: string;
      inco_amount: string;
      inco_currency_id: string;
      inco_description: string | null;
      inco_category: string | null;
      inco_date: string;
      inco_updated_at: Date;
    }> = {};
    if (params.accountId !== undefined)
      setValues.inco_acco_id = params.accountId;
    if (params.amount !== undefined) setValues.inco_amount = params.amount;
    if (params.currencyId !== undefined)
      setValues.inco_currency_id = params.currencyId;
    if (params.description !== undefined)
      setValues.inco_description = params.description;
    if (params.category !== undefined)
      setValues.inco_category = params.category;
    if (params.date !== undefined) setValues.inco_date = params.date;
    setValues.inco_updated_at = new Date();

    const row = await this.db
      .updateTable("income")
      .set(setValues)
      .where("inco_user_id", "=", params.userId)
      .where("inco_id", "=", params.incomeId)
      .where("inco_deleted_at", "is", null)
      .returningAll()
      .executeTakeFirstOrThrow();
    return mapIncomeRow(row as IncomeDbRow);
  }

  async softDelete(params: {
    userId: string;
    incomeId: string;
  }): Promise<IncomeRow> {
    const row = await this.db
      .updateTable("income")
      .set({ inco_deleted_at: new Date() })
      .where("inco_user_id", "=", params.userId)
      .where("inco_id", "=", params.incomeId)
      .where("inco_deleted_at", "is", null)
      .returningAll()
      .executeTakeFirstOrThrow();
    return mapIncomeRow(row as IncomeDbRow);
  }
}
