import { sql, type Kysely } from "kysely";

/**
 * Migración `004_expenses` del módulo /expenses (PRD §D5 — financial accounts).
 *
 * Crea la tabla `expense` siguiendo la convención del repo:
 * - Prefijos de 4 letras (`expe_`) para el módulo.
 * - FKs al usuario y a las cuentas/currency existentes.
 * - Soft-delete via `expe_deleted_at`.
 * - `expe_amount NUMERIC(19, 4)` con CHECK `> 0` (gasto > 0).
 * - `expe_receipt_url` opcional (link al comprobante).
 *
 * Diferencias vs `income` (003_incomes.ts):
 * - `expe_receipt_url` (campo opcional para comprobante).
 * - `acco_id` es la cuenta **origen** (sale plata) vs income que es destino.
 *
 * Idempotente. `down` destructivo.
 */
export async function up(db: Kysely<unknown>): Promise<void> {
     await sql`
    CREATE TABLE IF NOT EXISTS expense (
      expe_id UUID PRIMARY KEY,
      expe_user_id UUID NOT NULL REFERENCES "user"(user_id),
      expe_acco_id UUID NOT NULL REFERENCES accounts(acco_id),
      expe_amount NUMERIC(19, 4) NOT NULL CHECK (expe_amount > 0),
      expe_currency_id UUID NOT NULL REFERENCES currency(curr_id),
      expe_description TEXT,
      expe_category TEXT,
      expe_date DATE NOT NULL,
      expe_receipt_url TEXT,
      expe_created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      expe_updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      expe_deleted_at TIMESTAMPTZ
    )
  `.execute(db);

     await sql`
    CREATE INDEX IF NOT EXISTS idx_expense_user
      ON expense (expe_user_id) WHERE expe_deleted_at IS NULL
  `.execute(db);

     await sql`
    CREATE INDEX IF NOT EXISTS idx_expense_date
      ON expense (expe_user_id, expe_date DESC) WHERE expe_deleted_at IS NULL
  `.execute(db);

     await sql`
    CREATE INDEX IF NOT EXISTS idx_expense_account
      ON expense (expe_acco_id) WHERE expe_deleted_at IS NULL
  `.execute(db);
}

export async function down(db: Kysely<unknown>): Promise<void> {
     await sql`DROP INDEX IF EXISTS idx_expense_account`.execute(db);
     await sql`DROP INDEX IF EXISTS idx_expense_date`.execute(db);
     await sql`DROP INDEX IF EXISTS idx_expense_user`.execute(db);
     await sql`DROP TABLE IF EXISTS expense`.execute(db);
}
