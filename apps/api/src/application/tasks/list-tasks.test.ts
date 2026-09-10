import { beforeEach, describe, expect, test } from "bun:test";
import { InMemoryTaskRepository, makeTask } from "./test-helpers";
import { ListTasks } from "./list-tasks";

describe("ListTasks", () => {
  let repo: InMemoryTaskRepository;
  let sut: ListTasks;

  beforeEach(() => {
    repo = new InMemoryTaskRepository();
    sut = new ListTasks({ taskRepository: repo });
  });

  test("devuelve todas las tasks del usuario cuando no hay search", async () => {
    await repo.insert(makeTask({ id: "t1", title: "Alpha" }));
    await repo.insert(makeTask({ id: "t2", title: "Beta" }));

    const result = await sut.execute({ userId: "u1" });
    expect(result.map((r) => r.id).sort()).toEqual(["t1", "t2"]);
  });

  test("filtra por search (case-insensitive, substring sobre title)", async () => {
    await repo.insert(makeTask({ id: "t1", title: "Buy groceries" }));
    await repo.insert(makeTask({ id: "t2", title: "Pay rent" }));
    await repo.insert(makeTask({ id: "t3", title: "groceries for trip" }));

    const result = await sut.execute({ userId: "u1", search: "GROCERIES" });
    expect(result.map((r) => r.id).sort()).toEqual(["t1", "t3"]);
  });

  test("excluye tasks de otros usuarios", async () => {
    await repo.insert(makeTask({ id: "t1", userId: "u1", title: "Mine" }));
    await repo.insert(makeTask({ id: "t2", userId: "u2", title: "Theirs" }));

    const result = await sut.execute({ userId: "u1" });
    expect(result.map((r) => r.id)).toEqual(["t1"]);
  });
});
