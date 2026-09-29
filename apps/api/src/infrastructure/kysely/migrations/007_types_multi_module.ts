import { sql, type Kysely } from "kysely";

/**
 * Migración `007_types_multi_module` — type_module TEXT → type_modules TEXT[].
 *
 * Razón: un `type` puede pertenecer a N módulos a la vez (ej. "Diseño" usable
 * tanto en el form de tareas como en el de ingresos). Si la lista está
 * vacía, el type aplica a TODOS los módulos (semántica "all modules").
 *
 * Cambios:
 *   1. ADD COLUMN type_modules TEXT[] NOT NULL DEFAULT '{}'
 *   2. Backfill: para cada row existente, type_modules = ARRAY[LOWER(type_module)]
 *      (cualquier valor preexistente con mayúsculas se normaliza a minúsculas,
 *       alineando con el set cerrado del use case: tasks/incomes/expenses/schedules).
 *   3. DROP COLUMN type_module
 *   4. CHECK constraint: cada elemento del array pertenece al set cerrado.
 *      Postgres permite CHECK sobre el contenido de un array con la función
 *      del operador `@>` y `<@`. Usamos `<@ ARRAY['tasks', ...]` para validar
 *      que todos los elementos del array estén en el set cerrado.
 *      Excepción: el array vacío '{}' (all-modules) NO está cubierto por
 *      esta CHECK, así que la constraint la excluimos explícitamente.
 *
 * Nota sobre el backfill:
 *   - El down (revert) recrea `type_module` con el primer elemento del
 *     array. Si el array tiene varios, se pierde el resto — aceptable
 *     porque en el down estamos deshaciendo el change, no preservando
 *     estado intermedio.
 *   - El `LOWER()` en el backfill normaliza datos viejos que pudieran
 *     estar en mayúsculas (ej. "Tasks" → "tasks"). Importante porque
 *     el contrato Zod usa `z.enum([...lowercase...])` y rechaza
 *     cualquier valor que no esté en minúsculas.
 */
const TYPE_MODULES_CLOSED_SET = ["tasks", "incomes", "expenses", "schedules"];

export async function up(db: Kysely<unknown>): Promise<void> {
  // 1. Nueva columna con default vacío (types nuevos = "all modules" por default).
  await sql`
    ALTER TABLE types
      ADD COLUMN type_modules TEXT[] NOT NULL DEFAULT '{}'::TEXT[]
  `.execute(db);

  // 2. Backfill desde type_module (existe desde migration 001).
  //    LOWER() normaliza cualquier valor preexistente al set cerrado.
  await sql`
    UPDATE types
      SET type_modules = ARRAY[LOWER(type_module)]
      WHERE type_module IS NOT NULL
  `.execute(db);

  // 3. CHECK constraint: cada elemento del array ∈ set cerrado, o array vacío.
  //    El array vacío '{}' queda fuera del CHECK (all-modules es semántica
  //    válida, no es un módulo específico).
  await sql`
    ALTER TABLE types
      ADD CONSTRAINT type_modules_in_closed_set
      CHECK (
        type_modules = '{}'
        OR type_modules <@ ARRAY[${sql.join(TYPE_MODULES_CLOSED_SET.map((m) => sql.lit(m)))}]
      )
  `.execute(db);

  // 4. Drop la columna vieja.
  await sql`ALTER TABLE types DROP COLUMN type_module`.execute(db);
}

export async function down(db: Kysely<unknown>): Promise<void> {
  // Revert: recrear type_module con el primer elemento del array.
  // Si el array está vacío, queda NULL (no hay "all modules" en el modelo viejo).
  await sql`
    ALTER TABLE types
      ADD COLUMN type_module TEXT
  `.execute(db);

  await sql`
    UPDATE types
      SET type_module = (type_modules[1])
      WHERE array_length(type_modules, 1) >= 1
  `.execute(db);

  await sql`ALTER TABLE types DROP CONSTRAINT IF EXISTS type_modules_in_closed_set`.execute(
    db,
  );
  await sql`ALTER TABLE types DROP COLUMN type_modules`.execute(db);
}
