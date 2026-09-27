import { sql, type Kysely } from "kysely";

/**
 * Migración `003_incomes` del módulo /incomes (PRD §D5 — financial accounts).
 *
 * Crea la tabla `income` siguiendo la convención del repo:
 * - Prefijos de 4 letras (`inco_`) para el módulo.
 * - FKs al usuario (`inco_user_id`) y a las cuentas/currency existentes
 *   (`accounts`, `currency` — creadas en 001_initial.ts).
 * - Soft-delete via `inco_deleted_at` (consistente con `client`, `task`).
 * - `inco_amount NUMERIC(19, 4)` (mismo formato que `accounts.acco_initial_amount`).
 * - CHECK constraint `inco_amount > 0` (regla de negocio del use case).
 *
 * Idempotente (CREATE TABLE/INDEX IF NOT EXISTS). `down` destructivo.
 */
export async function up(db: Kysely<unknown>): Promise<void> {
    await sql`
    CREATE TABLE IF NOT EXISTS income (
      inco_id UUID PRIMARY KEY,
      inco_user_id UUID NOT NULL REFERENCES "user"(user_id),
      inco_acco_id UUID NOT NULL REFERENCES accounts(acco_id),
      inco_amount NUMERIC(19, 4) NOT NULL CHECK (inco_amount > 0),
      inco_currency_id UUID NOT NULL REFERENCES currency(curr_id),
      inco_description TEXT,
      inco_category TEXT,
      inco_date DATE NOT NULL,
      inco_created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      inco_updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      inco_deleted_at TIMESTAMPTZ
    )
  `.execute(db);

    await sql`
    CREATE INDEX IF NOT EXISTS idx_income_user
      ON income (inco_user_id) WHERE inco_deleted_at IS NULL
  `.execute(db);

    await sql`
    CREATE INDEX IF NOT EXISTS idx_income_date
      ON income (inco_user_id, inco_date DESC) WHERE inco_deleted_at IS NULL
  `.execute(db);

    await sql`
    CREATE INDEX IF NOT EXISTS idx_income_account
      ON income (inco_acco_id) WHERE inco_deleted_at IS NULL
  `.execute(db);
}

export async function down(db: Kysely<unknown>): Promise<void> {
    await sql`DROP INDEX IF EXISTS idx_income_account`.execute(db);
    await sql`DROP INDEX IF EXISTS idx_income_date`.execute(db);
    await sql`DROP INDEX IF EXISTS idx_income_user`.execute(db);
    await sql`DROP TABLE IF EXISTS income`.execute(db);
}
