import { sql } from "kysely";
import type {
  ScheduleRepository,
} from "../../domain/ports/schedule-repository";
import type { Database } from "./database";
import { mapScheduleRow, type ScheduleDbRow } from "./_mappers";

/**
 * Adapter kysely de `ScheduleRepository`. CRUD de reglas recurrentes.
 */
export class KyselyScheduleRepository implements ScheduleRepository {
  constructor(private readonly db: Database) {}

  async list(params: { userId: string; limit: number }) {
    const cappedLimit = Math.min(params.limit, 100);
    const rows = await this.db
      .selectFrom("schedule")
      .selectAll()
      .where("sche_user_id", "=", params.userId)
      .where("sche_deleted_at", "is", null)
      .orderBy("sche_next_run_date", "asc")
      .limit(cappedLimit)
      .execute();
    return rows.map((row) => mapScheduleRow(row as ScheduleDbRow));
  }

  async findById(params: { userId: string; scheduleId: string }) {
    const row = await this.db
      .selectFrom("schedule")
      .selectAll()
      .where("sche_user_id", "=", params.userId)
      .where("sche_id", "=", params.scheduleId)
      .where("sche_deleted_at", "is", null)
      .executeTakeFirst();
    return row ? mapScheduleRow(row as ScheduleDbRow) : null;
  }

  async insert(params: {
    userId: string;
    name: string;
    accountId: string;
    amount: string;
    currencyId: string;
    frequency: ScheduleRow["frequency"];
    nextRunDate: string;
    isActive: boolean;
    description: string | null;
  }) {
    const row = await this.db
      .insertInto("schedule")
      .values({
        sche_id: sql<string>`gen_random_uuid()`,
        sche_user_id: params.userId,
        sche_name: params.name,
        sche_acco_id: params.accountId,
        sche_amount: params.amount,
        sche_currency_id: params.currencyId,
        sche_frequency: params.frequency,
        sche_next_run_date: params.nextRunDate,
        sche_is_active: params.isActive,
        sche_description: params.description,
        sche_updated_at: sql<Date>`NOW()`,
      })
      .returningAll()
      .executeTakeFirstOrThrow();
    return mapScheduleRow(row as ScheduleDbRow);
  }

  async update(params: {
    userId: string;
    scheduleId: string;
    name?: string;
    accountId?: string;
    amount?: string;
    currencyId?: string;
    frequency?: ScheduleRow["frequency"];
    nextRunDate?: string;
    isActive?: boolean;
    description?: string | null;
  }) {
    const setValues: Partial<{
      sche_name: string;
      sche_acco_id: string;
      sche_amount: string;
      sche_currency_id: string;
      sche_frequency: string;
      sche_next_run_date: string;
      sche_is_active: boolean;
      sche_description: string | null;
      sche_updated_at: Date;
    }> = {};
    if (params.name !== undefined) setValues.sche_name = params.name;
    if (params.accountId !== undefined) setValues.sche_acco_id = params.accountId;
    if (params.amount !== undefined) setValues.sche_amount = params.amount;
    if (params.currencyId !== undefined) setValues.sche_currency_id = params.currencyId;
    if (params.frequency !== undefined) setValues.sche_frequency = params.frequency;
    if (params.nextRunDate !== undefined) setValues.sche_next_run_date = params.nextRunDate;
    if (params.isActive !== undefined) setValues.sche_is_active = params.isActive;
    if (params.description !== undefined) setValues.sche_description = params.description;
    setValues.sche_updated_at = new Date();

    const row = await this.db
      .updateTable("schedule")
      .set(setValues)
      .where("sche_user_id", "=", params.userId)
      .where("sche_id", "=", params.scheduleId)
      .where("sche_deleted_at", "is", null)
      .returningAll()
      .executeTakeFirstOrThrow();
    return mapScheduleRow(row as ScheduleDbRow);
  }

  async softDelete(params: { userId: string; scheduleId: string }) {
    const row = await this.db
      .updateTable("schedule")
      .set({ sche_deleted_at: new Date() })
      .where("sche_user_id", "=", params.userId)
      .where("sche_id", "=", params.scheduleId)
      .where("sche_deleted_at", "is", null)
      .returningAll()
      .executeTakeFirstOrThrow();
    return mapScheduleRow(row as ScheduleDbRow);
  }
}
