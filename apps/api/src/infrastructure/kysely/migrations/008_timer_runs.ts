import { sql, type Kysely } from "kysely";

/**
 * Migración `008_timer_runs` — módulo /schedules (el TIMER de PRD-v4 §8.5).
 *
 * El módulo `schedules` que ya existe (migración 006) es OTRO cosa: reglas
 * recurrentes de cobro (nombre + monto + cuenta + frecuencia). El timer del
 * PRD no tenía ninguna tabla, así que va en su propia.
 *
 * Schema:
 * - Prefijo `timr_` (4 letras), como el resto de las tablas.
 * - Un registro por corrida del timer: `start`, `end` (NULL = corriendo),
 *   `duration_seconds` (calculada al cerrar) y `last_heartbeat`.
 * - `origin`: 'manual' | 'resumed' (PRD-v2 §11: una corrida reanudada).
 * - Los links (task / cliente / tipo / categoría) son opcionales: un timer
 *   libre se guarda sin ninguno (criterio de PRD-v2 §8.4).
 * - Esos links NO son FK: la migración 002 dropea y recrea `task`, `client`,
 *   `types` y `categories`, y una FK hacia ellas haría fallar ese test (y
 *   dejaría la tabla timer_run colgando). El borrado de las filas es
 *   lógico en todo el dominio, así que la integridad referencial la
 *   garantiza la aplicación. La FK a `user` sí se mantiene.
 *
 * El "un timer abierto" es un índice parcial: a lo sumo una fila con
 * `timr_end IS NULL` por usuario.
 */
export async function up(db: Kysely<unknown>): Promise<void> {
  await sql`
    CREATE TABLE IF NOT EXISTS timer_run (
      timr_id UUID PRIMARY KEY,
      timr_user_id UUID NOT NULL REFERENCES "user"(user_id),
      timr_title TEXT NOT NULL,
      timr_task_id UUID,
      timr_clie_id UUID,
      timr_type_id UUID,
      timr_cate_id UUID,
      timr_start TIMESTAMPTZ NOT NULL,
      timr_end TIMESTAMPTZ,
      timr_duration_seconds INTEGER,
      timr_origin TEXT NOT NULL DEFAULT 'manual'
        CHECK (timr_origin IN ('manual', 'resumed')),
      timr_last_heartbeat TIMESTAMPTZ,
      timr_created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      timr_updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      timr_deleted_at TIMESTAMPTZ
    )
  `.execute(db);

  await sql`
    CREATE INDEX IF NOT EXISTS idx_timer_run_user_open
      ON timer_run (timr_user_id)
      WHERE timr_end IS NULL AND timr_deleted_at IS NULL
  `.execute(db);

  await sql`
    CREATE INDEX IF NOT EXISTS idx_timer_run_user_start
      ON timer_run (timr_user_id, timr_start DESC)
      WHERE timr_deleted_at IS NULL
  `.execute(db);
}

export async function down(db: Kysely<unknown>): Promise<void> {
  await sql`DROP INDEX IF EXISTS idx_timer_run_user_start`.execute(db);
  await sql`DROP INDEX IF EXISTS idx_timer_run_user_open`.execute(db);
  await sql`DROP TABLE IF EXISTS timer_run`.execute(db);
}
