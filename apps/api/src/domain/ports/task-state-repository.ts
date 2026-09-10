import type { TaskStatePatch, TaskStateRow } from "../tasks/types";
import type { Transaction } from "./transaction";

/**
 * Puerto de dominio para task states (columnas del kanban). Interface pura.
 */
export interface TaskStateRepository {
  findById(id: string, trx?: Transaction): Promise<TaskStateRow | undefined>;
  findByUser(userId: string, trx?: Transaction): Promise<TaskStateRow[]>;
  insert(state: TaskStateRow, trx?: Transaction): Promise<void>;
  update(
    id: string,
    patch: TaskStatePatch,
    trx?: Transaction,
  ): Promise<void>;
  softDelete(id: string, trx?: Transaction): Promise<void>;
  persistOrder(
    stateId: string,
    order: number,
    trx?: Transaction,
  ): Promise<void>;
}
