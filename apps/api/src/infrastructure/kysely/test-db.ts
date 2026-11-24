import path from "node:path";
import { FileMigrationProvider, Migrator } from "kysely/migration";
import { sql, type Kysely } from "kysely";
import { createDatabase } from "./database";

/**
 * Guardarraíl de la base de datos usada por la suite de tests.
 *
 * Por qué existe: los tests de integración BORRAN tablas (ver
 * `test-cleanup.ts`). Si la URL que usan apunta a la base de desarrollo
 * (`crm_home`), la suite borra los datos del dueño. Ya pasó: `bun run test`
 * vació `crm_home` por completo porque `apps/api/.env.test` apuntaba a la
 * base de desarrollo.
 *
 * Este módulo es la única puerta de entrada a la base de test. Exige:
 *   1. que `TEST_DATABASE_URL` esté seteada (si no, el test FALLA — no se
 *      saltea en silencio; un skip esconde bugs),
 *   2. que el nombre de la base termine en `_test`,
 *   3. que la base conectada de verdad (`current_database()`) sea la de test,
 *      no la de desarrollo,
 *   4. que la base tenga el esquema (aplica las migraciones si falta).
 *
 * No importa `bun:test`: lo usan tanto los tests como `test-cleanup.ts`.
 */

export const TEST_DATABASE_URL_ENV = "TEST_DATABASE_URL";

/** Sufijo obligatorio del nombre de la base de datos de test. */
export const TEST_DATABASE_NAME_SUFFIX = "_test";

/**
 * Bases de desarrollo conocidas: nunca pueden ser el destino de la suite.
 * El sufijo `_test` ya las excluiría, pero la lista explícita documenta la
 * intención y protege si alguien renombra la base de desarrollo.
 */
const FORBIDDEN_DATABASE_NAMES = new Set(["crm_home"]);

/** Tablas cuyo existence prueba que el esquema está aplicado. */
const REQUIRED_SCHEMA_TABLES = ["user", "task_state", "task", "kysely_migration"];

/**
 * Columnas cuyo existence prueba que el esquema está aplicado.
 *
 * Hace falta además de las tablas: un test de migración hace `down`/`up`
 * sobre la tabla que crea (ej. `002_tasks` dropea y recrea `task`), y la
 * versión recreada NO tiene las columnas que agregaron las migraciones
 * posteriores (ej. `task_due_date` de la 010). El ledger de kysely dice
 * "aplicado" — la fila existe — así que `migrateToLatest()` no las vuelve a
 * agregar y el fallo aparece después como un confuso
 * "column task_due_date does not exist".
 */
const REQUIRED_SCHEMA_COLUMNS: Record<string, string[]> = {
  user: ["user_studio"],
  task: ["task_due_date"],
  task_state: ["tast_color"],
  types: ["type_color"],
  categories: ["cate_color"],
};

const SAFE_DATABASE_NAME = /^[A-Za-z0-9_]+$/;

