import { sql, type Kysely } from "kysely";

/**
 * Migración `006_schedules` del módulo /schedules.
 *
 * Crea la tabla `schedule` para representar REGlas recurrentes que el user
 * quiere trackear (ej: "Netflix cada mes por $X", "Sueldo cada 15 por $Y").
 *
 * MVP: solo guardamos la regla + la próxima fecha calculada de ejecución.
 * El "ejecutar" (crear income/expense real) sería un job scheduler en Fase 2.
 *
 * Schema:
 * - Prefijo `sche_` (4 letras).
 * - FK: user + account + currency (todos existentes).
 * - amount: NUMERIC(19,4) como string.
 * - frequency: enum text ('monthly' | 'weekly' | 'yearly' | 'daily').
 * - next_run_date: date calculada en server (regla + intervalo).
 * - is_active: boolean para pausar/resumir sin eliminar.
 * - description: opcional.
 */
export async function up(db: Kysely<unknown>): Promise<void> {
     await sql`
    CREATE TABLE IF NOT EXISTS schedule (
      sche_id UUID PRIMARY KEY,
      sche_user_id UUID NOT NULL REFERENCES "user"(user_id),
      sche_name TEXT NOT NULL,
      sche_acco_id UUID NOT NULL REFERENCES accounts(acco_id),
      sche_amount NUMERIC(19, 4) NOT NULL CHECK (sche_amount > 0),
      sche_currency_id UUID NOT NULL REFERENCES currency(curr_id),
      sche_frequency TEXT NOT NULL CHECK (sche_frequency IN ('daily', 'weekly', 'monthly', 'yearly')),
      sche_next_run_date DATE NOT NULL,
      sche_is_active BOOLEAN NOT NULL DEFAULT TRUE,
      sche_description TEXT,
      sche_created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      sche_updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      sche_deleted_at TIMESTAMPTZ
    )
  `.execute(db);

     await sql`
    CREATE INDEX IF NOT EXISTS idx_schedule_user
      ON schedule (sche_user_id) WHERE sche_deleted_at IS NULL
  `.execute(db);
}

export async function down(db: Kysely<unknown>): Promise<void> {
     await sql`DROP INDEX IF EXISTS idx_schedule_user`.execute(db);
     await sql`DROP TABLE IF EXISTS schedule`.execute(db);
}
