import { beforeEach, describe, expect, test } from "bun:test";
import {
  FakeIdGenerator,
  FixedClock,
  InMemoryTaskRepository,
  InMemoryTaskStateRepository,
  makeTaskState,
} from "./test-helpers";
import { KANBAN_DEFAULT_STEP } from "./constants";
import { CreateTask } from "./create-task";
import { TaskStateNotFound } from "./errors";

const NOW = new Date("2026-01-01T00:00:00.000Z");

describe("CreateTask", () => {
  let taskRepo: InMemoryTaskRepository;
  let stateRepo: InMemoryTaskStateRepository;
  let idGen: FakeIdGenerator;
  let sut: CreateTask;

  beforeEach(() => {
    taskRepo = new InMemoryTaskRepository();
    stateRepo = new InMemoryTaskStateRepository();
    idGen = new FakeIdGenerator();
    sut = new CreateTask({
      taskRepository: taskRepo,
      taskStateRepository: stateRepo,
      idGenerator: idGen,
      clock: new FixedClock(NOW),
    });
  });

  test("crea la task al final de la columna Pendiente con order = KANBAN_DEFAULT_STEP cuando está vacía", async () => {
    await stateRepo.insert(makeTaskState({ id: "state-1" }));

    const result = await sut.execute({
      userId: "u1",
      title: "Mi primer task",
      typeId: "type-1",
      stateId: "state-1",
    });

    expect(result.id).toBe("id-0001");
    expect(result.kanbanOrder).toBe(KANBAN_DEFAULT_STEP);
    expect(result.createdAt).toEqual(NOW);
    expect(result.title).toBe("Mi primer task");

    const stored = await taskRepo.findById("id-0001");
    expect(stored?.stateId).toBe("state-1");
  });

  test("ordena al final con max + KANBAN_DEFAULT_STEP cuando la columna no está vacía", async () => {
    await stateRepo.insert(makeTaskState({ id: "state-1" }));
    await taskRepo.insert({
      id: "id-existing",
      userId: "u1",
      title: "Existing",
      description: null,
      clientId: null,
      typeId: "type-1",
      categoryId: null,
      stateId: "state-1",
      kanbanOrder: 1024,
      createdAt: new Date(0),
      updatedAt: new Date(0),
      deletedAt: null,
    });
    idGen = new FakeIdGenerator(); // reset counter
    sut = new CreateTask({
      taskRepository: taskRepo,
      taskStateRepository: stateRepo,
      idGenerator: idGen,
      clock: new FixedClock(NOW),
    });

    const result = await sut.execute({
      userId: "u1",
      title: "Nuevo",
      typeId: "type-1",
      stateId: "state-1",
    });

    expect(result.kanbanOrder).toBe(1024 + KANBAN_DEFAULT_STEP);
  });

  test("lanza TaskStateNotFound si la stateId no existe", async () => {
    await expect(
      sut.execute({
        userId: "u1",
        title: "X",
        typeId: "type-1",
        stateId: "ghost",
      }),
    ).rejects.toBeInstanceOf(TaskStateNotFound);
  });

  test("lanza TaskStateNotFound si la state pertenece a otro usuario", async () => {
    await stateRepo.insert(makeTaskState({ id: "state-1", userId: "u2" }));
    await expect(
      sut.execute({
        userId: "u1",
        title: "X",
        typeId: "type-1",
        stateId: "state-1",
      }),
    ).rejects.toBeInstanceOf(TaskStateNotFound);
  });
});
