import { beforeEach, describe, expect, test } from "bun:test";
import { InMemoryTaskRepository, makeTask } from "./test-helpers";
import { UpdateTask } from "./update-task";
import { TaskNotFound } from "./errors";

describe("UpdateTask", () => {
  let repo: InMemoryTaskRepository;
  let sut: UpdateTask;

  beforeEach(() => {
    repo = new InMemoryTaskRepository();
    sut = new UpdateTask({ taskRepository: repo });
  });

  test("aplica el patch y devuelve la task actualizada", async () => {
    await repo.insert(makeTask({ id: "t1", userId: "u1", title: "Old" }));

    const updated = await sut.execute({
      userId: "u1",
      taskId: "t1",
      patch: { title: "New", description: "Updated" },
    });

    expect(updated.title).toBe("New");
    expect(updated.description).toBe("Updated");
  });

  test("lanza TaskNotFound cuando la task no existe", async () => {
    await expect(
      sut.execute({
        userId: "u1",
        taskId: "missing",
        patch: { title: "X" },
      }),
    ).rejects.toBeInstanceOf(TaskNotFound);
  });

  test("lanza TaskNotFound cuando la task pertenece a otro usuario", async () => {
    await repo.insert(makeTask({ id: "t1", userId: "u2" }));
    await expect(
      sut.execute({
        userId: "u1",
        taskId: "t1",
        patch: { title: "X" },
      }),
    ).rejects.toBeInstanceOf(TaskNotFound);
  });
});
