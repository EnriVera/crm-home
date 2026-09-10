import { sql, type Kysely } from "kysely";

/**
 * Migración `002_tasks` del change `tasks` (PR-A).
 *
 * Crea las cinco tablas del módulo de tareas siguiendo el PRD §11
 * (prefijos de 4 letras, FKs del hijo al padre) y los índices necesarios
 * para los queries del módulo. Es **idempotente** (CREATE TABLE/INDEX
 * IF NOT EXISTS) y NO recrea `task_state` — esa tabla ya existe desde
 * `001_initial.ts`.
 *
 * El `down` es destructivo: dropea las cinco tablas del change en orden
 * inverso al de creación, respetando las FKs. Solo aplica en este stage
 * sin datos productivos.
 */
export async function up(db: Kysely<unknown>): Promise<void> {
  // 1. client (nullable FK target de task.task_clie_id)
  await sql`
    CREATE TABLE IF NOT EXISTS client (
      clie_id UUID PRIMARY KEY,
      clie_user_id UUID NOT NULL REFERENCES "user"(user_id),
      clie_name TEXT NOT NULL,
      clie_email TEXT,
      clie_areaphone TEXT,
      clie_phone TEXT,
      clie_created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      clie_updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      clie_deleted_at TIMESTAMPTZ
    )
  `.execute(db);

  await sql`
    CREATE INDEX IF NOT EXISTS idx_client_user
      ON client (clie_user_id) WHERE clie_deleted_at IS NULL
  `.execute(db);

  // 2. type_categories_client (join table; NULL en tccl_clie_id = GLOBAL)
  await sql`
    CREATE TABLE IF NOT EXISTS type_categories_client (
      tccl_id UUID PRIMARY KEY,
      tccl_user_id UUID NOT NULL REFERENCES "user"(user_id),
      tccl_type_id UUID NOT NULL REFERENCES types(type_id),
      tccl_cate_id UUID NOT NULL REFERENCES categories(cate_id),
      tccl_clie_id UUID REFERENCES client(clie_id),
      tccl_created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      tccl_updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      tccl_deleted_at TIMESTAMPTZ,
      CONSTRAINT uq_tccl_combo UNIQUE NULLS NOT DISTINCT
        (tccl_user_id, tccl_type_id, tccl_cate_id, tccl_clie_id)
    )
  `.execute(db);

  // 3. attachments (Fase 2 — tablas creadas; sin endpoint en MVP).
  await sql`
    CREATE TABLE IF NOT EXISTS attachments (
      atta_id UUID PRIMARY KEY,
      atta_user_id UUID NOT NULL REFERENCES "user"(user_id),
      atta_s3id TEXT NOT NULL,
      atta_title TEXT NOT NULL,
      atta_format TEXT NOT NULL,
      atta_created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      atta_updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      atta_deleted_at TIMESTAMPTZ
    )
  `.execute(db);

  // 4. task_attachments (Fase 2 — join table; PK compuesta).
  await sql`
    CREATE TABLE IF NOT EXISTS task_attachments (
      taat_task_id UUID NOT NULL REFERENCES task(task_id),
      taat_atta_id UUID NOT NULL REFERENCES attachments(atta_id),
      taat_created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      PRIMARY KEY (taat_task_id, taat_atta_id)
    )
  `.execute(db);

  // 5. task (núcleo del change).
  await sql`
    CREATE TABLE IF NOT EXISTS task (
      task_id UUID PRIMARY KEY,
      task_user_id UUID NOT NULL REFERENCES "user"(user_id),
      task_title TEXT NOT NULL,
      task_description TEXT,
      task_clie_id UUID REFERENCES client(clie_id),
      task_type_id UUID NOT NULL REFERENCES types(type_id),
      task_cate_id UUID REFERENCES categories(cate_id),
      task_tast_id UUID NOT NULL REFERENCES task_state(tast_id),
      task_kanban_order DOUBLE PRECISION NOT NULL DEFAULT 0,
      task_created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      task_updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      task_deleted_at TIMESTAMPTZ
    )
  `.execute(db);

  await sql`
    CREATE INDEX IF NOT EXISTS idx_task_user
      ON task (task_user_id) WHERE task_deleted_at IS NULL
  `.execute(db);

  await sql`
    CREATE INDEX IF NOT EXISTS idx_task_kanban
      ON task (task_user_id, task_tast_id, task_kanban_order)
  `.execute(db);
}

export async function down(db: Kysely<unknown>): Promise<void> {
  // DESTRUCTIVO — solo stage único, sin datos productivos.
  // Orden inverso al de creación, respetando FKs.
  await sql`DROP TABLE IF EXISTS task_attachments`.execute(db);
  await sql`DROP TABLE IF EXISTS attachments`.execute(db);
  await sql`DROP TABLE IF EXISTS task`.execute(db);
  await sql`DROP TABLE IF EXISTS type_categories_client`.execute(db);
  await sql`DROP TABLE IF EXISTS client`.execute(db);
  // task_state NO se dropea aquí: existe desde 001_initial.ts.
}
