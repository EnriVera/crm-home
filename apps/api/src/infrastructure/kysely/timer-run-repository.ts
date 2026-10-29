import { sql } from "kysely";
import type {
  TimerRunRepository,
  TimerRunRow,
} from "../../domain/ports/timer-run-repository";
import type { Transaction } from "../../domain/ports/transaction";
import { TimerAlreadyRunningError } from "../../domain/timers/errors";
import type { Database } from "./database";

interface TimerRunDbRow {
  timr_id: string;
  timr_user_id: string;
  timr_title: string;
  timr_task_id: string | null;
  timr_clie_id: string | null;
  timr_type_id: string | null;
  timr_cate_id: string | null;
  timr_start: Date;
  timr_end: Date | null;
  timr_duration_seconds: number | null;
  timr_origin: string;
  timr_last_heartbeat: Date | null;
}

/**
 * ¿El error es una violación del índice parcial único del timer
 * (SQLSTATE 23505)?
 *
 * El driver `pg` expone el SQLSTATE en `code` y el nombre del índice en
 * `constraint`. El índice parcial único del timer es el único disparador
 * posible de esto en esta tabla: si el `constraint` viene y no es el de
 * `timer_run`, la violación es de otro índice y no se traduce.
 */
function isUniqueViolation(err: unknown): boolean {
  if (typeof err !== "object" || err === null) return false;
  const candidate = err as { code?: unknown; constraint?: unknown };
  if (candidate.code !== "23505") return false;
  if (typeof candidate.constraint !== "string") return true;
  return candidate.constraint.includes("timer_run");
}

function mapTimerRunRow(row: TimerRunDbRow): TimerRunRow {
  return {
    id: row.timr_id,
    userId: row.timr_user_id,
    title: row.timr_title,
    taskId: row.timr_task_id,
    clientId: row.timr_clie_id,
    typeId: row.timr_type_id,
    categoryId: row.timr_cate_id,
    start: row.timr_start,
    end: row.timr_end,
    durationSeconds: row.timr_duration_seconds,
    origin: row.timr_origin === "resumed" ? "resumed" : "manual",
    lastHeartbeat: row.timr_last_heartbeat,
  };
}

/**
 * Adapter kysely de `TimerRunRepository` (tabla `timer_run`, migración 008).
 */
export class KyselyTimerRunRepository implements TimerRunRepository {
  constructor(private readonly db: Database) {}

  async lockUserTimers(userId: string, trx: Transaction): Promise<void> {
    // Lock de advice a nivel de transacción: se toma y se suelta con la
    // transacción, así que un arranque fallido no deja el usuario
    // bloqueado. `hashtext` deriva el id del usuario a una clave de 32
    // bits (el advisory lock trabaja con int4).
    //
    // La transacción es obligatoria: sin ella el lock se suelta al
    // terminar la llamada y la serialización se pierde.
    await sql`SELECT pg_advisory_xact_lock(hashtext(${userId}))`.execute(
      this.resolve(trx),
    );
  }

  async findOpen(
    userId: string,
    trx?: Transaction,
  ): Promise<TimerRunRow | null> {
    const db = this.resolve(trx);
    const row = await db
      .selectFrom("timer_run")
      .selectAll()
      .where("timr_user_id", "=", userId)
      .where("timr_end", "is", null)
      .where("timr_deleted_at", "is", null)
      .executeTakeFirst();
    return row ? mapTimerRunRow(row as TimerRunDbRow) : null;
  }

  async list(
    params: {
      userId: string;
      from?: Date;
      to?: Date;
      typeId?: string;
      categoryId?: string;
      taskId?: string;
      search?: string;
      limit: number;
    },
    trx?: Transaction,
  ): Promise<TimerRunRow[]> {
    const db = this.resolve(trx);
    let query = db
      .selectFrom("timer_run")
      .selectAll()
      .where("timr_user_id", "=", params.userId)
      .where("timr_deleted_at", "is", null)
      .orderBy("timr_start", "desc")
      .limit(Math.min(Math.max(params.limit, 1), 500));

    if (params.from) query = query.where("timr_start", ">=", params.from);
    if (params.to) query = query.where("timr_start", "<=", params.to);
    if (params.typeId) query = query.where("timr_type_id", "=", params.typeId);
    if (params.categoryId) {
      query = query.where("timr_cate_id", "=", params.categoryId);
    }
    if (params.taskId) query = query.where("timr_task_id", "=", params.taskId);
    if (params.search && params.search.trim().length > 0) {
      query = query.where("timr_title", "ilike", `%${params.search.trim()}%`);
    }

    const rows = await query.execute();
    return rows.map((row) => mapTimerRunRow(row as TimerRunDbRow));
  }

