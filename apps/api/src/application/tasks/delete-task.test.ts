import { beforeEach, describe, expect, test } from "bun:test";
import { InMemoryTaskRepository, makeTask } from "./test-helpers";
import { DeleteTask } from "./delete-task";
import { TaskNotFound } from "./errors";

describe("DeleteTask", () => {
  let repo: InMemoryTaskRepository;
  let sut: DeleteTask;

  beforeEach(() => {
    repo = new InMemoryTaskRepository();
    sut = new DeleteTask({ taskRepository: repo });
  });

  test("soft-delete: setea deletedAt y la fila queda marcada", async () => {
    await repo.insert(makeTask({ id: "t1", userId: "u1" }));

    await sut.execute({ userId: "u1", taskId: "t1" });

    const stored = await repo.findById("t1");
    expect(stored?.deletedAt).toBeInstanceOf(Date);
  });

  test("lanza TaskNotFound cuando la task no existe", async () => {
    await expect(
      sut.execute({ userId: "u1", taskId: "missing" }),
    ).rejects.toBeInstanceOf(TaskNotFound);
  });

  test("lanza TaskNotFound cuando la task pertenece a otro usuario", async () => {
    await repo.insert(makeTask({ id: "t1", userId: "u2" }));
    await expect(
      sut.execute({ userId: "u1", taskId: "t1" }),
    ).rejects.toBeInstanceOf(TaskNotFound);
  });
});
