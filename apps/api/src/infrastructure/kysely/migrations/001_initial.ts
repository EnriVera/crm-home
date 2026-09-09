import { sql, type Kysely } from "kysely";

/**
 * Migración inicial de backend-auth.
 *
 * Crea los lookups globales seedeados, las tablas de auth, las tablas de soporte
 * para el seed transaccional del registro implícito y sus índices/FKs.
 *
 * `down` es destructivo: dropea todas las tablas del change. Solo aplica en este
 * stage sin datos productivos.
 */
export async function up(db: Kysely<unknown>): Promise<void> {
  const coreAppId = sql<string>`'01943f20-7c73-7d20-9471-0e4b5f0d3a1c'`;
  const arsCurrencyId = sql<string>`'01943f20-7c73-7d20-9471-0e4b5f0d3a1d'`;

  // Lookups globales
  await sql`
    CREATE TABLE sino (
      sin_id SMALLINT PRIMARY KEY,
      sin_value SMALLINT NOT NULL,
      sin_name TEXT NOT NULL
    )
  `.execute(db);

  await sql`
    INSERT INTO sino (sin_id, sin_value, sin_name) VALUES
      (0, 0, 'No / Inactive / Pending'),
      (1, 1, 'Yes / Active / Sent')
  `.execute(db);

  await sql`
    CREATE TABLE apps (
      apps_id UUID PRIMARY KEY,
      apps_name TEXT NOT NULL
    )
  `.execute(db);

  await sql`
    INSERT INTO apps (apps_id, apps_name) VALUES (${coreAppId}, 'Core')
  `.execute(db);

  await sql`
    CREATE TABLE currency (
      curr_id UUID PRIMARY KEY,
      curr_name TEXT NOT NULL,
      curr_symbol TEXT NOT NULL,
      curr_decimals SMALLINT NOT NULL DEFAULT 2
    )
  `.execute(db);

  await sql`
    INSERT INTO currency (curr_id, curr_name, curr_symbol, curr_decimals) VALUES
      (${arsCurrencyId}, 'Peso argentino', '$', 2)
  `.execute(db);

  // Auth
  await sql`
    CREATE TABLE "user" (
      user_id UUID PRIMARY KEY,
      user_email TEXT NOT NULL UNIQUE,
      user_name TEXT NOT NULL,
      user_theme TEXT NOT NULL DEFAULT 'system',
      user_sino_emailverificado SMALLINT NOT NULL DEFAULT 0 REFERENCES sino(sin_id),
      user_accepted_terms_at TIMESTAMPTZ,
      user_terms_version TEXT,
      user_created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      user_updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      user_deleted_at TIMESTAMPTZ
    )
  `.execute(db);

  await sql`
    CREATE TABLE login (
      logi_id UUID PRIMARY KEY,
      logi_email TEXT NOT NULL,
      logi_code TEXT NOT NULL,
      logi_expires_at TIMESTAMPTZ NOT NULL,
      logi_attempts SMALLINT NOT NULL DEFAULT 0,
      logi_created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      logi_consumed_at TIMESTAMPTZ
    )
  `.execute(db);

  await sql`
    CREATE INDEX idx_login_email_created ON login (logi_email, logi_created_at)
  `.execute(db);

  await sql`
    CREATE TABLE session (
      sess_id UUID PRIMARY KEY,
      sess_user_id UUID NOT NULL REFERENCES "user"(user_id),
      sess_token_hash TEXT NOT NULL,
      sess_expires_at TIMESTAMPTZ NOT NULL,
      sess_created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      sess_deleted_at TIMESTAMPTZ
    )
  `.execute(db);

  await sql`
    CREATE INDEX idx_session_user ON session (sess_user_id)
  `.execute(db);

  await sql`
    CREATE UNIQUE INDEX idx_session_token_hash ON session (sess_token_hash) WHERE sess_deleted_at IS NULL
  `.execute(db);

  await sql`
    CREATE TABLE email_sending (
      emse_id UUID PRIMARY KEY,
      emse_login_id UUID NOT NULL REFERENCES login(logi_id),
      emse_from TEXT NOT NULL,
      emse_to TEXT NOT NULL,
      emse_subject TEXT NOT NULL,
      emse_body TEXT NOT NULL,
      emse_status TEXT NOT NULL DEFAULT 'pending',
      emse_created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      emse_sent_at TIMESTAMPTZ
    )
  `.execute(db);

  await sql`
    CREATE INDEX idx_email_sending_status ON email_sending (emse_status, emse_created_at)
  `.execute(db);

  // Seed transaccional
  await sql`
    CREATE TABLE task_state (
      tast_id UUID PRIMARY KEY,
      tast_user_id UUID NOT NULL REFERENCES "user"(user_id),
      tast_name TEXT NOT NULL,
      tast_order SMALLINT NOT NULL,
      tast_created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      tast_deleted_at TIMESTAMPTZ,
      UNIQUE (tast_user_id, tast_order)
    )
  `.execute(db);

  await sql`
    CREATE TABLE accounts (
      acco_id UUID PRIMARY KEY,
      acco_user_id UUID NOT NULL REFERENCES "user"(user_id),
      acco_name TEXT NOT NULL,
      acco_icon TEXT,
      acco_color TEXT,
      acco_curr_id UUID NOT NULL REFERENCES currency(curr_id),
      acco_initial_amount NUMERIC(19, 4) NOT NULL DEFAULT 0,
      acco_created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      acco_deleted_at TIMESTAMPTZ
    )
  `.execute(db);

  await sql`
    CREATE TABLE types (
      type_id UUID PRIMARY KEY,
      type_user_id UUID NOT NULL REFERENCES "user"(user_id),
      type_name TEXT NOT NULL,
      type_module TEXT NOT NULL,
      type_created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      type_deleted_at TIMESTAMPTZ
    )
  `.execute(db);

  await sql`
    CREATE TABLE categories (
      cate_id UUID PRIMARY KEY,
      cate_user_id UUID NOT NULL REFERENCES "user"(user_id),
      cate_name TEXT NOT NULL,
      cate_type_id UUID NOT NULL REFERENCES types(type_id),
      cate_created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      cate_deleted_at TIMESTAMPTZ
    )
  `.execute(db);
}

export async function down(db: Kysely<unknown>): Promise<void> {
  // Orden inverso a la creación para respetar FKs.
  await sql`DROP TABLE IF EXISTS categories`.execute(db);
  await sql`DROP TABLE IF EXISTS types`.execute(db);
  await sql`DROP TABLE IF EXISTS accounts`.execute(db);
  await sql`DROP TABLE IF EXISTS task_state`.execute(db);
  await sql`DROP TABLE IF EXISTS email_sending`.execute(db);
  await sql`DROP TABLE IF EXISTS session`.execute(db);
  await sql`DROP TABLE IF EXISTS login`.execute(db);
  await sql`DROP TABLE IF EXISTS "user"`.execute(db);
  await sql`DROP TABLE IF EXISTS currency`.execute(db);
  await sql`DROP TABLE IF EXISTS apps`.execute(db);
  await sql`DROP TABLE IF EXISTS sino`.execute(db);
}
