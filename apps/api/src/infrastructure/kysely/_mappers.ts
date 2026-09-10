/**
 * Mappers snake_case (DB) → camelCase (dominio).
 *
 * Cada adapter kysely implementa sus puertos usando estos helpers para evitar
 * duplicación de la conversión row → entity. El adapter queda como un thin
 * wrapper de SQL + delegate al mapper.
 *
 * Convenciones:
 * - `Generated<Date>` se mapea como `Date` (kysely resuelve por columna).
 * - `null` en DB se mapea a `null` o `undefined` según el contrato del port
 *   (ver el port concreto).
 */

import type {
  AttachmentRow,
  CategoryRow,
  ClientRow,
  TaskRow,
  TaskStateRow,
  TypeCategoriesClientRow,
} from "../../domain/tasks/types";

// ─── TaskStateRow ───────────────────────────────────────────────────────────

export interface TaskStateDbRow {
  tast_id: string;
  tast_user_id: string;
  tast_name: string;
  tast_order: number;
  tast_created_at: Date;
  tast_deleted_at: Date | null;
}

export function mapTaskStateRow(row: TaskStateDbRow): TaskStateRow {
  return {
    id: row.tast_id,
    userId: row.tast_user_id,
    name: row.tast_name,
    order: row.tast_order,
    createdAt: row.tast_created_at,
    deletedAt: row.tast_deleted_at,
  };
}

// ─── TaskRow ────────────────────────────────────────────────────────────────

export interface TaskDbRow {
  task_id: string;
  task_user_id: string;
  task_title: string;
  task_description: string | null;
  task_clie_id: string | null;
  task_type_id: string;
  task_cate_id: string | null;
  task_tast_id: string;
  task_kanban_order: number;
  task_created_at: Date;
  task_updated_at: Date;
  task_deleted_at: Date | null;
}

export function mapTaskRow(row: TaskDbRow): TaskRow {
  return {
    id: row.task_id,
    userId: row.task_user_id,
    title: row.task_title,
    description: row.task_description,
    clientId: row.task_clie_id,
    typeId: row.task_type_id,
    categoryId: row.task_cate_id,
    stateId: row.task_tast_id,
    kanbanOrder: row.task_kanban_order,
    createdAt: row.task_created_at,
    updatedAt: row.task_updated_at,
    deletedAt: row.task_deleted_at,
  };
}

// ─── ClientRow ──────────────────────────────────────────────────────────────

export interface ClientDbRow {
  clie_id: string;
  clie_user_id: string;
  clie_name: string;
  clie_email: string | null;
  clie_areaphone: string | null;
  clie_phone: string | null;
  clie_created_at: Date;
  clie_updated_at: Date;
  clie_deleted_at: Date | null;
}

export function mapClientRow(row: ClientDbRow): ClientRow {
  return {
    id: row.clie_id,
    userId: row.clie_user_id,
    name: row.clie_name,
    email: row.clie_email,
    areaPhone: row.clie_areaphone,
    phone: row.clie_phone,
    createdAt: row.clie_created_at,
    updatedAt: row.clie_updated_at,
    deletedAt: row.clie_deleted_at,
  };
}

// ─── CategoryRow ────────────────────────────────────────────────────────────

export interface CategoryDbRow {
  cate_id: string;
  cate_user_id: string;
  cate_name: string;
  cate_type_id: string;
  cate_created_at: Date;
  cate_deleted_at: Date | null;
}

export function mapCategoryRow(row: CategoryDbRow): CategoryRow {
  return {
    id: row.cate_id,
    userId: row.cate_user_id,
    name: row.cate_name,
    typeId: row.cate_type_id,
    createdAt: row.cate_created_at,
    deletedAt: row.cate_deleted_at,
  };
}

// ─── AttachmentRow ──────────────────────────────────────────────────────────

export interface AttachmentDbRow {
  atta_id: string;
  atta_user_id: string;
  atta_s3id: string;
  atta_title: string;
  atta_format: string;
  atta_created_at: Date;
  atta_updated_at: Date;
  atta_deleted_at: Date | null;
}

export function mapAttachmentRow(row: AttachmentDbRow): AttachmentRow {
  return {
    id: row.atta_id,
    userId: row.atta_user_id,
    s3Id: row.atta_s3id,
    title: row.atta_title,
    format: row.atta_format,
    createdAt: row.atta_created_at,
    updatedAt: row.atta_updated_at,
    deletedAt: row.atta_deleted_at,
  };
}

// ─── TypeCategoriesClientRow ────────────────────────────────────────────────

export interface TypeCategoriesClientDbRow {
  tccl_id: string;
  tccl_user_id: string;
  tccl_type_id: string;
  tccl_cate_id: string;
  tccl_clie_id: string | null;
  tccl_created_at: Date;
  tccl_updated_at: Date;
  tccl_deleted_at: Date | null;
}

export function mapTypeCategoriesClientRow(
  row: TypeCategoriesClientDbRow,
): TypeCategoriesClientRow {
  return {
    id: row.tccl_id,
    userId: row.tccl_user_id,
    typeId: row.tccl_type_id,
    categoryId: row.tccl_cate_id,
    clientId: row.tccl_clie_id,
    createdAt: row.tccl_created_at,
    updatedAt: row.tccl_updated_at,
    deletedAt: row.tccl_deleted_at,
  };
}
