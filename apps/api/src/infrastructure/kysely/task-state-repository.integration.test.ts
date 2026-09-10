import { afterAll, beforeAll, describe, expect, test } from "bun:test";
import { sql } from "kysely";
import { cleanupAuthTables, cleanupTasksTables } from "./test-cleanup";
import { createDatabase, type Database } from "./database";
import { KyselyTaskStateRepository } from "./task-state-repository";

const databaseUrl = process.env.TEST_DATABASE_URL;

describe.skipIf(!databaseUrl)("KyselyTaskStateRepository (integration)", () => {
  let db: Database;
  let repository: KyselyTaskStateRepository;

  beforeAll(async () => {
    if (!databaseUrl) return;
    db = createDatabase(databaseUrl);
    repository = new KyselyTaskStateRepository(db);
  });

  afterAll(async () => {
    if (!db) return;
    await cleanupTasksTables(db);
    await cleanupAuthTables(db);
    await db.destroy();
  });

  test("CRUD básico: insert + findById + findByUser", async () => {
    const userId = crypto.randomUUID();
    const stateId = crypto.randomUUID();
    await sql`INSERT INTO "user" (user_id, user_email, user_name)
                VALUES (${userId}, ${`wu5-state-${Date.now()}@example.com`}, 'WU5')`.execute(
      db,
    );

    await repository.insert({
      id: stateId,
      userId,
      name: "Pendiente",
      order: 0,
      createdAt: new Date(),
      deletedAt: null,
    });

    const found = await repository.findById(stateId);
    expect(found?.name).toBe("Pendiente");

    const all = await repository.findByUser(userId);
    expect(all.length).toBeGreaterThanOrEqual(1);
  });

  test("soft-delete excluye de findByUser pero conserva fila en findById", async () => {
    const userId = crypto.randomUUID();
    const stateId = crypto.randomUUID();
    await sql`INSERT INTO "user" (user_id, user_email, user_name)
                VALUES (${userId}, ${`wu5-soft-${Date.now()}@example.com`}, 'WU5 soft')`.execute(
      db,
    );

    await repository.insert({
      id: stateId,
      userId,
      name: "Borrable",
      order: 0,
      createdAt: new Date(),
      deletedAt: null,
    });

    await repository.softDelete(stateId);

    const all = await repository.findByUser(userId);
    expect(all.find((s) => s.id === stateId)).toBeUndefined();

    const direct = await repository.findById(stateId);
    expect(direct?.deletedAt).toBeInstanceOf(Date);
  });

  test("update aplica patch parcial (sólo name)", async () => {
    const userId = crypto.randomUUID();
    const stateId = crypto.randomUUID();
    await sql`INSERT INTO "user" (user_id, user_email, user_name)
                VALUES (${userId}, ${`wu5-upd-${Date.now()}@example.com`}, 'WU5 upd')`.execute(
      db,
    );

    await repository.insert({
      id: stateId,
      userId,
      name: "Old",
      order: 0,
      createdAt: new Date(),
      deletedAt: null,
    });

    await repository.update(stateId, { name: "New" });
    const updated = await repository.findById(stateId);
    expect(updated?.name).toBe("New");
    expect(updated?.order).toBe(0);
  });
});
