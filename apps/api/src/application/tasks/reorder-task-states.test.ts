import { beforeEach, describe, expect, test } from "bun:test";
import {
  InMemoryTaskStateRepository,
  InMemoryTransactionManager,
  makeTaskState,
} from "./test-helpers";
import { ReorderTaskStates } from "./reorder-task-states";
import { Unauthorized } from "./errors";

describe("ReorderTaskStates", () => {
  let repo: InMemoryTaskStateRepository;
  let tx: InMemoryTransactionManager;
  let sut: ReorderTaskStates;

  beforeEach(() => {
    repo = new InMemoryTaskStateRepository();
    tx = new InMemoryTransactionManager();
    sut = new ReorderTaskStates({
      taskStateRepository: repo,
      transactionManager: tx,
    });
  });

  test("aplica el reorden atómicamente", async () => {
    await repo.insert(makeTaskState({ id: "s1", userId: "u1", order: 0 }));
    await repo.insert(makeTaskState({ id: "s2", userId: "u1", order: 1 }));
    await repo.insert(makeTaskState({ id: "s3", userId: "u1", order: 2 }));

    await sut.execute({
      userId: "u1",
      stateOrders: [
        { id: "s3", order: 0 },
        { id: "s1", order: 1 },
        { id: "s2", order: 2 },
      ],
    });

    expect((await repo.findById("s1"))?.order).toBe(1);
    expect((await repo.findById("s2"))?.order).toBe(2);
    expect((await repo.findById("s3"))?.order).toBe(0);
  });

  test("rechaza reorden parcial con Unauthorized", async () => {
    await repo.insert(makeTaskState({ id: "s1", userId: "u1", order: 0 }));
    await repo.insert(makeTaskState({ id: "s2", userId: "u1", order: 1 }));

    await expect(
      sut.execute({
        userId: "u1",
        stateOrders: [{ id: "s1", order: 5 }],
      }),
    ).rejects.toBeInstanceOf(Unauthorized);
  });

  test("rechaza si stateOrders contiene IDs de otros usuarios", async () => {
    await repo.insert(makeTaskState({ id: "s1", userId: "u1", order: 0 }));
    await repo.insert(makeTaskState({ id: "s2", userId: "u2", order: 1 }));

    await expect(
      sut.execute({
        userId: "u1",
        stateOrders: [
          { id: "s1", order: 0 },
          { id: "s2", order: 1 },
        ],
      }),
    ).rejects.toBeInstanceOf(Unauthorized);
  });
});
