import { beforeAll, describe } from "bun:test";
import { createDatabase, type Database } from "./database";
import {
  assertConnectedDatabaseIsTest,
  ensureTestSchema,
  resolveTestDatabaseUrl,
} from "./test-db";

/**
 * Gate de las suites de integración.
 *
 * Antes: `describe.skipIf(!databaseUrl)` — sin `TEST_DATABASE_URL` la suite
 * se saltaba en silencio y el `bun run test` raíz quedaba VERDE sin haber
 * corrido una sola integración. Ese skip escondió el bug de `auth.logout`.
 *
 * Ahora: la suite FALLA con un mensaje explícito si la base de test no está
 * configurada o apunta a la base de desarrollo. Un fallo ruidoso es
 * preferible a un verde que no probó nada.
 */
export function describeIntegration(label: string, fn: () => void): void {
  describe(label, () => {
    let databaseUrl: string;

    // Registrado ANTES que los hooks del archivo de test (que se registran
    // cuando se ejecuta `fn()`): así el esquema de la base de test está
    // listo antes de que cualquier test toque la base.
    beforeAll(async () => {
      // Resuelve y valida la URL (lanza si falta o si no es base de test).
      databaseUrl = resolveTestDatabaseUrl();
      // Crea la base si falta y aplica las migraciones si el esquema no está.
      await ensureTestSchema(databaseUrl);
      // El composition root lee `process.env.DATABASE_URL` en algunos
      // puntos: se apunta a la base de test durante la corrida.
      process.env.DATABASE_URL = databaseUrl;
    });

    fn();
  });
}

/**
 * Abre una conexión a la base de test con el guardarraíl aplicado.
 * Los cleanups la usan: si la URL no es de test, NO se borra nada.
 */
export async function openTestDatabase(): Promise<Database> {
  const url = resolveTestDatabaseUrl();
  const db = createDatabase(url);
  await assertConnectedDatabaseIsTest(db);
  return db;
}
