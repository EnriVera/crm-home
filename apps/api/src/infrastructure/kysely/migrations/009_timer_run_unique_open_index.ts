import { sql, type Kysely } from "kysely";

/**
 * Migración `009_timer_run_unique_open_index` — "un timer abierto por usuario".
 *
 * La migración 008 creó `idx_timer_run_user_open` como índice PARCIAL pero
 * NO único, así que la regla de dominio "a lo sumo una corrida abierta por
 * usuario" no estaba garantizada por la base: dos arranques concurrentes
 * (doble click, dos tabs, un retry) dejaban dos filas con `timr_end IS NULL`.
 * `GetCurrentTimer` auto-cierra solo una de ellas y la otra queda colgada
 * para siempre, sin `duration_seconds`, sesgando los totales del dashboard.
 *
 * Este índice parcial ÚNICO convierte la regla en una garantía de la base:
 * el segundo insert concurrente falla en vez de duplicar la corrida.
 *
 * Antes de crearlo se cierran las corridas duplicadas que ya existieran
 * (dejando la más reciente abierta), porque un índice único no se puede
 * crear sobre datos que lo violan.
 */
export async function up(db: Kysely<unknown>): Promise<void> {
  // Cerrar duplicados: por usuario, sólo se queda abierta la más reciente.
  await sql`
    UPDATE timer_run AS older
    SET timr_end = newer.timr_start,
        timr_duration_seconds = GREATEST(
          EXTRACT(EPOCH FROM (newer.timr_start - older.timr_start))::INTEGER,
          0
        )
    FROM timer_run AS newer
    WHERE older.timr_user_id = newer.timr_user_id
      AND older.timr_end IS NULL
      AND newer.timr_end IS NULL
      AND older.timr_deleted_at IS NULL
      AND newer.timr_deleted_at IS NULL
      AND older.timr_start < newer.timr_start
  `.execute(db);

  await sql`
    DROP INDEX IF EXISTS idx_timer_run_user_open
  `.execute(db);

  await sql`
    CREATE UNIQUE INDEX IF NOT EXISTS idx_timer_run_user_open
      ON timer_run (timr_user_id)
      WHERE timr_end IS NULL AND timr_deleted_at IS NULL
  `.execute(db);
}

export async function down(db: Kysely<unknown>): Promise<void> {
  await sql`DROP INDEX IF EXISTS idx_timer_run_user_open`.execute(db);
  await sql`
    CREATE INDEX IF NOT EXISTS idx_timer_run_user_open
      ON timer_run (timr_user_id)
      WHERE timr_end IS NULL AND timr_deleted_at IS NULL
  `.execute(db);
}
