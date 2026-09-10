import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import type { Transaction } from "../../domain/ports/transaction";
import type { TransactionManager } from "../../domain/ports/transaction-manager";
import { InvalidKanbanOrder, TaskNotFound } from "./errors";
import { KANBAN_DEFAULT_STEP } from "./constants";
import { MoveTask } from "./move-task";
import {
  InMemoryTaskRepository,
  InMemoryTaskStateRepository,
  InMemoryTelemetry,
  InMemoryTransactionManager,
  makeTask,
} from "./test-helpers";

// ───────────────────────────────────────────────────────────────────────────
// Tests
// ───────────────────────────────────────────────────────────────────────────

describe("MoveTask", () => {
  let taskRepo: InMemoryTaskRepository;
  let taskStateRepo: InMemoryTaskStateRepository;
  let txManager: InMemoryTransactionManager;
  let telemetry: InMemoryTelemetry;
  let sut: MoveTask;

  beforeEach(() => {
    taskRepo = new InMemoryTaskRepository();
    taskStateRepo = new InMemoryTaskStateRepository();
    txManager = new InMemoryTransactionManager();
    telemetry = new InMemoryTelemetry();
    sut = new MoveTask({
      taskRepository: taskRepo,
      taskStateRepository: taskStateRepo,
      transactionManager: txManager,
      telemetry,
    });
  });

  afterEach(() => {
    // Reset explícito por claridad.
    taskRepo.rows.clear();
  });

  test("lanza TaskNotFound si la task no existe", async () => {
    await expect(
      sut.execute({
        userId: "u1",
        taskId: "missing",
        targetStateId: "state-1",
        prevTaskId: "a",
        nextTaskId: "b",
      }),
    ).rejects.toBeInstanceOf(TaskNotFound);
  });

  test("lanza InvalidKanbanOrder si no se especifica ningún vecino", async () => {
    await taskRepo.insert(makeTask({ id: "t1", kanbanOrder: 1024 }));
    await expect(
      sut.execute({
        userId: "u1",
        taskId: "t1",
        targetStateId: "state-1",
      }),
    ).rejects.toBeInstanceOf(InvalidKanbanOrder);
  });

  test("lanza InvalidKanbanOrder si el vecino no pertenece a la columna destino", async () => {
    await taskRepo.insert(
      makeTask({ id: "t1", kanbanOrder: 1024, stateId: "state-2" }),
    );
    await taskRepo.insert(
      makeTask({ id: "t2", kanbanOrder: 2048, stateId: "state-2" }),
    );
    await expect(
      sut.execute({
        userId: "u1",
        taskId: "t1",
        targetStateId: "state-1",
        prevTaskId: "t2",
        nextTaskId: "ghost",
      }),
    ).rejects.toBeInstanceOf(InvalidKanbanOrder);
  });

  // ────────────────────────────────────────────────────────────────────────
  // 6 escenarios kanban
  // ────────────────────────────────────────────────────────────────────────

  describe("6 escenarios kanban obligatorios", () => {
    test("(1) gap normal entre A=1024 y B=4096 → order = 2560, NO persistOrders de rebalance", async () => {
      await taskRepo.insert(makeTask({ id: "a", kanbanOrder: 1024 }));
      await taskRepo.insert(makeTask({ id: "b", kanbanOrder: 4096 }));
      await taskRepo.insert(
        makeTask({ id: "x", kanbanOrder: 2048, stateId: "state-2" }),
      );

      await sut.execute({
        userId: "u1",
        taskId: "x",
        targetStateId: "state-1",
        prevTaskId: "a",
        nextTaskId: "b",
      });

      const moved = await taskRepo.findById("x");
      expect(moved?.kanbanOrder).toBe(2560);
      expect(moved?.stateId).toBe("state-1");

      // Solo 1 persistOrders (el del move); no debe haber un segundo rebalance.
      const span = telemetry.spans[0]!;
      expect(span.attributes["task.kanban_order_rebalanced"]).toBeUndefined();
      expect(span.attributes["result.success"]).toBe(true);
    });

    test("(2) gap < 1e-6 (A=1024, B=1024.0000005) → persistOrders llamado con [{a,1024},{b,2048}] + span.rebalanced=true", async () => {
      await taskRepo.insert(makeTask({ id: "a", kanbanOrder: 1024 }));
      await taskRepo.insert(makeTask({ id: "b", kanbanOrder: 1024.0000005 }));
      await taskRepo.insert(
        makeTask({ id: "x", kanbanOrder: 0, stateId: "state-2" }),
      );

      await sut.execute({
        userId: "u1",
        taskId: "x",
        targetStateId: "state-1",
        prevTaskId: "a",
        nextTaskId: "b",
      });

      // Tras el rebalance, 'x' conserva su midpoint (entre a y b) y los otros
      // (a, b) reciben múltiplos de KANBAN_DEFAULT_STEP — quedan gaps estables
      // para futuras inserciones.
      const all = await taskRepo.listByColumn("u1", "state-1");
      const sorted = all.sort((p, q) => p.kanbanOrder - q.kanbanOrder);
      expect(sorted.map((r) => r.id)).toEqual(["a", "x", "b"]);
      expect(sorted.map((r) => r.kanbanOrder)).toEqual([
        KANBAN_DEFAULT_STEP,
        (KANBAN_DEFAULT_STEP + 1024.0000005) / 2,
        2 * KANBAN_DEFAULT_STEP,
      ]);

      const span = telemetry.spans[0]!;
      expect(span.attributes["task.kanban_order_rebalanced"]).toBe(true);
      expect(span.attributes["result.success"]).toBe(true);
    });

    test("(3) append al final → appendOrder", async () => {
      await taskRepo.insert(makeTask({ id: "a", kanbanOrder: 1024 }));
      await taskRepo.insert(makeTask({ id: "b", kanbanOrder: 2048 }));
      await taskRepo.insert(
        makeTask({ id: "x", kanbanOrder: 0, stateId: "state-2" }),
      );

      await sut.execute({
        userId: "u1",
        taskId: "x",
        targetStateId: "state-1",
        prevTaskId: "b",
      });

      const moved = await taskRepo.findById("x");
      // append: max(1024, 2048) + 1024 = 3072
      expect(moved?.kanbanOrder).toBe(3072);
      expect(moved?.stateId).toBe("state-1");
    });

    test("(4) prepend al inicio → prependOrder", async () => {
      await taskRepo.insert(makeTask({ id: "a", kanbanOrder: 1024 }));
      await taskRepo.insert(makeTask({ id: "b", kanbanOrder: 2048 }));
      await taskRepo.insert(
        makeTask({ id: "x", kanbanOrder: 0, stateId: "state-2" }),
      );

      await sut.execute({
        userId: "u1",
        taskId: "x",
        targetStateId: "state-1",
        nextTaskId: "a",
      });

      const moved = await taskRepo.findById("x");
      // prepend: min(1024, 2048) / 2 = 512
      expect(moved?.kanbanOrder).toBe(512);
      expect(moved?.stateId).toBe("state-1");
    });

    test("(5) cross-column → task_tast_id actualizado + orden estable", async () => {
      await taskRepo.insert(
        makeTask({ id: "a", kanbanOrder: 1024, stateId: "state-1" }),
      );
      await taskRepo.insert(
        makeTask({ id: "b", kanbanOrder: 2048, stateId: "state-1" }),
      );
      await taskRepo.insert(
        makeTask({ id: "c", kanbanOrder: 1024, stateId: "state-2" }),
      );
      await taskRepo.insert(
        makeTask({ id: "x", kanbanOrder: 9999, stateId: "state-1" }),
      );

      await sut.execute({
        userId: "u1",
        taskId: "x",
        targetStateId: "state-2",
        prevTaskId: "c",
      });

      const moved = await taskRepo.findById("x");
      expect(moved?.stateId).toBe("state-2");
      // append en state-2: max(1024) + 1024 = 2048
      expect(moved?.kanbanOrder).toBe(2048);

      const span = telemetry.spans[0]!;
      expect(span.attributes["task.task_tast_id_from"]).toBe("state-1");
      expect(span.attributes["task.task_tast_id_to"]).toBe("state-2");
      expect(span.attributes["result.success"]).toBe(true);
    });

    test("(6) move atómico via transactionManager.run()", async () => {
      // Spy: si el tx manager se invocara más de una vez, falla.
      let txCalls = 0;
      const spyTx: TransactionManager = {
        async run<T>(work: (trx: Transaction) => Promise<T>): Promise<T> {
          txCalls += 1;
          return work({} as Transaction);
        },
      };

      const localSut = new MoveTask({
        taskRepository: taskRepo,
        taskStateRepository: taskStateRepo,
        transactionManager: spyTx,
        telemetry,
      });

      await taskRepo.insert(makeTask({ id: "a", kanbanOrder: 1024 }));
      await taskRepo.insert(makeTask({ id: "b", kanbanOrder: 2048 }));
      await taskRepo.insert(
        makeTask({ id: "x", kanbanOrder: 0, stateId: "state-2" }),
      );

      await localSut.execute({
        userId: "u1",
        taskId: "x",
        targetStateId: "state-1",
        prevTaskId: "a",
        nextTaskId: "b",
      });

      expect(txCalls).toBe(1);
    });
  });

  describe("atributos PII-safe allowlist §D6", () => {
    test("el span emite SOLO los 4 atributos permitidos; nunca title/description/email", async () => {
      await taskRepo.insert(makeTask({ id: "a", kanbanOrder: 1024 }));
      await taskRepo.insert(
        makeTask({ id: "x", kanbanOrder: 0, stateId: "state-2" }),
      );

      await sut.execute({
        userId: "u1",
        taskId: "x",
        targetStateId: "state-1",
        prevTaskId: "a",
      });

      const span = telemetry.spans[0]!;
      const attrs = Object.keys(span.attributes);

      // Allowed
      expect(attrs).toContain("task.task_id");
      expect(attrs).toContain("task.task_tast_id_from");
      expect(attrs).toContain("task.task_tast_id_to");
      expect(attrs).toContain("result.success");

      // Forbidden
      const forbiddenAttrs = attrs.filter(
        (k) =>
          k.includes("title") ||
          k.includes("description") ||
          k.includes("email"),
      );
      expect(forbiddenAttrs).toEqual([]);
    });
  });
});
