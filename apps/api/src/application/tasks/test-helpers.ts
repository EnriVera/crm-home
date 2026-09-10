/**
 * Test helpers compartidos para los use cases del módulo tasks.
 *
 * Contiene:
 * - InMemory*Repository: implementaciones en memoria de los 6 puertos.
 * - InMemoryTransactionManager: ejecuta el callback sin contexto transaccional.
 * - InMemoryTelemetry: captura los spans para asserciones PII-safe.
 * - FixedClock: reloj monotónico para tests deterministas.
 * - FakeIdGenerator: contador determinista de UUIDs.
 * - makeTask / makeTaskState / makeClient: factories de filas de dominio.
 *
 * NOTA: este archivo se importa solo desde tests del módulo tasks. Mantener
 * interfaces idénticas a las del dominio (`*.port.ts`) para que los use cases
 * queden testeados contra los mismos tipos que consumen los adapters kysely.
 */

import type { IdGenerator } from "../../domain/ports/id-generator";
import type { Clock } from "../../domain/ports/clock";
import type { TaskRepository } from "../../domain/ports/task-repository";
import type { TaskStateRepository } from "../../domain/ports/task-state-repository";
import type { ClientLookupRepository } from "../../domain/ports/client-lookup-repository";
import type { TypeLookupRepository } from "../../domain/ports/type-lookup-repository";
import type { CategoryLookupRepository } from "../../domain/ports/category-lookup-repository";
import type { Attributes, SpanHandle, Telemetry } from "../../domain/ports/telemetry";
import type { TransactionManager } from "../../domain/ports/transaction-manager";
import type { Transaction } from "../../domain/ports/transaction";
import type {
  CategoryRow,
  ClientRow,
  TaskRow,
  TaskStateRow,
  TypeCategoriesClientRow,
} from "../../domain/tasks/types";

// ─── In-memory ports ────────────────────────────────────────────────────────

export class InMemoryTaskRepository implements TaskRepository {
  rows = new Map<string, TaskRow>();

  async findById(id: string, _trx?: Transaction): Promise<TaskRow | undefined> {
    return this.rows.get(id);
  }
  async listByUser(userId: string, _trx?: Transaction): Promise<TaskRow[]> {
    return Array.from(this.rows.values()).filter(
      (r) => r.userId === userId && !r.deletedAt,
    );
  }
  async listByColumn(
    userId: string,
    stateId: string,
    _trx?: Transaction,
  ): Promise<TaskRow[]> {
    return Array.from(this.rows.values())
      .filter((r) => r.userId === userId && r.stateId === stateId && !r.deletedAt)
      .sort((a, b) => a.kanbanOrder - b.kanbanOrder);
  }
  async insert(task: TaskRow, _trx?: Transaction): Promise<void> {
    this.rows.set(task.id, task);
  }
  async update(id: string, patch: Partial<TaskRow>, _trx?: Transaction): Promise<void> {
    const current = this.rows.get(id);
    if (!current) throw new Error(`task ${id} not found`);
    this.rows.set(id, { ...current, ...patch });
  }
  async softDelete(id: string, _trx?: Transaction): Promise<void> {
    const current = this.rows.get(id);
    if (current) this.rows.set(id, { ...current, deletedAt: new Date() });
  }
  async moveTask(params: {
    taskId: string;
    targetStateId: string;
    prevTaskId?: string;
    nextTaskId?: string;
  }, _trx?: Transaction): Promise<void> {
    const current = this.rows.get(params.taskId);
    if (!current) return;
    this.rows.set(params.taskId, { ...current, stateId: params.targetStateId });
  }
  async rebalanceColumn(rows: TaskRow[], _trx?: Transaction): Promise<void> {
    for (const row of rows) {
      const current = this.rows.get(row.id);
      if (current) this.rows.set(row.id, { ...current, kanbanOrder: row.kanbanOrder });
    }
  }
  async persistOrders(
    rows: Array<{ id: string; order: number }>,
    _trx?: Transaction,
  ): Promise<void> {
    for (const { id, order } of rows) {
      const current = this.rows.get(id);
      if (current) this.rows.set(id, { ...current, kanbanOrder: order });
    }
  }
}

export class InMemoryTaskStateRepository implements TaskStateRepository {
  rows = new Map<string, TaskStateRow>();

