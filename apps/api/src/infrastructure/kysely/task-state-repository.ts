import type { TaskStateRepository } from "../../domain/ports/task-state-repository";
import type { Transaction } from "../../domain/ports/transaction";
import type { TaskStatePatch, TaskStateRow } from "../../domain/tasks/types";
import type { Database } from "./database";
import { mapTaskStateRow, type TaskStateDbRow } from "./_mappers";

export class KyselyTaskStateRepository implements TaskStateRepository {
  constructor(private readonly db: Database) {}

  async findById(
    id: string,
    trx?: Transaction,
  ): Promise<TaskStateRow | undefined> {
    const db = this.resolve(trx);
    const row = await db
      .selectFrom("task_state")
      .selectAll()
      .where("tast_id", "=", id)
      .executeTakeFirst();
    return row ? mapTaskStateRow(row as TaskStateDbRow) : undefined;
  }

  async findByUser(userId: string, trx?: Transaction): Promise<TaskStateRow[]> {
    const db = this.resolve(trx);
    const rows = await db
      .selectFrom("task_state")
      .selectAll()
      .where("tast_user_id", "=", userId)
      .where("tast_deleted_at", "is", null)
      .orderBy("tast_order", "asc")
      .execute();
    return rows.map((row) => mapTaskStateRow(row as TaskStateDbRow));
  }

  async insert(state: TaskStateRow, trx?: Transaction): Promise<void> {
    const db = this.resolve(trx);
    await db
      .insertInto("task_state")
      .values({
        tast_id: state.id,
        tast_user_id: state.userId,
        tast_name: state.name,
        tast_order: state.order,
        tast_created_at: state.createdAt,
      })
      .execute();
  }

  async update(
    id: string,
    patch: TaskStatePatch,
    trx?: Transaction,
  ): Promise<void> {
    const db = this.resolve(trx);
    const set: Partial<{
      tast_name: string;
      tast_order: number;
    }> = {};
    if (patch.name !== undefined) set.tast_name = patch.name;
    if (patch.order !== undefined) set.tast_order = patch.order;
    if (Object.keys(set).length === 0) return;
    await db
      .updateTable("task_state")
      .set(set)
      .where("tast_id", "=", id)
      .execute();
  }

  async softDelete(id: string, trx?: Transaction): Promise<void> {
    const db = this.resolve(trx);
    await db
      .updateTable("task_state")
      .set({ tast_deleted_at: new Date() })
      .where("tast_id", "=", id)
      .execute();
  }

  async persistOrder(
    stateId: string,
    order: number,
    trx?: Transaction,
  ): Promise<void> {
    const db = this.resolve(trx);
    await db
      .updateTable("task_state")
      .set({ tast_order: order })
      .where("tast_id", "=", stateId)
      .execute();
  }

  private resolve(trx?: Transaction): Database {
    return (trx as Database | undefined) ?? this.db;
  }
}
