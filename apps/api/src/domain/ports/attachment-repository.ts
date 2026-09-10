import type { AttachmentRow } from "../tasks/types";
import type { Transaction } from "./transaction";

/**
 * Puerto de dominio para attachments.
 *
 * STUB Fase 2: las tablas `attachments` y `task_attachments` se crean en WU2,
 * pero ningún handler del MVP (WU6) consume este repositorio. La interface
 * existe para que el TRIANGULATE test de WU3 pueda bloquear consumo accidental
 * vía grep gate. WU11/WU12 (frontend) tampoco lo consumen en MVP.
 */
export interface AttachmentRepository {
  findById(id: string, trx?: Transaction): Promise<AttachmentRow | undefined>;
  listByTask(taskId: string, trx?: Transaction): Promise<AttachmentRow[]>;
  insert(attachment: AttachmentRow, trx?: Transaction): Promise<void>;
  softDelete(id: string, trx?: Transaction): Promise<void>;
}
