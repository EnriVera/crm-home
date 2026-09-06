import { Kysely, PostgresDialect } from "kysely";
import { Pool } from "pg";

// Sin tablas todavía: migraciones y schema diferidos al primer change de
// dominio (fuera de alcance del scaffold).
// eslint-disable-next-line @typescript-eslint/no-empty-object-type
export type DatabaseSchema = {}

export type Database = Kysely<DatabaseSchema>;

// Adapter kysely (D4): lazy por construcción — NO se instancia en el
// arranque; el primer change de dominio lo invocará desde su composition root.
export function createDatabase(
  url: string = process.env.DATABASE_URL ?? "",
): Database {
  return new Kysely<DatabaseSchema>({
    dialect: new PostgresDialect({
      pool: new Pool({ connectionString: url }),
    }),
  });
}
