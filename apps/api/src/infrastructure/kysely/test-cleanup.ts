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

export async function cleanupTasksTables(db: Database): Promise<void> {
  // Orden inverso de FKs (hijo → padre), sin tocar cleanupAuthTables.
  await db.deleteFrom("task_attachments").execute();
  await db.deleteFrom("attachments").execute();
  await db.deleteFrom("task").execute();
  await db.deleteFrom("type_categories_client").execute();
  await db.deleteFrom("client").execute();
}
