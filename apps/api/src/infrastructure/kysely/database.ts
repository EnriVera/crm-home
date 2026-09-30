import { type Generated, Kysely, PostgresDialect } from "kysely";
import { Pool } from "pg";

export interface SinoTable {
 sin_id: number;
 sin_value: number;
 sin_name: string;
}

export interface AppsTable {
 apps_id: string;
 apps_name: string;
}

export interface CurrencyTable {
 curr_id: string;
 curr_name: string;
 curr_symbol: string;
 curr_decimals: number;
}

export interface UserTable {
 user_id: string;
 user_email: string;
 user_name: string;
 user_theme: string;
 user_sino_emailverificado: number;
 user_accepted_terms_at: Date | null;
 user_terms_version: string | null;
 user_created_at: Generated<Date>;
 user_updated_at: Generated<Date>;
 user_deleted_at: Date | null;
}

export interface LoginTable {
 logi_id: string;
 logi_email: string;
 logi_code: string;
 logi_expires_at: Date;
 logi_attempts: number;
 logi_created_at: Generated<Date>;
 logi_consumed_at: Date | null;
}

export interface SessionTable {
 sess_id: string;
 sess_user_id: string;
 sess_token_hash: string;
 sess_expires_at: Date;
 sess_created_at: Generated<Date>;
 sess_deleted_at: Date | null;
}

export interface EmailSendingTable {
 emse_id: string;
 emse_login_id: string;
 emse_from: string;
 emse_to: string;
 emse_subject: string;
 emse_body: string;
 emse_status: "pending" | "sent" | "failed";
 emse_created_at: Generated<Date>;
 emse_sent_at: Date | null;
}

export interface TaskStateTable {
 tast_id: string;
 tast_user_id: string;
 tast_name: string;
 tast_order: number;
 tast_created_at: Generated<Date>;
 tast_deleted_at: Date | null;
}

export interface AccountsTable {
 acco_id: string;
 acco_user_id: string;
 acco_name: string;
 acco_icon: string | null;
 acco_color: string | null;
 acco_curr_id: string;
 acco_initial_amount: number;
 acco_created_at: Generated<Date>;
 acco_deleted_at: Date | null;
}

export interface TypesTable {
 type_id: string;
 type_user_id: string;
 type_name: string;
 /**
  * Array de módulos a los que pertenece el type. Vacío `{}` = "aplica a
  * todos los módulos" (semántica all-modules). Cada elemento ∈
  * `{tasks, incomes, expenses, schedules}` enforced por CHECK en
  * migration 007.
  */
 type_modules: string[];
 type_created_at: Generated<Date>;
 type_deleted_at: Date | null;
}

export interface CategoriesTable {
 cate_id: string;
 cate_user_id: string;
 cate_name: string;
 cate_type_id: string;
 cate_created_at: Generated<Date>;
 cate_deleted_at: Date | null;
}

export interface ClientTable {
 clie_id: string;
 clie_user_id: string;
 clie_name: string;
 clie_email: string | null;
 clie_areaphone: string | null;
 clie_phone: string | null;
 clie_created_at: Generated<Date>;
 clie_updated_at: Generated<Date>;
 clie_deleted_at: Date | null;
}

export interface IncomeTable {
 inco_id: string;
 inco_user_id: string;
 inco_acco_id: string;
 inco_amount: string; // NUMERIC(19,4) llega como string de pg driver
 inco_currency_id: string;
 inco_description: string | null;
 inco_category: string | null;
 inco_date: string; // DATE → string (formato YYYY-MM-DD)
 inco_created_at: Generated<Date>;
 inco_updated_at: Generated<Date>;
 inco_deleted_at: Date | null;
}

export interface ExpenseTable {
 expe_id: string;
 expe_user_id: string;
 expe_acco_id: string;
 expe_amount: string;
 expe_currency_id: string;
 expe_description: string | null;
 expe_category: string | null;
 expe_date: string;
 expe_receipt_url: string | null;
 expe_created_at: Generated<Date>;
 expe_updated_at: Generated<Date>;
 expe_deleted_at: Date | null;
}

export interface TransferTable {
 tran_id: string;
 tran_user_id: string;
 tran_from_acco_id: string;
 tran_to_acco_id: string;
 tran_amount: string;
 tran_currency_id: string;
 tran_description: string | null;
 tran_date: string;
 tran_created_at: Generated<Date>;
 tran_deleted_at: Date | null;
}

export interface ScheduleTable {
 sche_id: string;
 sche_user_id: string;
 sche_name: string;
 sche_acco_id: string;
 sche_amount: string;
 sche_currency_id: string;
 sche_frequency: string;
 sche_next_run_date: string;
 sche_is_active: boolean;
 sche_description: string | null;
 sche_created_at: Generated<Date>;
 sche_updated_at: Generated<Date>;
 sche_deleted_at: Date | null;
}

export interface TypeCategoriesClientTable {
 tccl_id: string;
 tccl_user_id: string;
 tccl_type_id: string;
 tccl_cate_id: string;
 tccl_clie_id: string | null;
 tccl_created_at: Generated<Date>;
 tccl_updated_at: Generated<Date>;
 tccl_deleted_at: Date | null;
}

export interface AttachmentTable {
 atta_id: string;
 atta_user_id: string;
 atta_s3id: string;
 atta_title: string;
 atta_format: string;
 atta_created_at: Generated<Date>;
 atta_updated_at: Generated<Date>;
 atta_deleted_at: Date | null;
}

export interface TaskAttachmentsTable {
 taat_task_id: string;
 taat_atta_id: string;
 taat_created_at: Generated<Date>;
}

export interface TaskTable {
 task_id: string;
 task_user_id: string;
 task_title: string;
 task_description: string | null;
 task_clie_id: string | null;
 task_type_id: string;
 task_cate_id: string | null;
 task_tast_id: string;
 task_kanban_order: number;
 task_created_at: Generated<Date>;
 task_updated_at: Generated<Date>;
 task_deleted_at: Date | null;
}

export interface DatabaseSchema {
 sino: SinoTable;
 apps: AppsTable;
 currency: CurrencyTable;
 user: UserTable;
 login: LoginTable;
 session: SessionTable;
 email_sending: EmailSendingTable;
 task_state: TaskStateTable;
 accounts: AccountsTable;
 types: TypesTable;
 categories: CategoriesTable;
 client: ClientTable;
 income: IncomeTable;
 expense: ExpenseTable;
 transfer: TransferTable;
 schedule: ScheduleTable;
 type_categories_client: TypeCategoriesClientTable;
 attachments: AttachmentTable;
 task_attachments: TaskAttachmentsTable;
 task: TaskTable;
}

export type Database = Kysely<DatabaseSchema>;

// Adapter kysely (D4): lazy por construcción — NO se instancia en el
// arranque; el composition root lo invoca bajo demanda.
export function createDatabase(
 url: string = process.env.DATABASE_URL ?? "",
): Database {
 return new Kysely<DatabaseSchema>({
  dialect: new PostgresDialect({
   pool: new Pool({ connectionString: url }),
  }),
 });
}
