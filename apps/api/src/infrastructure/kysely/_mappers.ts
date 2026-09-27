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
  ExpenseRow,
  IncomeRow,
  TaskRow,
  TaskStateRow,
  TransferRow,
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

// ─── IncomeRow ──────────────────────────────────────────────────────────────

export interface IncomeDbRow {
  inco_id: string;
  inco_user_id: string;
  inco_acco_id: string;
  inco_amount: string; // pg NUMERIC → string
  inco_currency_id: string;
  inco_description: string | null;
  inco_category: string | null;
  inco_date: string; // pg DATE → "YYYY-MM-DD"
  inco_created_at: Date;
  inco_updated_at: Date;
  inco_deleted_at: Date | null;
}

export function mapIncomeRow(row: IncomeDbRow): IncomeRow {
  return {
    id: row.inco_id,
    userId: row.inco_user_id,
    accountId: row.inco_acco_id,
    amount: row.inco_amount,
    currencyId: row.inco_currency_id,
    description: row.inco_description,
    category: row.inco_category,
    date: row.inco_date,
    createdAt: row.inco_created_at,
    updatedAt: row.inco_updated_at,
    deletedAt: row.inco_deleted_at,
  };
}

// ─── ExpenseRow ────────────────────────────────────────────────────────────

export interface ExpenseDbRow {
  expe_id: string;
  expe_user_id: string;
  expe_acco_id: string;
  expe_amount: string;
  expe_currency_id: string;
  expe_description: string | null;
  expe_category: string | null;
  expe_date: string;
  expe_receipt_url: string | null;
  expe_created_at: Date;
  expe_updated_at: Date;
  expe_deleted_at: Date | null;
}

export function mapExpenseRow(row: ExpenseDbRow): ExpenseRow {
  return {
    id: row.expe_id,
    userId: row.expe_user_id,
    accountId: row.expe_acco_id,
    amount: row.expe_amount,
    currencyId: row.expe_currency_id,
    description: row.expe_description,
    category: row.expe_category,
    date: row.expe_date,
    receiptUrl: row.expe_receipt_url,
    createdAt: row.expe_created_at,
    updatedAt: row.expe_updated_at,
    deletedAt: row.expe_deleted_at,
  };
}

// ─── TransferRow ────────────────────────────────────────────────────────────

export interface TransferDbRow {
  tran_id: string;
  tran_user_id: string;
  tran_from_acco_id: string;
  tran_to_acco_id: string;
  tran_amount: string;
  tran_currency_id: string;
  tran_description: string | null;
  tran_date: string;
  tran_created_at: Date;
  tran_deleted_at: Date | null;
}

export function mapTransferRow(row: TransferDbRow): TransferRow {
  return {
    id: row.tran_id,
    userId: row.tran_user_id,
    fromAccountId: row.tran_from_acco_id,
    toAccountId: row.tran_to_acco_id,
    amount: row.tran_amount,
    currencyId: row.tran_currency_id,
    description: row.tran_description,
    date: row.tran_date,
    createdAt: row.tran_created_at,
    deletedAt: row.tran_deleted_at,
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
