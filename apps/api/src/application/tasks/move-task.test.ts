import {
  afterEach,
  beforeEach,
  describe,
  expect,
  test,
} from "bun:test";
import type { TaskRepository } from "../../domain/ports/task-repository";
import type { TaskStateRepository } from "../../domain/ports/task-state-repository";
import type {
  Attributes,
  SpanHandle,
  Telemetry,
} from "../../domain/ports/telemetry";
import type { TransactionManager } from "../../domain/ports/transaction-manager";
import type { Transaction } from "../../domain/ports/transaction";
import type { TaskRow } from "../../domain/tasks/types";
import {
  InvalidKanbanOrder,
  TaskNotFound,
} from "./errors";
import { KANBAN_DEFAULT_STEP } from "./constants";
import { MoveTask } from "./move-task";

// ─────────────────────────────────────────────────────────────────────────────
// In-memory test doubles (REFACTOR: extraer a apps/api/src/application/tasks/
// test-helpers/ en PR-B1.b junto con el resto de los use cases de escritura).
// ─────────────────────────────────────────────────────────────────────────────

class InMemoryTaskRepository implements TaskRepository {
  rows = new Map<string, TaskRow>();

  async findById(id: string): Promise<TaskRow | undefined> {
    return this.rows.get(id);
  }
  async listByUser(userId: string): Promise<TaskRow[]> {
    return Array.from(this.rows.values()).filter(
      (r) => r.userId === userId && !r.deletedAt,
    );
  }
  async listByColumn(userId: string, stateId: string): Promise<TaskRow[]> {
    return Array.from(this.rows.values())
      .filter((r) => r.userId === userId && r.stateId === stateId && !r.deletedAt)
      .sort((a, b) => a.kanbanOrder - b.kanbanOrder);
  }
  async insert(task: TaskRow): Promise<void> {
    this.rows.set(task.id, task);
  }
  async update(id: string, patch: Partial<TaskRow>): Promise<void> {
    const current = this.rows.get(id);
    if (!current) throw new Error(`task ${id} not found`);
    this.rows.set(id, { ...current, ...patch });
  }
  async softDelete(id: string): Promise<void> {
    const current = this.rows.get(id);
    if (current) this.rows.set(id, { ...current, deletedAt: new Date() });
  }
  async moveTask(params: {
    taskId: string;
    targetStateId: string;
    prevTaskId?: string;
    nextTaskId?: string;
  }): Promise<void> {
    const current = this.rows.get(params.taskId);
    if (!current) return;
    this.rows.set(params.taskId, { ...current, stateId: params.targetStateId });
  }
  async rebalanceColumn(rows: TaskRow[]): Promise<void> {
    for (const row of rows) {
      const current = this.rows.get(row.id);
      if (current) this.rows.set(row.id, { ...current, kanbanOrder: row.kanbanOrder });
    }
  }
  async persistOrders(rows: Array<{ id: string; order: number }>): Promise<void> {
    for (const { id, order } of rows) {
      const current = this.rows.get(id);
      if (current) this.rows.set(id, { ...current, kanbanOrder: order });
    }
  }
}

class InMemoryTaskStateRepository implements TaskStateRepository {
  // No usado en MoveTask, pero requerido por la interface para cablear en deps.
  // eslint-disable-next-line @typescript-eslint/no-empty-function
  async findById(): Promise<undefined> { return undefined; }
  // eslint-disable-next-line @typescript-eslint/no-empty-function
  async findByUser(): Promise<[]> { return []; }
  // eslint-disable-next-line @typescript-eslint/no-empty-function
  async insert(): Promise<void> {}
  // eslint-disable-next-line @typescript-eslint/no-empty-function
  async update(): Promise<void> {}
  // eslint-disable-next-line @typescript-eslint/no-empty-function
  async softDelete(): Promise<void> {}
  // eslint-disable-next-line @typescript-eslint/no-empty-function
  async persistOrder(): Promise<void> {}
}

class InMemoryTransactionManager implements TransactionManager {
  async run<T>(work: (trx: Transaction) => Promise<T>): Promise<T> {
    return work({} as Transaction);
  }
}

class CapturedSpan {
  attributes: Attributes = {};
  ended = false;
  exception: unknown = undefined;
  setAttribute(key: string, value: string | number | boolean): void {
    this.attributes[key] = value;
  }
  recordException(error: unknown): void {
    this.exception = error;
  }
  end(): void {
    this.ended = true;
  }
}

class InMemoryTelemetry implements Telemetry {
  spans: CapturedSpan[] = [];
  startSpan(_name: string, attributes?: Attributes): SpanHandle {
    const span = new CapturedSpan();
    if (attributes) span.attributes = { ...attributes };
    this.spans.push(span);
    return span;
  }
  // eslint-disable-next-line @typescript-eslint/no-empty-function
  async shutdown(): Promise<void> {}
}

function makeTask(overrides: Partial<TaskRow>): TaskRow {
  return {
    id: "task-id",
    userId: "u1",
    title: "T",
    description: null,
    clientId: null,
    typeId: "type-id",
    categoryId: null,
    stateId: "state-1",
    kanbanOrder: 0,
    createdAt: new Date(0),
    updatedAt: new Date(0),
    deletedAt: null,
    ...overrides,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// Tests
// ─────────────────────────────────────────────────────────────────────────────

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
    await taskRepo.insert(makeTask({ id: "t1", kanbanOrder: 1024, stateId: "state-2" }));
    await taskRepo.insert(makeTask({ id: "t2", kanbanOrder: 2048, stateId: "state-2" }));
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
      await taskRepo.insert(makeTask({ id: "x", kanbanOrder: 2048, stateId: "state-2" }));

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
      await taskRepo.insert(makeTask({ id: "x", kanbanOrder: 0, stateId: "state-2" }));

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
      await taskRepo.insert(makeTask({ id: "x", kanbanOrder: 0, stateId: "state-2" }));

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
      await taskRepo.insert(makeTask({ id: "x", kanbanOrder: 0, stateId: "state-2" }));

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
      await taskRepo.insert(makeTask({ id: "a", kanbanOrder: 1024, stateId: "state-1" }));
      await taskRepo.insert(makeTask({ id: "b", kanbanOrder: 2048, stateId: "state-1" }));
      await taskRepo.insert(makeTask({ id: "c", kanbanOrder: 1024, stateId: "state-2" }));
      await taskRepo.insert(makeTask({ id: "x", kanbanOrder: 9999, stateId: "state-1" }));

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
      await taskRepo.insert(makeTask({ id: "x", kanbanOrder: 0, stateId: "state-2" }));

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
      await taskRepo.insert(makeTask({ id: "x", kanbanOrder: 0, stateId: "state-2" }));

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
      const forbiddenAttrs = attrs.filter((k) =>
        k.includes("title") ||
        k.includes("description") ||
        k.includes("email")
      );
      expect(forbiddenAttrs).toEqual([]);
    });
  });
});
