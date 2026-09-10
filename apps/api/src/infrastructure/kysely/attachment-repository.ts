import type { AttachmentRepository } from "../../domain/ports/attachment-repository";
import type { Transaction } from "../../domain/ports/transaction";
import type { AttachmentRow } from "../../domain/tasks/types";
import type { Database } from "./database";
import { mapAttachmentRow, type AttachmentDbRow } from "./_mappers";

/**
 * Adapter kysely para attachments. Stub de Fase 2 — el MVP no expone endpoints
 * sobre attachments. El gate de composición raíz (en
 * `apps/api/src/domain/ports/__attachment-not-in-composition.test.ts`) verifica
 * que NINGÚN handler lo consume accidentalmente.
 */
export class KyselyAttachmentRepository implements AttachmentRepository {
  constructor(private readonly db: Database) {}

  async findById(
    id: string,
    trx?: Transaction,
  ): Promise<AttachmentRow | undefined> {
    const db = this.resolve(trx);
    const row = await db
      .selectFrom("attachments")
      .selectAll()
      .where("atta_id", "=", id)
      .executeTakeFirst();
    return row ? mapAttachmentRow(row as AttachmentDbRow) : undefined;
  }

  async listByTask(
    taskId: string,
    trx?: Transaction,
  ): Promise<AttachmentRow[]> {
    const db = this.resolve(trx);
    const rows = await db
      .selectFrom("task_attachments")
      .innerJoin(
        "attachments",
        "attachments.atta_id",
        "task_attachments.taat_atta_id",
      )
      .selectAll("attachments")
      .where("task_attachments.taat_task_id", "=", taskId)
      .where("attachments.atta_deleted_at", "is", null)
      .execute();
    return rows.map((row) => mapAttachmentRow(row as AttachmentDbRow));
  }

  async insert(attachment: AttachmentRow, trx?: Transaction): Promise<void> {
    const db = this.resolve(trx);
    await db
      .insertInto("attachments")
      .values({
        atta_id: attachment.id,
        atta_user_id: attachment.userId,
        atta_s3id: attachment.s3Id,
        atta_title: attachment.title,
        atta_format: attachment.format,
        atta_created_at: attachment.createdAt,
        atta_updated_at: attachment.updatedAt,
      })
      .execute();
  }

  async softDelete(id: string, trx?: Transaction): Promise<void> {
    const db = this.resolve(trx);
    await db
      .updateTable("attachments")
      .set({ atta_deleted_at: new Date() })
      .where("atta_id", "=", id)
      .execute();
  }

  private resolve(trx?: Transaction): Database {
    return (trx as Database | undefined) ?? this.db;
  }
}
