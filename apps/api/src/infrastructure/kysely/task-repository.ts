import type { TaskRepository } from "../../domain/ports/task-repository";
import type { Transaction } from "../../domain/ports/transaction";
import type {
  MoveTaskParams,
  TaskPatch,
  TaskRow,
} from "../../domain/tasks/types";
import type { Database } from "./database";
import { mapTaskRow, type TaskDbRow } from "./_mappers";

export class KyselyTaskRepository implements TaskRepository {
  constructor(private readonly db: Database) {}

  async findById(id: string, trx?: Transaction): Promise<TaskRow | undefined> {
    const db = this.resolve(trx);
    const row = await db
      .selectFrom("task")
      .selectAll()
      .where("task_id", "=", id)
      .executeTakeFirst();
    return row ? mapTaskRow(row as TaskDbRow) : undefined;
  }

  async listByUser(userId: string, trx?: Transaction): Promise<TaskRow[]> {
    const db = this.resolve(trx);
    const rows = await db
      .selectFrom("task")
      .selectAll()
      .where("task_user_id", "=", userId)
      .where("task_deleted_at", "is", null)
      .orderBy("task_kanban_order", "asc")
      .execute();
    return rows.map((row) => mapTaskRow(row as TaskDbRow));
  }

  async listByColumn(
    userId: string,
    stateId: string,
    trx?: Transaction,
  ): Promise<TaskRow[]> {
    const db = this.resolve(trx);
    // Usa el índice idx_task_kanban compuesto (task_user_id, task_tast_id,
    // task_kanban_order) para orden estable.
    const rows = await db
      .selectFrom("task")
      .selectAll()
      .where("task_user_id", "=", userId)
      .where("task_tast_id", "=", stateId)
      .where("task_deleted_at", "is", null)
      .orderBy("task_kanban_order", "asc")
      .execute();
    return rows.map((row) => mapTaskRow(row as TaskDbRow));
  }

  async insert(task: TaskRow, trx?: Transaction): Promise<void> {
    const db = this.resolve(trx);
    await db
      .insertInto("task")
      .values({
        task_id: task.id,
        task_user_id: task.userId,
        task_title: task.title,
        task_description: task.description,
        task_clie_id: task.clientId,
        task_type_id: task.typeId,
        task_cate_id: task.categoryId,
        task_tast_id: task.stateId,
        task_kanban_order: task.kanbanOrder,
        task_created_at: task.createdAt,
        task_updated_at: task.updatedAt,
      })
      .execute();
  }

  async update(id: string, patch: TaskPatch, trx?: Transaction): Promise<void> {
    const db = this.resolve(trx);
    const set: Partial<{
      task_title: string;
      task_description: string | null;
      task_clie_id: string | null;
      task_type_id: string;
      task_cate_id: string | null;
      task_tast_id: string;
    }> = {};
    if (patch.title !== undefined) set.task_title = patch.title;
    if (patch.description !== undefined)
      set.task_description = patch.description;
    if (patch.clientId !== undefined) set.task_clie_id = patch.clientId;
    if (patch.typeId !== undefined) set.task_type_id = patch.typeId;
    if (patch.categoryId !== undefined) set.task_cate_id = patch.categoryId;
    if (patch.stateId !== undefined) set.task_tast_id = patch.stateId;
    if (Object.keys(set).length === 0) return;
    await db.updateTable("task").set(set).where("task_id", "=", id).execute();
  }

  async softDelete(id: string, trx?: Transaction): Promise<void> {
    const db = this.resolve(trx);
    await db
      .updateTable("task")
      .set({ task_deleted_at: new Date() })
      .where("task_id", "=", id)
      .execute();
  }

  async moveTask(params: MoveTaskParams, trx?: Transaction): Promise<void> {
    const db = this.resolve(trx);
    // UPDATE atómico: cambia estado y conserva orden (que se persiste
    // en la llamada separada a persistOrders).
    await db
      .updateTable("task")
      .set({ task_tast_id: params.targetStateId })
      .where("task_id", "=", params.taskId)
      .execute();
  }

  async rebalanceColumn(rows: TaskRow[], trx?: Transaction): Promise<void> {
    const db = this.resolve(trx);
    for (const row of rows) {
      await db
        .updateTable("task")
        .set({ task_kanban_order: row.kanbanOrder })
        .where("task_id", "=", row.id)
        .execute();
    }
  }

  async persistOrders(
    rows: Array<{ id: string; order: number }>,
    trx?: Transaction,
  ): Promise<void> {
    const db = this.resolve(trx);
    for (const { id, order } of rows) {
      await db
        .updateTable("task")
        .set({ task_kanban_order: order })
        .where("task_id", "=", id)
        .execute();
    }
  }

  private resolve(trx?: Transaction): Database {
    return (trx as Database | undefined) ?? this.db;
  }
}
