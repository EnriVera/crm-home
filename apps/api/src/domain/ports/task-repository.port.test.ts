import { describe, expect, test } from "bun:test";
import type { TaskRepository } from "./task-repository";
import type { Transaction } from "./transaction";

/**
 * Test de compilación: verifica que la interface TaskRepository existe con las
 * firmas esperadas por el spec `tasks` (PR-A2 / WU3). Si la interface cambia,
 * el test de tipos falla al compilar.
 */

describe("TaskRepository (type-shape)", () => {
  test("la interface expone los métodos requeridos por el spec", () => {
    // Dummy que satisface la interface. Si la firma cambia, este código no compila.
    const dummy: TaskRepository = {
      findById: async (_id: string, _trx?: Transaction) => undefined,
      listByUser: async (_userId: string, _trx?: Transaction) => [],
      listByColumn: async (
        _userId: string,
        _stateId: string,
        _trx?: Transaction,
      ) => [],
      insert: async (_task: unknown, _trx?: Transaction) => undefined,
      update: async (_id: string, _patch: unknown, _trx?: Transaction) =>
        undefined,
      softDelete: async (_id: string, _trx?: Transaction) => undefined,
      moveTask: async (
        _params: {
          taskId: string;
          targetStateId: string;
          prevTaskId?: string;
          nextTaskId?: string;
        },
        _trx?: Transaction,
      ) => undefined,
      rebalanceColumn: async (_rows: unknown[], _trx?: Transaction) =>
        undefined,
      persistOrders: async (
        _rows: Array<{ id: string; order: number }>,
        _trx?: Transaction,
      ) => undefined,
    };

    expect(typeof dummy.findById).toBe("function");
    expect(typeof dummy.moveTask).toBe("function");
    expect(typeof dummy.rebalanceColumn).toBe("function");
    expect(typeof dummy.persistOrders).toBe("function");
    expect(typeof dummy.listByColumn).toBe("function");
  });
});
