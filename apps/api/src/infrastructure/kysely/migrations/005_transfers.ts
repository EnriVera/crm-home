import { sql, type Kysely } from "kysely";

/**
 * Migración `005_transfers` del módulo /transfers (PRD §D5 — financial accounts).
 *
 * Crea la tabla `transfer` para representar movimientos de plata ENTRE
 * cuentas del mismo user (no entre usuarios).
 *
 * Schema:
 * - Prefijo `tran_` (4 letras, convención del repo).
 * - FKs: user + from_account + to_account + currency (todos existentes).
 * - CHECK: `tran_amount > 0` (mover plata negativa no tiene sentido).
 * - CHECK: `tran_from_acco_id != tran_to_acco_id` (no transfer a sí mismo).
 * - Soft-delete via `tran_deleted_at`.
 *
 * Idempotente. `down` destructivo.
 */
export async function up(db: Kysely<unknown>): Promise<void> {
  await sql`
    CREATE TABLE IF NOT EXISTS transfer (
      tran_id UUID PRIMARY KEY,
      tran_user_id UUID NOT NULL REFERENCES "user"(user_id),
      tran_from_acco_id UUID NOT NULL REFERENCES accounts(acco_id),
      tran_to_acco_id UUID NOT NULL REFERENCES accounts(acco_id),
      tran_amount NUMERIC(19, 4) NOT NULL CHECK (tran_amount > 0),
      tran_currency_id UUID NOT NULL REFERENCES currency(curr_id),
      tran_description TEXT,
      tran_date DATE NOT NULL,
      tran_created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      tran_deleted_at TIMESTAMPTZ,
      CONSTRAINT chk_transfer_different_accounts CHECK (tran_from_acco_id != tran_to_acco_id)
    )
  `.execute(db);

  await sql`
    CREATE INDEX IF NOT EXISTS idx_transfer_user
      ON transfer (tran_user_id) WHERE tran_deleted_at IS NULL
  `.execute(db);

  await sql`
    CREATE INDEX IF NOT EXISTS idx_transfer_date
      ON transfer (tran_user_id, tran_date DESC) WHERE tran_deleted_at IS NULL
  `.execute(db);
}

export async function down(db: Kysely<unknown>): Promise<void> {
  await sql`DROP INDEX IF EXISTS idx_transfer_date`.execute(db);
  await sql`DROP INDEX IF EXISTS idx_transfer_user`.execute(db);
  await sql`DROP TABLE IF EXISTS transfer`.execute(db);
}