  async findById(id: string, _trx?: Transaction): Promise<TaskStateRow | undefined> {
    return this.rows.get(id);
  }
  async findByUser(userId: string, _trx?: Transaction): Promise<TaskStateRow[]> {
    return Array.from(this.rows.values())
      .filter((r) => r.userId === userId && !r.deletedAt)
      .sort((a, b) => a.order - b.order);
  }
  async insert(state: TaskStateRow, _trx?: Transaction): Promise<void> {
    this.rows.set(state.id, state);
  }
  async update(
    id: string,
    patch: Partial<TaskStateRow>,
    _trx?: Transaction,
  ): Promise<void> {
    const current = this.rows.get(id);
    if (!current) throw new Error(`task_state ${id} not found`);
    this.rows.set(id, { ...current, ...patch });
  }
  async softDelete(id: string, _trx?: Transaction): Promise<void> {
    const current = this.rows.get(id);
    if (current) this.rows.set(id, { ...current, deletedAt: new Date() });
  }
  async persistOrder(
    stateId: string,
    order: number,
    _trx?: Transaction,
  ): Promise<void> {
    const current = this.rows.get(stateId);
    if (current) this.rows.set(stateId, { ...current, order });
  }
}

export class InMemoryClientLookupRepository implements ClientLookupRepository {
  rows = new Map<string, ClientRow>();

  async searchByNamePrefix(params: {
    userId: string;
    query: string;
    limit: number;
  }): Promise<ClientRow[]> {
    const q = params.query.toLowerCase();
    return Array.from(this.rows.values())
      .filter(
        (r) =>
          r.userId === params.userId &&
          !r.deletedAt &&
          r.name.toLowerCase().includes(q),
      )
      .slice(0, Math.min(params.limit, 50));
  }
}

export class InMemoryTypeLookupRepository implements TypeLookupRepository {
  rows = new Map<string, TypeCategoriesClientRow>();

  async listForForm(params: {
    userId: string;
    clieId?: string;
  }): Promise<TypeCategoriesClientRow[]> {
    return Array.from(this.rows.values()).filter(
      (r) =>
        r.userId === params.userId &&
        !r.deletedAt &&
        (params.clieId === undefined
          ? r.clientId === null
          : r.clientId === params.clieId),
    );
  }
}

export class InMemoryCategoryLookupRepository implements CategoryLookupRepository {
  rows = new Map<string, CategoryRow>();

  async listByType(params: {
    userId: string;
    typeId: string;
  }): Promise<CategoryRow[]> {
    return Array.from(this.rows.values()).filter(
      (r) => r.userId === params.userId && r.typeId === params.typeId && !r.deletedAt,
    );
  }
}

// ─── In-memory transaction manager ──────────────────────────────────────────

export class InMemoryTransactionManager implements TransactionManager {
  async run<T>(work: (trx: Transaction) => Promise<T>): Promise<T> {
    return work({} as Transaction);
  }
}

// ─── In-memory telemetry ────────────────────────────────────────────────────

export class CapturedSpan {
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

export class InMemoryTelemetry implements Telemetry {
  spans: CapturedSpan[] = [];
  startSpan(_name: string, attributes?: Attributes): SpanHandle {
    const span = new CapturedSpan();
    if (attributes) span.attributes = { ...attributes };
    this.spans.push(span);
    return span;
  }
  async shutdown(): Promise<void> {}
}

// ─── Clock + Id generator ───────────────────────────────────────────────────

export class FixedClock implements Clock {
  constructor(private readonly current: Date) {}
  now(): Date {
    return this.current;
  }
}

export class FakeIdGenerator implements IdGenerator {
  private counter = 0;
  generate(): string {
    this.counter += 1;
    return `id-${this.counter.toString().padStart(4, "0")}`;
  }
}

// ─── Factories de filas de dominio ──────────────────────────────────────────

export function makeTask(overrides: Partial<TaskRow> = {}): TaskRow {
  return {
    id: "id-0001",
    userId: "u1",
    title: "T",
    description: null,
    clientId: null,
    typeId: "type-1",
    categoryId: null,
    stateId: "state-1",
    kanbanOrder: 0,
    createdAt: new Date(0),
    updatedAt: new Date(0),
    deletedAt: null,
    ...overrides,
  };
}

export function makeTaskState(overrides: Partial<TaskStateRow> = {}): TaskStateRow {
  return {
    id: "state-1",
    userId: "u1",
    name: "Pendiente",
    order: 0,
    createdAt: new Date(0),
    deletedAt: null,
    ...overrides,
  };
}

export function makeClient(overrides: Partial<ClientRow> = {}): ClientRow {
  return {
    id: "client-1",
    userId: "u1",
    name: "Acme",
    email: null,
    areaPhone: null,
    phone: null,
    createdAt: new Date(0),
    updatedAt: new Date(0),
    deletedAt: null,
    ...overrides,
  };
}
