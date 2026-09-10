import { afterAll, beforeAll, describe, expect, test } from "bun:test";
import { sql, type Kysely } from "kysely";
import { createDatabase, type Database } from "../database";
import { cleanupTasksTables } from "../test-cleanup";
import { down, up } from "./002_tasks";

const databaseUrl = process.env.TEST_DATABASE_URL;

interface ForeignKeyRow {
  table_name: string;
  column_name: string;
  foreign_table_name: string;
  foreign_column_name: string;
}

interface ForeignKey {
  table: string;
  column: string;
  foreignTable: string;
  foreignColumn: string;
}

async function listTables(db: Kysely<unknown>): Promise<string[]> {
  const result = await sql<{ table_name: string }>`
    SELECT table_name FROM information_schema.tables
    WHERE table_schema = 'public'
  `.execute(db);
  return result.rows.map((row) => row.table_name);
}

async function listIndexes(db: Kysely<unknown>): Promise<string[]> {
  const result = await sql<{ indexname: string }>`
    SELECT indexname FROM pg_indexes WHERE schemaname = 'public'
  `.execute(db);
  return result.rows.map((row) => row.indexname);
}

async function listForeignKeys(db: Kysely<unknown>): Promise<ForeignKey[]> {
  const result = await sql<ForeignKeyRow>`
    SELECT
      tc.table_name,
      kcu.column_name,
      ccu.table_name AS foreign_table_name,
      ccu.column_name AS foreign_column_name
    FROM information_schema.table_constraints AS tc
    JOIN information_schema.key_column_usage AS kcu
      ON tc.constraint_name = kcu.constraint_name
      AND tc.table_schema = kcu.table_schema
    JOIN information_schema.constraint_column_usage AS ccu
      ON ccu.constraint_name = tc.constraint_name
      AND ccu.table_schema = tc.table_schema
    WHERE tc.constraint_type = 'FOREIGN KEY'
      AND tc.table_schema = 'public'
  `.execute(db);
  return result.rows.map((row) => ({
    table: row.table_name,
    column: row.column_name,
    foreignTable: row.foreign_table_name,
    foreignColumn: row.foreign_column_name,
  }));
}

function expectForeignKey(
  fks: ForeignKey[],
  params: {
    table: string;
    column: string;
    foreignTable: string;
    foreignColumn: string;
  },
): void {
  const found = fks.some(
    (fk) =>
      fk.table === params.table &&
      fk.column === params.column &&
      fk.foreignTable === params.foreignTable &&
      fk.foreignColumn === params.foreignColumn,
  );
  if (!found) {
    throw new Error(
      `Missing FK ${params.table}.${params.column} -> ${params.foreignTable}.${params.foreignColumn}; observed=${JSON.stringify(fks)}`,
    );
  }
  expect(found).toBe(true);
}

