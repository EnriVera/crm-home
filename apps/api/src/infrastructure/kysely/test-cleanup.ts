import type { Database } from "./database";

export async function cleanupAuthTables(db: Database): Promise<void> {
  await db.deleteFrom("email_sending").execute();
  await db.deleteFrom("session").execute();
  await db.deleteFrom("login").execute();
  await db.deleteFrom("categories").execute();
  await db.deleteFrom("types").execute();
  await db.deleteFrom("task_state").execute();
  await db.deleteFrom("accounts").execute();
  await db.deleteFrom("user").execute();
}
