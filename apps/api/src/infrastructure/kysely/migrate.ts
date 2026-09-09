import { FileMigrationProvider, Migrator } from "kysely/migration";
import path from "node:path";
import { createDatabase } from "./database";

async function migrate() {
  const databaseUrl = process.env.DATABASE_URL ?? "";
  if (!databaseUrl) {
    throw new Error("DATABASE_URL is required");
  }

  const db = createDatabase(databaseUrl);
  const migrator = new Migrator({
    db,
    provider: new FileMigrationProvider({
      fs: await import("node:fs/promises"),
      path,
      migrationFolder: path.join(
        import.meta.dirname,
        "migrations",
      ),
    }),
  });

  const { error, results } = await migrator.migrateToLatest();

  if (results) {
    for (const result of results) {
      if (result.status === "Success") {
        console.log(`Migration ${result.migrationName} applied successfully`);
      } else if (result.status === "Error") {
        console.error(`Migration ${result.migrationName} failed`);
      } else if (result.status === "NotExecuted") {
        console.log(`Migration ${result.migrationName} not executed`);
      }
    }
  }

  await db.destroy();

  if (error) {
    console.error(error);
    process.exit(1);
  }
}

migrate();
