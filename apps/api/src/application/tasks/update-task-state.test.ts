import { beforeEach, describe, expect, test } from "bun:test";
import { InMemoryTaskStateRepository, makeTaskState } from "./test-helpers";
import { UpdateTaskState } from "./update-task-state";
import { TaskStateNotFound } from "./errors";

describe("UpdateTaskState", () => {
  let repo: InMemoryTaskStateRepository;
  let sut: UpdateTaskState;

  beforeEach(() => {
    repo = new InMemoryTaskStateRepository();
    sut = new UpdateTaskState({ taskStateRepository: repo });
  });

  test("actualiza name y devuelve la columna", async () => {
    await repo.insert(makeTaskState({ id: "s1", userId: "u1", name: "Old" }));

    const updated = await sut.execute({
      userId: "u1",
      stateId: "s1",
      patch: { name: "New" },
    });

    expect(updated.name).toBe("New");
  });

  test("actualiza order", async () => {
    await repo.insert(makeTaskState({ id: "s1", userId: "u1", order: 0 }));

    const updated = await sut.execute({
      userId: "u1",
      stateId: "s1",
      patch: { order: 5 },
    });

    expect(updated.order).toBe(5);
  });

  test("lanza TaskStateNotFound si la columna no existe", async () => {
    await expect(
      sut.execute({ userId: "u1", stateId: "ghost", patch: { name: "X" } }),
    ).rejects.toBeInstanceOf(TaskStateNotFound);
  });

  test("lanza TaskStateNotFound si la columna pertenece a otro usuario", async () => {
    await repo.insert(makeTaskState({ id: "s1", userId: "u2" }));
    await expect(
      sut.execute({ userId: "u1", stateId: "s1", patch: { name: "X" } }),
    ).rejects.toBeInstanceOf(TaskStateNotFound);
  });
});
