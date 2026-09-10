import { beforeEach, describe, expect, test } from "bun:test";
import { InMemoryTaskRepository, makeTask } from "./test-helpers";
import { GetTask } from "./get-task";
import { TaskNotFound } from "./errors";

describe("GetTask", () => {
  let repo: InMemoryTaskRepository;
  let sut: GetTask;

  beforeEach(() => {
    repo = new InMemoryTaskRepository();
    sut = new GetTask({ taskRepository: repo });
  });

  test("devuelve la task cuando existe y pertenece al usuario", async () => {
    const t = makeTask({ id: "t1", userId: "u1", title: "Hello" });
    await repo.insert(t);

    const result = await sut.execute({ userId: "u1", taskId: "t1" });
    expect(result.id).toBe("t1");
    expect(result.title).toBe("Hello");
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
