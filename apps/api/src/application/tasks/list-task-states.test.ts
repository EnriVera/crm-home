import { beforeEach, describe, expect, test } from "bun:test";
import { InMemoryTaskStateRepository, makeTaskState } from "./test-helpers";
import { ListTaskStates } from "./list-task-states";

describe("ListTaskStates", () => {
  let repo: InMemoryTaskStateRepository;
  let sut: ListTaskStates;

  beforeEach(() => {
    repo = new InMemoryTaskStateRepository();
    sut = new ListTaskStates({ taskStateRepository: repo });
  });

  test("devuelve los task_state del usuario ordenados por order ascendente", async () => {
    await repo.insert(makeTaskState({ id: "s3", name: "Hecho", order: 2 }));
    await repo.insert(makeTaskState({ id: "s1", name: "Pendiente", order: 0 }));
    await repo.insert(makeTaskState({ id: "s2", name: "En curso", order: 1 }));

    const result = await sut.execute({ userId: "u1" });
    expect(result.map((r) => r.id)).toEqual(["s1", "s2", "s3"]);
  });

  test("excluye task_state de otros usuarios", async () => {
    await repo.insert(makeTaskState({ id: "s1", userId: "u1", order: 0 }));
    await repo.insert(makeTaskState({ id: "s2", userId: "u2", order: 1 }));

    const result = await sut.execute({ userId: "u1" });
    expect(result.map((r) => r.id)).toEqual(["s1"]);
  });
});
