import { beforeEach, describe, expect, test } from "bun:test";
import { InMemoryTaskStateRepository, makeTaskState } from "./test-helpers";
import { DeleteTaskState } from "./delete-task-state";
import { TaskStateNotFound } from "./errors";

describe("DeleteTaskState", () => {
  let repo: InMemoryTaskStateRepository;
  let sut: DeleteTaskState;

  beforeEach(() => {
    repo = new InMemoryTaskStateRepository();
    sut = new DeleteTaskState({ taskStateRepository: repo });
  });

  test("soft-delete: setea deletedAt en la columna", async () => {
    await repo.insert(makeTaskState({ id: "s1", userId: "u1" }));

    await sut.execute({ userId: "u1", stateId: "s1" });

    const stored = await repo.findById("s1");
    expect(stored?.deletedAt).toBeInstanceOf(Date);
  });

  test("lanza TaskStateNotFound si la columna no existe", async () => {
    await expect(
      sut.execute({ userId: "u1", stateId: "ghost" }),
    ).rejects.toBeInstanceOf(TaskStateNotFound);
  });

  test("lanza TaskStateNotFound si la columna pertenece a otro usuario", async () => {
    await repo.insert(makeTaskState({ id: "s1", userId: "u2" }));
    await expect(
      sut.execute({ userId: "u1", stateId: "s1" }),
    ).rejects.toBeInstanceOf(TaskStateNotFound);
  });
});
