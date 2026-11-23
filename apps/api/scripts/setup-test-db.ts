/**
 * Setup de la base de datos de tests.
 *
 * Crea `crm_home_test` si no existe y aplica las migraciones pendientes.
 * Es idempotente: se puede correr las veces que haga falta.
 *
 * Uso (desde `apps/api`):
 *   bun run test:db:setup
 *
 * Es el mismo bootstrap que corre la suite automáticamente
 * (`ensureTestSchema` en src/infrastructure/kysely/test-db.ts); este script
 * existe para poder preparar la base de forma explícita y ver el resultado.
 */
import { ensureTestSchema, resolveTestDatabaseUrl } from "../src/infrastructure/kysely/test-db";

async function main(): Promise<void> {
  const url = resolveTestDatabaseUrl();
  console.log(`[setup-test-db] base de test: ${url}`);
  await ensureTestSchema(url);
  console.log("[setup-test-db] lista: base creada y migraciones aplicadas");
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