/** Nombre de la base extraído de una URL de postgres. */
export function parseDatabaseName(url: string): string {
  try {
    const pathname = new URL(url).pathname;
    return decodeURIComponent(pathname.replace(/^\//, ""));
  } catch {
    return "";
  }
}

/** ¿El nombre corresponde a una base de test válida? */
export function isTestDatabaseName(name: string): boolean {
  if (!name) return false;
  if (FORBIDDEN_DATABASE_NAMES.has(name)) return false;
  return name.endsWith(TEST_DATABASE_NAME_SUFFIX);
}

/**
 * Verifica que la URL apunte a una base de test. Lanza con un mensaje
 * accionable si no es así.
 */
export function assertIsTestDatabaseUrl(url: string): string {
  const name = parseDatabaseName(url);
  if (!name) {
    throw new Error(
      `[test-db] ${TEST_DATABASE_URL_ENV} no es una URL de postgres válida: "${url}".\n` +
        `         Ejemplo: postgres://crm:crm@localhost:5432/crm_home_test`,
    );
  }
  if (FORBIDDEN_DATABASE_NAMES.has(name)) {
    throw new Error(
      `[test-db] ${TEST_DATABASE_URL_ENV} apunta a la base de DESARROLLO ("${name}").\n` +
        `         Los tests borran tablas: esta base nunca puede ser el destino.\n` +
        `         Usá una base de test (sufijo "${TEST_DATABASE_NAME_SUFFIX}"), por ejemplo "${name}_test".`,
    );
  }
  if (!name.endsWith(TEST_DATABASE_NAME_SUFFIX)) {
    throw new Error(
      `[test-db] ${TEST_DATABASE_URL_ENV} apunta a "${name}", que no termina en "${TEST_DATABASE_NAME_SUFFIX}".\n` +
        `         Los tests borran tablas: solo pueden correr contra una base de test.\n` +
        `         Configurá una base de test, por ejemplo "${name}_test".`,
    );
  }
  return name;
}

/**
 * Resuelve la URL de la base de test desde el entorno. Lanza si falta o si
 * apunta a la base equivocada.
 */
export function resolveTestDatabaseUrl(): string {
  const url = process.env[TEST_DATABASE_URL_ENV]?.trim();
  if (!url) {
    throw new Error(
      `[test-db] ${TEST_DATABASE_URL_ENV} no está seteada: los tests de integración no pueden correr.\n` +
        `         Los tests de integración NO se saltean en silencio (un skip esconde bugs).\n` +
        `         Setup: cp .env.test.example .env.test   (desde apps/api)\n` +
        `         y creá la base: CREATE DATABASE crm_home_test;`,
    );
  }
  assertIsTestDatabaseUrl(url);
  return url;
}

/**
 * Verifica contra la CONEXIÓN real (no contra la URL) que la base conectada
 * sea la de test. Una URL puede mentir; `current_database()` no.
 */
export async function assertConnectedDatabaseIsTest(
  db: Kysely<any>,
): Promise<string> {
  const result = await sql<{ current_database: string }>`
    SELECT current_database() AS current_database
  `.execute(db);
  const name = result.rows[0]?.current_database ?? "";
  if (!isTestDatabaseName(name)) {
    throw new Error(
      `[test-db] la conexión apunta a "${name}", que NO es una base de test (debe terminar en "${TEST_DATABASE_NAME_SUFFIX}").\n` +
        `         Los tests borran tablas: se aborta antes de tocar nada.`,
    );
  }
  return name;
}

/** Crea la base de test si no existe (el rol de dev tiene CREATEDB). */
async function ensureDatabaseExists(url: string, name: string): Promise<void> {
  if (!SAFE_DATABASE_NAME.test(name)) {
    throw new Error(`[test-db] nombre de base no seguro: "${name}"`);
  }

  const probe = createDatabase(url);
  try {
    await sql`SELECT 1`.execute(probe);
    return;
  } catch (error) {
    const code = (error as { code?: string }).code;
    if (code !== "3D000") throw error;
  } finally {
    await probe.destroy();
  }

  // No existe (3D000): se crea contra la base de mantenimiento `postgres`.
  const adminUrl = new URL(url);
  adminUrl.pathname = "/postgres";
  const admin = createDatabase(adminUrl.toString());
  try {
    await sql.raw(`CREATE DATABASE "${name}"`).execute(admin);
    console.log(`[test-db] base de test "${name}" creada`);
  } finally {
    await admin.destroy();
  }
}

/**
 * Deja la base de test lista: existe, tiene el esquema y es la base de test.
 * Idempotente — se puede llamar antes de cada suite de integración.
 */
export async function ensureTestSchema(url: string): Promise<void> {
  const name = assertIsTestDatabaseUrl(url);
  await ensureDatabaseExists(url, name);

  const db = createDatabase(url);
  try {
    await assertConnectedDatabaseIsTest(db);

    const migrator = new Migrator({
      db,
      provider: new FileMigrationProvider({
        fs: await import("node:fs/promises"),
        path,
        migrationFolder: path.join(import.meta.dirname, "migrations"),
      }),
    });
    const { error } = await migrator.migrateToLatest();
    if (error) throw error;

    await assertSchemaPresent(db);
  } finally {
    await db.destroy();
  }
}

/**
 * Confirma que el esquema quedó aplicado.
 *
 * Caso real: un test de migración dropea tablas y falla antes de
 * restaurarlas. El ledger de kysely dice "aplicado" (la fila existe) pero
 * las tablas no: `migrateToLatest()` no las vuelve a crear porque la
 * migración ya está registrada. Sin esta comprobación, el fallo aparece
 * después como un confuso "relation does not exist".
 *
 * Cuando falta algo se repara sola: se borra el ledger y se re-aplican las
 * migraciones. Es seguro porque solo se toca la base de test (ya verificado
 * con `current_database()`) y las migraciones son idempotentes salvo la
 * 001, que se re-aplica desde cero sobre una base limpia.
 */
async function assertSchemaPresent(db: Kysely<any>): Promise<void> {
  const missing = await listMissingTables(db);
  const missingColumns = await listMissingColumns(db);
  if (missing.length === 0 && missingColumns.length === 0) return;

  console.log(
    `[test-db] esquema incompleto (faltan: ${missing.join(", ")}${
      missingColumns.length > 0 ? `, columnas: ${missingColumns.join(", ")}` : ""
    }): se re-aplican las migraciones`,
  );
  await repairSchema(db);
  const stillMissing = await listMissingTables(db);
  const stillMissingColumns = await listMissingColumns(db);
  if (stillMissing.length > 0 || stillMissingColumns.length > 0) {
    throw new Error(
      `[test-db] el esquema de la base de test está incompleto (faltan: ${stillMissing.join(", ")}${
        stillMissingColumns.length > 0
          ? `, columnas: ${stillMissingColumns.join(", ")}`
          : ""
      }).\n` +
        `         Recreá la base de test y aplicá las migraciones:\n` +
        `           DROP DATABASE crm_home_test; CREATE DATABASE crm_home_test;\n` +
        `           DATABASE_URL=postgres://crm:crm@localhost:5432/crm_home_test bun run db:migrate`,
    );
  }
}

async function listMissingTables(db: Kysely<any>): Promise<string[]> {
  const result = await sql<{ table_name: string }>`
    SELECT table_name FROM information_schema.tables WHERE table_schema = 'public'
  `.execute(db);
  const present = new Set(result.rows.map((row) => row.table_name));
  return REQUIRED_SCHEMA_TABLES.filter((table) => !present.has(table));
}

/**
 * Las columnas requeridas que no existen en la base de test.
 *
 * Se consulta `information_schema.columns` en vez de adivinar: una tabla
 * que no existe no aporta columnas, y su error se reporta como tabla
 * faltante (no como columna faltante).
 */
async function listMissingColumns(db: Kysely<any>): Promise<string[]> {
  const result = await sql<{ table_name: string; column_name: string }>`
    SELECT table_name, column_name
      FROM information_schema.columns
     WHERE table_schema = 'public'
  `.execute(db);
  const present = new Set(
    result.rows.map((row) => `${row.table_name}.${row.column_name}`),
  );
  const missing: string[] = [];
  for (const [table, columns] of Object.entries(REQUIRED_SCHEMA_COLUMNS)) {
    for (const column of columns) {
      if (!present.has(`${table}.${column}`)) {
        missing.push(`${table}.${column}`);
      }
    }
  }
  return missing;
}

/**
 * Re-aplica el esquema desde cero.
 *
 * Se borran TODAS las tablas del schema `public` antes de re-aplicar: la
 * migración 001 crea sus tablas sin `IF NOT EXISTS`, así que re-aplicarla
 * sobre una base con tablas existentes fallaría con "relation already
 * exists". Es seguro porque sólo se toca la base de test (ya verificado con
 * `current_database()`) y su contenido es desechable por definición.
 */
async function repairSchema(db: Kysely<any>): Promise<void> {
  await sql`
    DO $$
    DECLARE r RECORD;
    BEGIN
      FOR r IN (SELECT tablename FROM pg_tables WHERE schemaname = 'public')
      LOOP
        EXECUTE format('DROP TABLE IF EXISTS public.%I CASCADE', r.tablename);
      END LOOP;
    END $$;
  `.execute(db);

  const migrator = new Migrator({
    db,
    provider: new FileMigrationProvider({
      fs: await import("node:fs/promises"),
      path,
      migrationFolder: path.join(import.meta.dirname, "migrations"),
    }),
  });
  const { error } = await migrator.migrateToLatest();
  if (error) throw error;
}
