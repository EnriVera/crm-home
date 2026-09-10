import type { TaskRepository } from "../../domain/ports/task-repository";
import type { TaskStateRepository } from "../../domain/ports/task-state-repository";
import type { Telemetry } from "../../domain/ports/telemetry";
import type { TransactionManager } from "../../domain/ports/transaction-manager";
import { InvalidKanbanOrder, TaskNotFound } from "./errors";
import {
  appendOrder,
  computeInsertOrder,
  prependOrder,
  rebalanceColumn,
  shouldRebalance,
} from "./move-task.helpers";

export interface MoveTaskInput {
  userId: string;
  taskId: string;
  targetStateId: string;
  prevTaskId?: string;
  nextTaskId?: string;
}

export interface MoveTaskDependencies {
  taskRepository: TaskRepository;
  taskStateRepository: TaskStateRepository;
  transactionManager: TransactionManager;
  telemetry: Telemetry;
}

/**
 * Caso de uso: mover una task a otra posición kanban (mismo estado u otro).
 *
 * Algoritmo:
 * 1. Si el caller no especifica vecinos (`prevTaskId` y `nextTaskId` ambos
 *    `undefined`) ⇒ `InvalidKanbanOrder` (decisión ambigua).
 * 2. Si solo `prevTaskId` ⇒ append: orden = `appendOrder(column)`.
 * 3. Si solo `nextTaskId` ⇒ prepend: orden = `prependOrder(column)`.
 * 4. Si ambos ⇒ midpoint: orden = `computeInsertOrder(prev, next)`. Si el gap
 *    cae bajo `KANBAN_GAP_REBALANCE_THRESHOLD`, dispara `rebalanceColumn`.
 *
 * Atributos del span `task.move` (PII-safe allowlist §D6):
 *   task.task_id, task.task_tast_id_from, task.task_tast_id_to,
 *   result.success, task.kanban_order_rebalanced
 *
 * Atómicos: el move + persistOrders + rebalance corren dentro de una misma
 * `transactionManager.run(...)`.
 */
export class MoveTask {
  constructor(private readonly deps: MoveTaskDependencies) {}

  async execute(input: MoveTaskInput): Promise<void> {
    if (input.prevTaskId === undefined && input.nextTaskId === undefined) {
      throw new InvalidKanbanOrder(
        "Move requires at least one neighbor (prev or next)",
      );
    }

    return this.deps.transactionManager.run(async (trx) => {
      const span = this.deps.telemetry.startSpan("task.move", {
        "task.task_id": input.taskId,
        "task.task_tast_id_from": "",
        "task.task_tast_id_to": input.targetStateId,
        "result.success": false,
      });

      try {
        const task = await this.deps.taskRepository.findById(input.taskId, trx);
        if (!task) {
          throw new TaskNotFound();
        }
        span.setAttribute("task.task_tast_id_from", task.stateId);

        const column = await this.deps.taskRepository.listByColumn(
          input.userId,
          input.targetStateId,
          trx,
        );

        // Excluir la task que estamos moviendo si está en la columna destino.
        const filtered = column.filter((row) => row.id !== input.taskId);

        let newOrder: number;
        let mustRebalance = false;

        if (input.prevTaskId !== undefined && input.nextTaskId !== undefined) {
          const prev = filtered.find((row) => row.id === input.prevTaskId);
          const next = filtered.find((row) => row.id === input.nextTaskId);
          if (!prev || !next) {
            throw new InvalidKanbanOrder(
              "Neighbor task not found in target column",
            );
          }
          newOrder = computeInsertOrder(prev.kanbanOrder, next.kanbanOrder);
          if (shouldRebalance(next.kanbanOrder - prev.kanbanOrder)) {
            mustRebalance = true;
          }
        } else if (input.prevTaskId === undefined) {
          newOrder = prependOrder(
            filtered.map((row) => ({ order: row.kanbanOrder })),
          );
        } else {
          newOrder = appendOrder(
            filtered.map((row) => ({ order: row.kanbanOrder })),
          );
        }

        await this.deps.taskRepository.moveTask(
          {
            taskId: input.taskId,
            targetStateId: input.targetStateId,
            prevTaskId: input.prevTaskId,
            nextTaskId: input.nextTaskId,
          },
          trx,
        );
        await this.deps.taskRepository.persistOrders(
          [{ id: input.taskId, order: newOrder }],
          trx,
        );

        if (mustRebalance) {
          const fresh = await this.deps.taskRepository.listByColumn(
            input.userId,
            input.targetStateId,
            trx,
          );
          // La task movida conserva su midpoint; sólo re-balanceamos las OTRAS
          // tareas de la columna para abrir gaps futuros.
          const others = fresh.filter((row) => row.id !== input.taskId);
          const rebalanced = rebalanceColumn(
            others.map((row) => ({ id: row.id, order: row.kanbanOrder })),
          );
          await this.deps.taskRepository.persistOrders(rebalanced, trx);
          span.setAttribute("task.kanban_order_rebalanced", true);
        }

        span.setAttribute("result.success", true);
        span.end();
      } catch (err) {
        span.recordException(err);
        span.setAttribute("result.success", false);
        span.end();
        throw err;
      }
    });
  }
}
