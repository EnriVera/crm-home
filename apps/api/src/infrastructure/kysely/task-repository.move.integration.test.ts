import { afterAll, beforeAll, describe, expect, test } from "bun:test";
import { sql } from "kysely";
import { cleanupAuthTables, cleanupTasksTables } from "./test-cleanup";
import { createDatabase, type Database } from "./database";
import { KyselyTaskRepository } from "./task-repository";

const databaseUrl = process.env.TEST_DATABASE_URL;

describe.skipIf(!databaseUrl)(
  "KyselyTaskRepository move (integration) — cross-column + rebalance",
  () => {
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

    async function seedGraph(): Promise<{
      userId: string;
      typeId: string;
      state1: string;
      state2: string;
    }> {
      const userId = crypto.randomUUID();
      await sql`INSERT INTO "user" (user_id, user_email, user_name)
                VALUES (${userId}, ${`wu5-move-${Date.now()}-${Math.random()}@example.com`}, 'WU5 move')`.execute(
        db,
      );
      const typeId = crypto.randomUUID();
      await sql`INSERT INTO types (type_id, type_user_id, type_name, type_module)
                VALUES (${typeId}, ${userId}, 'Task', 'tasks')`.execute(db);
      const state1 = crypto.randomUUID();
      const state2 = crypto.randomUUID();
      await sql`INSERT INTO task_state (tast_id, tast_user_id, tast_name, tast_order)
                VALUES (${state1}, ${userId}, 'Pendiente', 0),
                       (${state2}, ${userId}, 'Hecho', 1)`.execute(db);
      return { userId, typeId, state1, state2 };
    }

    test("moveTask cross-column persiste task_tast_id + persistOrders actualiza orden", async () => {
      const { userId, typeId, state1, state2 } = await seedGraph();
      const taskId = crypto.randomUUID();
      await repository.insert({
        id: taskId,
        userId,
        title: "Cross",
        description: null,
        clientId: null,
        typeId,
        categoryId: null,
        stateId: state1,
        kanbanOrder: 9999,
        createdAt: new Date(),
        updatedAt: new Date(),
        deletedAt: null,
      });

      await repository.moveTask({
        taskId,
        targetStateId: state2,
      });
      await repository.persistOrders([{ id: taskId, order: 1024 }]);

      const moved = await repository.findById(taskId);
      expect(moved?.stateId).toBe(state2);
      expect(moved?.kanbanOrder).toBe(1024);

      const state2Column = await repository.listByColumn(userId, state2);
      expect(state2Column.map((t) => t.id)).toContain(taskId);
    });

    test("rebalanceColumn aplica múltiplos de KANBAN_DEFAULT_STEP", async () => {
      const { userId, typeId, state1 } = await seedGraph();
      const ids = [
        crypto.randomUUID(),
        crypto.randomUUID(),
        crypto.randomUUID(),
      ];
      for (let i = 0; i < ids.length; i += 1) {
        await repository.insert({
          id: ids[i]!,
          userId,
          title: `T${i}`,
          description: null,
          clientId: null,
          typeId,
          categoryId: null,
          stateId: state1,
          kanbanOrder: (i + 1) * 1024,
          createdAt: new Date(),
          updatedAt: new Date(),
          deletedAt: null,
        });
      }

      // Rebalanceo: los 3 quedan en 1024, 2048, 3072.
      await repository.persistOrders([
        { id: ids[0]!, order: 1024 },
        { id: ids[1]!, order: 2048 },
        { id: ids[2]!, order: 3072 },
      ]);

      const column = await repository.listByColumn(userId, state1);
      const orders = column.map((t) => t.kanbanOrder).sort((a, b) => a - b);
      expect(orders).toEqual([1024, 2048, 3072]);
    });
  },
);
