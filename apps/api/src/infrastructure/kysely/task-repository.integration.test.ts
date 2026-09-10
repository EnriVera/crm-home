import { afterAll, beforeAll, describe, expect, test } from "bun:test";
import { sql } from "kysely";
import { cleanupAuthTables, cleanupTasksTables } from "./test-cleanup";
import { createDatabase, type Database } from "./database";
import { KyselyTaskRepository } from "./task-repository";

const databaseUrl = process.env.TEST_DATABASE_URL;

describe.skipIf(!databaseUrl)("KyselyTaskRepository (integration)", () => {
  let db: Database;
  let repository: KyselyTaskRepository;

  beforeAll(async () => {
    if (!databaseUrl) return;
    db = createDatabase(databaseUrl);
    repository = new KyselyTaskRepository(db);
  });

  afterAll(async () => {
    if (!db) return;
    await cleanupTasksTables(db);
    await cleanupAuthTables(db);
    await db.destroy();
  });

  async function seedUser(): Promise<string> {
    const userId = crypto.randomUUID();
    await sql`INSERT INTO "user" (user_id, user_email, user_name)
              VALUES (${userId}, ${`wu5-task-${Date.now()}-${Math.random()}@example.com`}, 'WU5')`.execute(
      db,
    );
    return userId;
  }

  async function seedTaskState(userId: string): Promise<string> {
    const stateId = crypto.randomUUID();
    await sql`INSERT INTO task_state (tast_id, tast_user_id, tast_name, tast_order)
              VALUES (${stateId}, ${userId}, 'Pendiente', 0)`.execute(db);
    return stateId;
  }

  async function seedTypeAndCategory(
    userId: string,
  ): Promise<{ typeId: string; cateId: string }> {
    const typeId = crypto.randomUUID();
    const cateId = crypto.randomUUID();
    await sql`INSERT INTO types (type_id, type_user_id, type_name, type_module)
              VALUES (${typeId}, ${userId}, 'Task', 'tasks')`.execute(db);
    await sql`INSERT INTO categories (cate_id, cate_user_id, cate_name, cate_type_id)
              VALUES (${cateId}, ${userId}, 'General', ${typeId})`.execute(db);
    return { typeId, cateId };
  }

  test("CRUD básico: insert + findById + listByUser", async () => {
    const userId = await seedUser();
    const stateId = await seedTaskState(userId);
    const { typeId } = await seedTypeAndCategory(userId);

    const taskId = crypto.randomUUID();
    await repository.insert({
      id: taskId,
      userId,
      title: "Tarea A",
      description: null,
      clientId: null,
      typeId,
      categoryId: null,
      stateId,
      kanbanOrder: 1024,
      createdAt: new Date(),
      updatedAt: new Date(),
      deletedAt: null,
    });

    const found = await repository.findById(taskId);
    expect(found?.title).toBe("Tarea A");

    const all = await repository.listByUser(userId);
    expect(all.map((t) => t.id)).toContain(taskId);
  });

  test("listByColumn filtra por userId + stateId y ordena por kanbanOrder", async () => {
    const userId = await seedUser();
    const stateId = await seedTaskState(userId);
    const { typeId } = await seedTypeAndCategory(userId);

    const ids = [crypto.randomUUID(), crypto.randomUUID(), crypto.randomUUID()];
    for (let i = 0; i < ids.length; i += 1) {
      await repository.insert({
        id: ids[i]!,
        userId,
        title: `Task ${i}`,
        description: null,
        clientId: null,
        typeId,
        categoryId: null,
        stateId,
        kanbanOrder: (i + 1) * 1024,
        createdAt: new Date(),
        updatedAt: new Date(),
        deletedAt: null,
      });
    }

    const column = await repository.listByColumn(userId, stateId);
    expect(column.map((t) => t.id)).toEqual(ids);
  });

  test("soft-delete excluye de listByUser pero conserva findById", async () => {
    const userId = await seedUser();
    const stateId = await seedTaskState(userId);
    const { typeId } = await seedTypeAndCategory(userId);

    const taskId = crypto.randomUUID();
    await repository.insert({
      id: taskId,
      userId,
      title: "Borrable",
      description: null,
      clientId: null,
      typeId,
      categoryId: null,
      stateId,
      kanbanOrder: 1024,
      createdAt: new Date(),
      updatedAt: new Date(),
      deletedAt: null,
    });

    await repository.softDelete(taskId);

    const all = await repository.listByUser(userId);
    expect(all.find((t) => t.id === taskId)).toBeUndefined();

    const direct = await repository.findById(taskId);
    expect(direct?.deletedAt).toBeInstanceOf(Date);
  });
});
