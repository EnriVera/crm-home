import { sql, type Kysely } from "kysely";

/**
 * Migración `010_profile_due_date_and_data_colors` — tres brechas del
 * contrato de backend que el frontend ya necesita:
 *
 * 1. Perfil editable: `user_studio TEXT NULL` (el estudio del usuario).
 *    `user_email` sigue siendo read-only (la identidad es el email y hay
 *    una UNIQUE constraint sobre él).
 *
 * 2. Vencimiento de tareas: `task_due_date TIMESTAMPTZ NULL` (PRD-v4 §13
 *    línea 812: es `timestamptz`, NO `date` — la task tiene hora, no sólo
 *    día) + el índice PARCIAL `idx_task_due` que sólo indexa las tasks con
 *    fecha y no borradas (mismo criterio que `idx_task_user`).
 *
 * 3. Color de dato: `type_color` / `cate_color` / `tast_color TEXT NULL`.
 *    NO son hex sueltos: son TOKENS del design system (PRD-v4 §11.3) —
 *    `data-blue` … `data-gray`, 8 valores — que el frontend resuelve a
 *    `var(--color-data-*)`. La columna es TEXT (no un enum de Postgres)
 *    para que el set cerrado se valide en el contrato zod y no en la DB.
 *
 * Es **idempotente**: `ADD COLUMN IF NOT EXISTS` + `CREATE INDEX IF NOT
 * EXISTS`. Se puede correr dos veces sobre la misma base sin efecto.
 *
 * El `down` dropea lo que esta migración agregó (si existe).
 */
export async function up(db: Kysely<unknown>): Promise<void> {
  // 1. Perfil editable: el estudio del usuario.
  await sql`
    ALTER TABLE "user"
      ADD COLUMN IF NOT EXISTS user_studio TEXT
  `.execute(db);

  // 2. Vencimiento de tareas.
  await sql`
    ALTER TABLE task
      ADD COLUMN IF NOT EXISTS task_due_date TIMESTAMPTZ
  `.execute(db);

  await sql`
    CREATE INDEX IF NOT EXISTS idx_task_due
      ON task (task_user_id, task_due_date)
      WHERE task_deleted_at IS NULL AND task_due_date IS NOT NULL
  `.execute(db);

  // 3. Color de dato (tokens del design system, no hex).
  await sql`
    ALTER TABLE types
      ADD COLUMN IF NOT EXISTS type_color TEXT
  `.execute(db);

  await sql`
    ALTER TABLE categories
      ADD COLUMN IF NOT EXISTS cate_color TEXT
  `.execute(db);

  await sql`
    ALTER TABLE task_state
      ADD COLUMN IF NOT EXISTS tast_color TEXT
  `.execute(db);
}

export async function down(db: Kysely<unknown>): Promise<void> {
  await sql`ALTER TABLE task_state DROP COLUMN IF EXISTS tast_color`.execute(
    db,
  );
  await sql`ALTER TABLE categories DROP COLUMN IF EXISTS cate_color`.execute(
    db,
  );
  await sql`ALTER TABLE types DROP COLUMN IF EXISTS type_color`.execute(db);
  await sql`DROP INDEX IF EXISTS idx_task_due`.execute(db);
  await sql`ALTER TABLE task DROP COLUMN IF EXISTS task_due_date`.execute(db);
  await sql`ALTER TABLE "user" DROP COLUMN IF EXISTS user_studio`.execute(db);
}
