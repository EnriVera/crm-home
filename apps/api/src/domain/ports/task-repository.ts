import type {
  MoveTaskParams,
  TaskPatch,
  TaskRow,
} from "../tasks/types";
import type { Transaction } from "./transaction";

/**
 * Puerto de dominio para tasks. Interface pura — sin imports de kysely/h3/nitro.
 *
 * `trx?` opcional en todos los métodos: cuando el composition root (WU6) arma
 * una unidad de trabajo multi-repo, lo pasa explícitamente; los use cases (WU4)
 * que tocan un solo repo lo omiten.
 *
 * Convenciones de orden kanban:
 * - `kanbanOrder` es `DOUBLE PRECISION` en DB; en dominio se ve como `number`.
 * - `moveTask` recibe referencias a los vecinos para que el adapter compute el
 *   midpoint. Si `prevTaskId` y `nextTaskId` son `undefined` ⇒ destino es inicio
 *   o fin de columna (el adapter decide según el caso).
 * - `rebalanceColumn` y `persistOrders` los invoca el caso de uso `moveTask`
 *   cuando detecta `KANBAN_GAP_REBALANCE_THRESHOLD` comprometido.
 */
export interface TaskRepository {
  findById(id: string, trx?: Transaction): Promise<TaskRow | undefined>;
  listByUser(userId: string, trx?: Transaction): Promise<TaskRow[]>;
  listByColumn(
    userId: string,
    stateId: string,
    trx?: Transaction,
  ): Promise<TaskRow[]>;
  insert(task: TaskRow, trx?: Transaction): Promise<void>;
  update(id: string, patch: TaskPatch, trx?: Transaction): Promise<void>;
  softDelete(id: string, trx?: Transaction): Promise<void>;
  moveTask(params: MoveTaskParams, trx?: Transaction): Promise<void>;
  rebalanceColumn(rows: TaskRow[], trx?: Transaction): Promise<void>;
  persistOrders(
    rows: Array<{ id: string; order: number }>,
    trx?: Transaction,
  ): Promise<void>;
}