describe.skipIf(!databaseUrl)("002_tasks migration (integration)", () => {
  let db: Database;
  let unknownDb: Kysely<unknown>;

  beforeAll(async () => {
    if (!databaseUrl) return;
    db = createDatabase(databaseUrl);
    unknownDb = db as unknown as Kysely<unknown>;
  });

  afterAll(async () => {
    if (!db) return;
    await db.destroy();
  });

  test("up(db) crea las 5 tablas, los 3 índices y las FKs del change", async () => {
    await down(unknownDb);
    await up(unknownDb);

    const tables = await listTables(unknownDb);
    for (const expected of [
      "client",
      "type_categories_client",
      "attachments",
      "task_attachments",
      "task",
    ]) {
      expect(tables).toContain(expected);
    }

    const indexes = await listIndexes(unknownDb);
    for (const expected of [
      "idx_client_user",
      "idx_task_user",
      "idx_task_kanban",
    ]) {
      expect(indexes).toContain(expected);
    }

    const fks = await listForeignKeys(unknownDb);
    expectForeignKey(fks, {
      table: "task",
      column: "task_user_id",
      foreignTable: "user",
      foreignColumn: "user_id",
    });
    expectForeignKey(fks, {
      table: "task",
      column: "task_tast_id",
      foreignTable: "task_state",
      foreignColumn: "tast_id",
    });
    expectForeignKey(fks, {
      table: "task",
      column: "task_type_id",
      foreignTable: "types",
      foreignColumn: "type_id",
    });
    expectForeignKey(fks, {
      table: "task",
      column: "task_cate_id",
      foreignTable: "categories",
      foreignColumn: "cate_id",
    });
    expectForeignKey(fks, {
      table: "task",
      column: "task_clie_id",
      foreignTable: "client",
      foreignColumn: "clie_id",
    });
    expectForeignKey(fks, {
      table: "type_categories_client",
      column: "tccl_user_id",
      foreignTable: "user",
      foreignColumn: "user_id",
    });
    expectForeignKey(fks, {
      table: "task_attachments",
      column: "taat_task_id",
      foreignTable: "task",
      foreignColumn: "task_id",
    });
    expectForeignKey(fks, {
      table: "task_attachments",
      column: "taat_atta_id",
      foreignTable: "attachments",
      foreignColumn: "atta_id",
    });

    await cleanupTasksTables(db);
  });

  test("up(db) es idempotente — la segunda corrida no falla", async () => {
    await down(unknownDb);
    await up(unknownDb);
    // Segunda corrida: los IF NOT EXISTS defienden la duplicación.
    await up(unknownDb);

    const tables = await listTables(unknownDb);
    expect(tables).toContain("task");

    await cleanupTasksTables(db);
  });

  test("down(db) dropea las 5 tablas nuevas y deja task_state intacto", async () => {
    await up(unknownDb);

    // Sembrar task_state (pertenece a 001_initial) y confirmar que down no lo toca.
    const userId = "01943f20-7c73-7d20-9471-0e4b5f0d3a99";
    const tastId = "01943f20-7c73-7d20-9471-0e4b5f0d3a98";
    await sql`INSERT INTO "user" (user_id, user_email, user_name)
              VALUES (${userId}, 'wu2-down@example.com', 'WU2 down')`.execute(
      unknownDb,
    );
    await sql`INSERT INTO task_state (tast_id, tast_user_id, tast_name, tast_order)
              VALUES (${tastId}, ${userId}, 'Pendiente', 0)`.execute(unknownDb);

    await down(unknownDb);

    const tables = await listTables(unknownDb);
    for (const dropped of [
      "client",
      "type_categories_client",
      "attachments",
      "task_attachments",
      "task",
    ]) {
      expect(tables).not.toContain(dropped);
    }
    // task_state pertenece a 001_initial.ts: no debe ser tocado por el down del 002.
    expect(tables).toContain("task_state");
  });

  test("down(db) respeta orden inverso de FKs con datos sembrados", async () => {
    await up(unknownDb);

    // Sembrar el grafo completo para forzar al down a recorrer el orden inverso.
    const userId = "01943f20-7c73-7d20-9471-0e4b5f0d3a97";
    const typeId = "01943f20-7c73-7d20-9471-0e4b5f0d3a96";
    const cateId = "01943f20-7c73-7d20-9471-0e4b5f0d3a95";
    const tastId = "01943f20-7c73-7d20-9471-0e4b5f0d3a94";
    const clieId = "01943f20-7c73-7d20-9471-0e4b5f0d3a93";
    const attaId = "01943f20-7c73-7d20-9471-0e4b5f0d3a92";
    const taskId = "01943f20-7c73-7d20-9471-0e4b5f0d3a91";

    await sql`INSERT INTO "user" (user_id, user_email, user_name)
              VALUES (${userId}, 'wu2-fk@example.com', 'WU2 FK')`.execute(
      unknownDb,
    );
    await sql`INSERT INTO task_state (tast_id, tast_user_id, tast_name, tast_order)
              VALUES (${tastId}, ${userId}, 'Pendiente', 0)`.execute(unknownDb);
    await sql`INSERT INTO types (type_id, type_user_id, type_name, type_module)
              VALUES (${typeId}, ${userId}, 'Task', 'tasks')`.execute(unknownDb);
    await sql`INSERT INTO categories (cate_id, cate_user_id, cate_name, cate_type_id)
              VALUES (${cateId}, ${userId}, 'General', ${typeId})`.execute(
      unknownDb,
    );
    await sql`INSERT INTO client (clie_id, clie_user_id, clie_name)
              VALUES (${clieId}, ${userId}, 'Acme')`.execute(unknownDb);
    await sql`INSERT INTO attachments (atta_id, atta_user_id, atta_s3id, atta_title, atta_format)
              VALUES (${attaId}, ${userId}, 's3://key', 'doc', 'pdf')`.execute(
      unknownDb,
    );
    await sql`INSERT INTO task (task_id, task_user_id, task_title, task_type_id, task_tast_id, task_kanban_order)
              VALUES (${taskId}, ${userId}, 'Test', ${typeId}, ${tastId}, 1024)`.execute(
      unknownDb,
    );
    await sql`INSERT INTO task_attachments (taat_task_id, taat_atta_id)
              VALUES (${taskId}, ${attaId})`.execute(unknownDb);

    // El down debe ejecutarse sin error de FK residual.
    await down(unknownDb);

    const tables = await listTables(unknownDb);
    expect(tables).not.toContain("task");
    expect(tables).not.toContain("task_attachments");
    expect(tables).not.toContain("attachments");
    expect(tables).not.toContain("client");
    expect(tables).not.toContain("type_categories_client");
  });
});
