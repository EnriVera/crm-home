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
  type_module: string;
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