  async findById(
    params: { userId: string; timerId: string },
    trx?: Transaction,
  ): Promise<TimerRunRow | null> {
    const db = this.resolve(trx);
    const row = await db
      .selectFrom("timer_run")
      .selectAll()
      .where("timr_user_id", "=", params.userId)
      .where("timr_id", "=", params.timerId)
      .where("timr_deleted_at", "is", null)
      .executeTakeFirst();
    return row ? mapTimerRunRow(row as TimerRunDbRow) : null;
  }

  async insert(
    params: {
      userId: string;
      title: string;
      taskId: string | null;
      clientId: string | null;
      typeId: string | null;
      categoryId: string | null;
      start: Date;
      origin: "manual" | "resumed";
    },
    trx?: Transaction,
  ): Promise<TimerRunRow> {
    const db = this.resolve(trx);
    try {
      const row = await db
        .insertInto("timer_run")
        .values({
          timr_id: sql<string>`gen_random_uuid()`,
          timr_user_id: params.userId,
          timr_title: params.title,
          timr_task_id: params.taskId,
          timr_clie_id: params.clientId,
          timr_type_id: params.typeId,
          timr_cate_id: params.categoryId,
          timr_start: params.start,
          timr_origin: params.origin,
          // El mismo reloj que usan `close` y `heartbeat`: el default
          // `NOW()` de la base y el reloj de la app no tienen por qué
          // coincidir al milisegundo.
          timr_updated_at: new Date(),
        })
        .returningAll()
        .executeTakeFirstOrThrow();
      return mapTimerRunRow(row as TimerRunDbRow);
    } catch (err) {
      // El índice parcial único `idx_timer_run_user_open` (migración 009)
      // rechaza el insert si ya hay una corrida abierta para el usuario:
      // dos arranques simultáneos no pueden dejar dos corridas colgadas.
      // Traducimos la violación de unicidad a un error de dominio para
      // que el caso de uso reintente en vez de devolver un 500.
      if (isUniqueViolation(err)) {
        throw new TimerAlreadyRunningError();
      }
      throw err;
    }
  }

  async close(
    params: { userId: string; timerId: string; end: Date },
    trx?: Transaction,
  ): Promise<TimerRunRow> {
    const db = this.resolve(trx);
    const current = await db
      .selectFrom("timer_run")
      .select(["timr_start"])
      .where("timr_user_id", "=", params.userId)
      .where("timr_id", "=", params.timerId)
      .where("timr_deleted_at", "is", null)
      .executeTakeFirstOrThrow();
    const durationSeconds = Math.max(
      0,
      Math.round((params.end.getTime() - current.timr_start.getTime()) / 1000),
    );
    const row = await db
      .updateTable("timer_run")
      .set({
        timr_end: params.end,
        timr_duration_seconds: durationSeconds,
        timr_updated_at: new Date(),
      })
      .where("timr_user_id", "=", params.userId)
      .where("timr_id", "=", params.timerId)
      .where("timr_deleted_at", "is", null)
      .returningAll()
      .executeTakeFirstOrThrow();
    return mapTimerRunRow(row as TimerRunDbRow);
  }

  async heartbeat(
    params: { userId: string; timerId: string; at: Date },
    trx?: Transaction,
  ): Promise<TimerRunRow> {
    const db = this.resolve(trx);
    const row = await db
      .updateTable("timer_run")
      .set({ timr_last_heartbeat: params.at, timr_updated_at: new Date() })
      .where("timr_user_id", "=", params.userId)
      .where("timr_id", "=", params.timerId)
      .where("timr_end", "is", null)
      .where("timr_deleted_at", "is", null)
      .returningAll()
      .executeTakeFirstOrThrow();
    return mapTimerRunRow(row as TimerRunDbRow);
  }

  private resolve(trx?: Transaction): Database {
    // SAFETY: Transaction es un opaque domain token; solo Kysely transaction
    // objects se pasan del transaction manager.
    return (trx as Database | undefined) ?? this.db;
  }
}
