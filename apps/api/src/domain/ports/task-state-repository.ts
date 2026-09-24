import type { TaskStatePatch, TaskStateRow } from "../tasks/types";
import type { Transaction } from "./transaction";

/**
 * Puerto de dominio para task states (columnas del kanban). Interface pura.
 */
export interface TaskStateRepository {
 findById(id: string, trx?: Transaction): Promise<TaskStateRow | undefined>;
 findByUser(userId: string, trx?: Transaction): Promise<TaskStateRow[]>;
 /**
  * Dentro de una transacción, difiere la verificación de UNIQUE constraints
  * hasta `COMMIT`. Útil para reorders donde dos UPDATEs secuenciales
  * podrían violar `UNIQUE (user_id, tast_order)` temporalmente durante el swap.
  */
 deferConstraints(trx: Transaction): Promise<void>;
 insert(state: TaskStateRow, trx?: Transaction): Promise<void>;
 update(id: string, patch: TaskStatePatch, trx?: Transaction): Promise<void>;
 softDelete(id: string, trx?: Transaction): Promise<void>;
 persistOrder(stateId: string, order: number, trx?: Transaction): Promise<void>;
}
