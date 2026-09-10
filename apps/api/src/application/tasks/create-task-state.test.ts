import { beforeEach, describe, expect, test } from "bun:test";
import {
  FakeIdGenerator,
  FixedClock,
  InMemoryTaskStateRepository,
  makeTaskState,
} from "./test-helpers";
import { CreateTaskState } from "./create-task-state";

const NOW = new Date("2026-01-01T00:00:00.000Z");

describe("CreateTaskState", () => {
  let repo: InMemoryTaskStateRepository;
  let idGen: FakeIdGenerator;
  let sut: CreateTaskState;

  beforeEach(() => {
    repo = new InMemoryTaskStateRepository();
    idGen = new FakeIdGenerator();
    sut = new CreateTaskState({
      taskStateRepository: repo,
      idGenerator: idGen,
      clock: new FixedClock(NOW),
    });
  });

  test("primer estado del usuario recibe order = 0", async () => {
    const result = await sut.execute({ userId: "u1", name: "Pendiente" });
    expect(result.order).toBe(0);
    expect(result.name).toBe("Pendiente");
    expect(result.id).toBe("id-0001");
    expect(result.createdAt).toEqual(NOW);
  });

  test("estados subsiguientes reciben order = max + 1", async () => {
    await repo.insert(makeTaskState({ id: "s1", order: 0 }));
    await repo.insert(makeTaskState({ id: "s2", order: 1 }));

    const result = await sut.execute({ userId: "u1", name: "Hecho" });
    expect(result.order).toBe(2);
  });

  test("el orden no incluye columnas de otros usuarios", async () => {
    await repo.insert(makeTaskState({ id: "s1", userId: "u2", order: 5 }));

    const result = await sut.execute({ userId: "u1", name: "Pendiente" });
    expect(result.order).toBe(0);
  });
});
