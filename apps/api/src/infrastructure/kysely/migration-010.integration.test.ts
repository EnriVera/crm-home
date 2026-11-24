import { afterAll, beforeAll, describe, expect, test } from "bun:test";
import { sql } from "kysely";
import { cleanupAuthTables, cleanupTasksTables } from "./test-cleanup";
import { describeIntegration, openTestDatabase } from "./test-db.helper";
import type { Database } from "./database";
import { KyselyTaskRepository } from "./task-repository";
import { KyselyTaskStateRepository } from "./task-state-repository";
import { KyselyCategoryRepository } from "./category-repository";
import { KyselyTypeRepository } from "./type-repository";
import type { TaskRow } from "../../domain/types";

/**
 * Integración de los campos que agregó la migración 010:
 * `task_due_date` (vencimiento), `tast_color` / `type_color` / `cate_color`
 * (color de dato).
 *
 * La prueba es que el dato LLEGA y VUELVE: no alcanza con que la columna
 * exista, tiene que persistir el valor exacto y el mapper lo tiene que
 * leer como el dominio lo espera.
 */
describeIntegration("migración 010: vencimiento y colores (integration)", () => {
  let db: Database;
  let taskRepository: KyselyTaskRepository;
  let taskStateRepository: KyselyTaskStateRepository;
  let categoryRepository: KyselyCategoryRepository;
  let typeRepository: KyselyTypeRepository;

  beforeAll(async () => {
    db = await openTestDatabase();
    taskRepository = new KyselyTaskRepository(db);
    taskStateRepository = new KyselyTaskStateRepository(db);
    categoryRepository = new KyselyCategoryRepository(db);
    typeRepository = new KyselyTypeRepository(db);
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
              VALUES (${userId}, ${`wu10-${Date.now()}-${Math.random()}@example.com`}, 'WU10')`.execute(
      db,
    );
    return userId;
  }

  async function seedType(userId: string): Promise<string> {
    const typeId = crypto.randomUUID();
    await sql`INSERT INTO types (type_id, type_user_id, type_name, type_modules)
              VALUES (${typeId}, ${userId}, 'Task', '{tasks}')`.execute(db);
    return typeId;
  }

  async function seedState(userId: string): Promise<string> {
    const stateId = crypto.randomUUID();
    await sql`INSERT INTO task_state (tast_id, tast_user_id, tast_name, tast_order)
              VALUES (${stateId}, ${userId}, 'Pendiente', 0)`.execute(db);
    return stateId;
  }

  function makeTask(
    userId: string,
    typeId: string,
    stateId: string,
    dueDate: Date | null,
  ): TaskRow {
    return {
      id: crypto.randomUUID(),
      userId,
      title: "Con vencimiento",
      description: null,
      clientId: null,
      typeId,
      categoryId: null,
      stateId,
      kanbanOrder: 0,
      dueDate,
      createdAt: new Date(0),
      updatedAt: new Date(0),
      deletedAt: null,
    };
  }

  test("el vencimiento persiste y vuelve con el instante exacto", async () => {
    const userId = await seedUser();
    const typeId = await seedType(userId);
    const stateId = await seedState(userId);
    const dueDate = new Date("2026-12-31T15:30:00.000Z");

    const task = makeTask(userId, typeId, stateId, dueDate);
    await taskRepository.insert(task);

    const stored = await taskRepository.findById(task.id);
    expect(stored?.dueDate).toBeInstanceOf(Date);
    expect(stored?.dueDate?.toISOString()).toBe(
      "2026-12-31T15:30:00.000Z",
    );
  });

  test("el vencimiento se puede quitar (patch a null)", async () => {
    const userId = await seedUser();
    const typeId = await seedType(userId);
    const stateId = await seedState(userId);
    const dueDate = new Date("2026-12-31T15:30:00.000Z");

    const task = makeTask(userId, typeId, stateId, dueDate);
    await taskRepository.insert(task);

    await taskRepository.update(task.id, { dueDate: null });

    const stored = await taskRepository.findById(task.id);
    expect(stored?.dueDate).toBeNull();
  });

  test("una task sin vencimiento guarda null", async () => {
    const userId = await seedUser();
    const typeId = await seedType(userId);
    const stateId = await seedState(userId);

    const task = makeTask(userId, typeId, stateId, null);
    await taskRepository.insert(task);

    const stored = await taskRepository.findById(task.id);
    expect(stored?.dueDate).toBeNull();
  });

  test("el color de dato del estado persiste y vuelve", async () => {
    const userId = await seedUser();
    const stateId = await seedState(userId);

    await taskStateRepository.update(stateId, { color: "data-amber" });

    const stored = await taskStateRepository.findById(stateId);
    expect(stored?.color).toBe("data-amber");
  });

  test("el color de dato del tipo persiste y vuelve", async () => {
    const userId = await seedUser();
    const typeId = await seedType(userId);

    await typeRepository.update({
      userId,
      typeId,
      color: "data-purple",
    });

    const stored = await typeRepository.findById({ userId, typeId });
    expect(stored?.color).toBe("data-purple");
  });

  test("el color de dato de la categoría persiste y vuelve", async () => {
    const userId = await seedUser();
    const typeId = await seedType(userId);

    const created = await categoryRepository.insert({
      userId,
      name: "General",
      typeId,
      color: "data-cyan",
    });
    expect(created.color).toBe("data-cyan");

    const stored = await categoryRepository.findById({
      userId,
      categoryId: created.id,
    });
    expect(stored?.color).toBe("data-cyan");
  });

  test("el color se puede quitar (patch a null)", async () => {
    const userId = await seedUser();
    const typeId = await seedType(userId);

    const created = await categoryRepository.insert({
      userId,
      name: "General",
      typeId,
      color: "data-pink",
    });

    await categoryRepository.update({
      userId,
      categoryId: created.id,
      color: null,
    });

    const stored = await categoryRepository.findById({
      userId,
      categoryId: created.id,
    });
    expect(stored?.color).toBeNull();
  });
});
