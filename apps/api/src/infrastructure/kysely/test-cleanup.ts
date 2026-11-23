import type { Database } from "./database";
import { assertConnectedDatabaseIsTest } from "./test-db";

/**
 * Limpieza de tablas para los tests de integración.
 *
 * REGLA DURA: estos borradores solo pueden correr contra la base de test.
 * Antes de borrar nada se verifica con `current_database()` que la conexión
 * real está en una base cuyo nombre termina en `_test`. Si no, se aborta
 * con un error — nunca se vacía la base de desarrollo.
 *
 * El borrado es total (sin filtro por usuario) a propósito: los tests
 * siembran usuarios de prueba con ids fijos y un borrado parcial dejaría
 * basura que rompe la corrida siguiente.
 */

async function assertSafeToClean(db: Database): Promise<void> {
  await assertConnectedDatabaseIsTest(db);
}

export async function cleanupAuthTables(db: Database): Promise<void> {
  await assertSafeToClean(db);
  await db.deleteFrom("email_sending").execute();
  await db.deleteFrom("session").execute();
  await db.deleteFrom("login").execute();
  await db.deleteFrom("categories").execute();
  await db.deleteFrom("types").execute();
  await db.deleteFrom("task_state").execute();
  // Orden inverso de FKs: los movimientos apuntan a la cuenta (y la
  // schedule también), así que se borran antes que `accounts`.
  await db.deleteFrom("income").execute();
  await db.deleteFrom("expense").execute();
  await db.deleteFrom("transfer").execute();
  await db.deleteFrom("schedule").execute();
  await db.deleteFrom("accounts").execute();
  await db.deleteFrom("user").execute();
}

export async function cleanupTasksTables(db: Database): Promise<void> {
  await assertSafeToClean(db);
  // Orden inverso de FKs (hijo → padre), sin tocar cleanupAuthTables.
  await db.deleteFrom("task_attachments").execute();
  await db.deleteFrom("attachments").execute();
  await db.deleteFrom("task").execute();
  await db.deleteFrom("type_categories_client").execute();
  await db.deleteFrom("client").execute();
}
