/**
 * orpc client: the only place in web-v3 that imports @orpc/client.
 *
 * PRD-v4 §10.3 makes app/shared/vendor/ the single door to third-party
 * libraries, so the transport lives here and every consumer goes through the
 * narrow `callAuth` / `callTasks` / `callConfig` surfaces instead of the raw
 * client.
 */
import { createORPCClient, type NestedClient } from "@orpc/client";
import { RPCLink } from "@orpc/client/fetch";
import type { SessionUser } from "@crm/contract/auth";
import type { TaskStateWire, TaskWire } from "@crm/contract/task";

/**
 * The wire shape of a client, as the API returns it.
 *
 * The `Client` entity of `@crm/contract/client` is camelCase (id, name…);
 * the wire is snake_case, so the shape is spelled out here.
 */
export interface ClientWire {
  client_id: string;
  client_name: string;
  client_email: string | null;
  client_phone: string | null;
  client_created_at: string;
  client_updated_at: string;
}

export type { TaskStateWire, TaskWire } from "@crm/contract/task";

/** The auth procedures this app talks to (PRD-v4 §11.1). */
export type AuthProcedure =
  | "requestOtp"
  | "verifyOtp"
  | "session"
  | "logout"
  | "updateTheme";

export interface AuthProcedureMap {
  requestOtp: {
    input: { email: string };
    output: { ok: true };
  };
  verifyOtp: {
    input: { email: string; code: string };
    output: { verdict: "valid" | "invalid" | "expired" };
  };
  session: {
    input: undefined;
    output: { user: SessionUser };
  };
  logout: {
    input: undefined;
    output: { ok: true };
  };
  updateTheme: {
    input: { setting: "light" | "dark" | "system" };
    output: { user: SessionUser };
  };
}

/** The task procedures this app talks to (PRD-v4 §8.4). */
export type TaskProcedure =
  | "list"
  | "create"
  | "update"
  | "move"
  | "remove"
  | "states.list";

export interface TaskProcedureMap {
  list: {
    input: { search?: string };
    output: TaskWire[];
  };
  create: {
    input: {
      task_title: string;
      task_description?: string | null;
      task_tast_id?: string;
      task_type_id?: string | null;
      task_cate_id?: string | null;
      task_clie_id?: string | null;
    };
    output: TaskWire;
  };
  update: {
    input: {
      task_id: string;
      task_title?: string;
      task_description?: string | null;
      task_type_id?: string | null;
      task_cate_id?: string | null;
      task_clie_id?: string | null;
    };
    output: TaskWire;
  };
  move: {
    input: {
      task_id: string;
      target_state_id: string;
      prev_task_id?: string;
      next_task_id?: string;
    };
    output: TaskWire;
  };
  remove: {
    input: { task_id: string };
    output: { ok: true };
  };
  "states.list": {
    input: undefined;
    output: TaskStateWire[];
  };
}

/** The finance procedures this app talks to (dashboard money cards). */
export type FinanceProcedure =
  | "income.list"
  | "income.create"
  | "income.update"
  | "income.remove"
  | "expense.list"
  | "expense.create"
  | "expense.update"
  | "expense.remove"
  | "transfer.list"
  | "transfer.create"
  | "transfer.update"
  | "transfer.remove";

export interface FinanceProcedureMap {
  "income.list": {
    input: {
      search?: string;
      date_from?: string | null;
      date_to?: string | null;
      limit?: number;
    };
    output: IncomeWire[];
  };
  "income.create": {
    input: {
      inco_account_id: string;
      inco_amount: string;
      inco_currency_id: string;
      inco_description?: string | null;
      inco_date: string;
    };
    output: IncomeWire;
  };
  "income.update": {
    input: {
      inco_id: string;
      inco_account_id?: string;
      inco_amount?: string;
      inco_currency_id?: string;
      inco_description?: string | null;
      inco_date?: string;
    };
    output: IncomeWire;
  };
  "income.remove": {
    input: { inco_id: string };
    output: { ok: true };
  };
  "expense.list": {
    input: {
      search?: string;
      date_from?: string | null;
      date_to?: string | null;
      limit?: number;
    };
    output: ExpenseWire[];
  };
  "expense.create": {
    input: {
      expe_account_id: string;
      expe_amount: string;
      expe_currency_id: string;
      expe_description?: string | null;
      expe_category?: string | null;
      expe_receipt_url?: string | null;
      expe_date: string;
    };
    output: ExpenseWire;
  };
  "expense.update": {
    input: {
      expe_id: string;
      expe_account_id?: string;
      expe_amount?: string;
      expe_currency_id?: string;
      expe_description?: string | null;
      expe_category?: string | null;
      expe_receipt_url?: string | null;
      expe_date?: string;
    };
    output: ExpenseWire;
  };
  "expense.remove": {
    input: { expe_id: string };
    output: { ok: true };
  };
  "transfer.list": {
    input: {
      search?: string;
      date_from?: string | null;
      date_to?: string | null;
      limit?: number;
    };
    output: TransferWire[];
  };
  "transfer.create": {
    input: {
      tran_from_account_id: string;
      tran_to_account_id: string;
      tran_amount: string;
      tran_currency_id: string;
      tran_description?: string | null;
      tran_date: string;
    };
    output: TransferWire;
  };
  "transfer.update": {
    input: {
      tran_id: string;
      tran_from_account_id?: string;
      tran_to_account_id?: string;
      tran_amount?: string;
      tran_currency_id?: string;
      tran_description?: string | null;
      tran_date?: string;
    };
    output: TransferWire;
  };
  "transfer.remove": {
    input: { tran_id: string };
    output: { ok: true };
  };
}

/** The wire shape of an income, as the API returns it. */
export interface IncomeWire {
  inco_id: string;
  inco_account_id: string;
  inco_amount: string;
  inco_currency_id: string;
  inco_description: string | null;
  inco_category: string | null;
  inco_date: string;
  inco_created_at: string;
  inco_updated_at: string;
}

/** The wire shape of an account, as the API returns it. */
export interface AccountWire {
  acco_id: string;
  acco_name: string;
  acco_icon: string | null;
  acco_color: string | null;
  acco_currency_id: string;
  /** NUMERIC(19,4) como string (decimal-safe). */
  acco_initial_amount: string;
  /** Balance calculado por la API (PRD-v2 §8.6). */
  acco_balance: string;
  acco_created_at: string;
}

/** The wire shape of an expense, as the API returns it. */
export interface ExpenseWire {
  expe_id: string;
  expe_account_id: string;
  expe_amount: string;
  expe_currency_id: string;
  expe_description: string | null;
  expe_category: string | null;
  expe_date: string;
  expe_receipt_url: string | null;
  expe_created_at: string;
  expe_updated_at: string;
}

/** The wire shape of a transfer, as the API returns it. */
export interface TransferWire {
  tran_id: string;
  tran_from_account_id: string;
  tran_to_account_id: string;
  tran_amount: string;
  tran_currency_id: string;
  tran_description: string | null;
  tran_date: string;
  tran_created_at: string;
  tran_updated_at: string;
}

/** The timer procedures this app talks to (PRD-v4 §8.5). */
export type TimerProcedure = "current" | "start" | "stop" | "heartbeat" | "history";

export interface TimerProcedureMap {
  current: {
    input: undefined;
    output: TimerWire | null;
  };
  start: {
    input: {
      timer_title: string;
      timer_task_id?: string | null;
      timer_client_id?: string | null;
      timer_type_id?: string | null;
      timer_category_id?: string | null;
      timer_origin?: "manual" | "resumed";
    };
    output: TimerWire;
  };
  stop: {
    input: { timer_id: string };
    output: TimerWire;
  };
  heartbeat: {
    input: { timer_id: string };
    output: TimerWire;
  };
  history: {
    input: {
      timer_from?: string;
      timer_to?: string;
      timer_type_id?: string;
      timer_category_id?: string;
      timer_task_id?: string;
      timer_search?: string;
      timer_limit?: number;
    };
    output: TimerWire[];
  };
}

/** The wire shape of a timer run, as the API returns it. */
export interface TimerWire {
  timer_id: string;
  timer_title: string;
  timer_task_id: string | null;
  timer_client_id: string | null;
  timer_type_id: string | null;
  timer_category_id: string | null;
  timer_start: string;
  timer_end: string | null;
  timer_duration_seconds: number | null;
  timer_origin: "manual" | "resumed";
  timer_last_heartbeat: string | null;
}

/** The client procedures this app talks to (task drawer select). */
export type ClientProcedure =
  | "list"
  | "create"
  | "update"
  | "remove"
  | "dependencies";

export interface ClientProcedureMap {
  list: {
    input: { search?: string; limit?: number };
    output: ClientWire[];
  };
  create: {
    input: {
      client_name: string;
      client_email?: string | null;
      client_phone?: string | null;
    };
    output: ClientWire;
  };
  update: {
    input: {
      client_id: string;
      client_name?: string;
      client_email?: string | null;
      client_phone?: string | null;
    };
    output: ClientWire;
  };
  remove: {
    input: { client_id: string };
    output: { ok: true };
  };
  dependencies: {
    input: { client_id: string };
    output: {
      dependencies: { task_id: string; task_title: string }[];
      total: number;
    };
  };
}

/**
 * The config procedures this app talks to (PRD-v4 §8.8).
 *
 * `types.*` and `tasks.states.*` are the writable ones; `config.listApps` and
 * `config.listCurrencies` are the global read-only tables (PRD-v2 §8.7).
 */
export type ConfigProcedure =
  | "types.list"
  | "types.create"
  | "types.update"
  | "types.remove"
  | "states.list"
  | "states.create"
  | "states.update"
  | "states.remove"
  | "states.reorder"
  | "categories.list"
  | "categories.create"
  | "categories.update"
  | "categories.remove"
  | "listApps"
  | "listCurrencies"
  | "createCurrency";

/** The wire shape of a type, as the API returns it. */
export interface TypeWire {
  type_id: string;
  type_name: string;
  type_modules: string[];
  type_created_at: string;
}

/** The wire shape of a task state, as the API returns it. */
export interface TaskStateConfigWire {
  tast_id: string;
  tast_name: string;
  tast_order: number;
}

/** The wire shape of an app, as the API returns it. */
export interface AppWire {
  id: string;
  name: string;
}

/** The wire shape of a currency, as the API returns it. */
export interface CurrencyWire {
  id: string;
  name: string;
  symbol: string;
  decimals: number;
}

/** The wire shape of a category, as the API returns it. */
export interface CategoryWire {
  cate_id: string;
  cate_name: string;
  cate_type_id: string;
  cate_created_at: string;
}

export interface ConfigProcedureMap {
  "types.list": {
    input: { search?: string; modules?: string[]; limit?: number };
    output: TypeWire[];
  };
  "types.create": {
    input: { type_name: string; type_modules?: string[] };
    output: TypeWire;
  };
  "types.update": {
    input: { type_id: string; type_name?: string; type_modules?: string[] };
    output: TypeWire;
  };
  "types.remove": {
    input: { type_id: string };
    output: TypeWire;
  };
  "states.list": {
    input: undefined;
    output: TaskStateConfigWire[];
  };
  "states.create": {
    input: { tast_name: string; tast_order: number };
    output: TaskStateConfigWire;
  };
  "states.update": {
    input: { tast_id: string; tast_name?: string; tast_order?: number };
    output: TaskStateConfigWire;
  };
  "states.remove": {
    input: { tast_id: string };
    output: TaskStateConfigWire;
  };
  "states.reorder": {
    input: { tast_id: string; tast_order: number }[];
    output: { ok: true };
  };
  "categories.list": {
    input: { search?: string; typeId?: string | null; limit?: number };
    output: CategoryWire[];
  };
  "categories.create": {
    input: { cate_name: string; cate_type_id: string };
    output: CategoryWire;
  };
  "categories.update": {
    input: { cate_id: string; cate_name?: string; cate_type_id?: string };
    output: CategoryWire;
  };
  "categories.remove": {
    input: { cate_id: string };
    output: { ok: true };
  };
  listApps: {
    input: undefined;
    output: AppWire[];
  };
  listCurrencies: {
    input: undefined;
    output: CurrencyWire[];
  };
  createCurrency: {
    input: { name: string; symbol: string; decimals: number };
    output: CurrencyWire;
  };
}

const envApiUrl = import.meta.env.VITE_API_URL as string | undefined;
const baseURL = (envApiUrl ?? "http://localhost:3000").replace(/\/$/, "");

const link = new RPCLink({
  url: `${baseURL}/rpc`,
  headers: () => ({
    "Content-Type": "application/json",
  }),
  // The session lives in an httpOnly cookie the API sets on verifyOtp, and the
  // browser only sends it back when the request opts into credentials
  // (PRD-v2 §6.5). Without this every authenticated call reads as anonymous.
  fetch: (input, init) =>
    fetch(input, {
      ...init,
      credentials: "include",
    }),
});

const client = createORPCClient(link) as unknown as NestedClient<
  Record<string, unknown>
>;

/**
 * Walks the orpc client down a fixed path and calls the procedure found
 * there. The path is always a literal segment list, never user input: the
 * procedure name is the only variable part and it comes from a closed union.
 */
function callProcedure<Output>(
  segments: readonly string[],
  input: unknown,
): Promise<Output> {
  const fn = segments.reduce<unknown>(
    (acc, segment) => (acc as Record<string, unknown> | undefined)?.[segment],
    client as unknown as Record<string, unknown>,
  );

  if (typeof fn !== "function") {
    throw new Error(
      `orpc procedure ${segments.join(".")} is not registered in the client`,
    );
  }

  return (fn as (value: unknown) => Promise<Output>)(input);
}

/**
 * Calls one auth procedure. The backend exposes the auth context under the
 * `auth` segment of the orpc router, so the walk is fixed to that prefix
 * instead of accepting an arbitrary path.
 */
export function callAuth<P extends AuthProcedure>(
  procedure: P,
  input: AuthProcedureMap[P]["input"],
): Promise<AuthProcedureMap[P]["output"]> {
  return callProcedure<AuthProcedureMap[P]["output"]>(
    ["auth", procedure],
    input,
  );
}

/**
 * Calls one task procedure. The backend exposes the task context under the
 * `tasks` segment, with the state columns nested under `tasks.states`.
 */
export function callTasks<P extends TaskProcedure>(
  procedure: P,
  input: TaskProcedureMap[P]["input"],
): Promise<TaskProcedureMap[P]["output"]> {
  const segments =
    procedure === "states.list"
      ? ["tasks", "states", "list"]
      : ["tasks", procedure];
  return callProcedure<TaskProcedureMap[P]["output"]>(segments, input);
}

/**
 * Calls one finance procedure. Incomes live under `incomes` and expenses
 * under `expenses` in the orpc router.
 */
const FINANCE_SEGMENTS: Record<FinanceProcedure, readonly string[]> = {
  "income.list": ["incomes", "list"],
  "income.create": ["incomes", "create"],
  "income.update": ["incomes", "update"],
  "income.remove": ["incomes", "remove"],
  "expense.list": ["expenses", "list"],
  "expense.create": ["expenses", "create"],
  "expense.update": ["expenses", "update"],
  "expense.remove": ["expenses", "remove"],
  "transfer.list": ["transfers", "list"],
  "transfer.create": ["transfers", "create"],
  "transfer.update": ["transfers", "update"],
  "transfer.remove": ["transfers", "remove"],
};

export function callFinance<P extends FinanceProcedure>(
  procedure: P,
  input: FinanceProcedureMap[P]["input"],
): Promise<FinanceProcedureMap[P]["output"]> {
  return callProcedure<FinanceProcedureMap[P]["output"]>(
    FINANCE_SEGMENTS[procedure],
    input,
  );
}

/** Calls one accounts procedure. */
export type AccountProcedure = "accounts.list" | "accounts.create";

export interface AccountProcedureMap {
  "accounts.list": {
    input: undefined;
    output: AccountWire[];
  };
  "accounts.create": {
    input: {
      acco_name: string;
      acco_icon?: string | null;
      acco_color?: string | null;
      acco_currency_id: string;
      acco_initial_amount: string;
    };
    output: AccountWire;
  };
}

export function callAccounts<P extends AccountProcedure>(
  procedure: P,
  input: AccountProcedureMap[P]["input"],
): Promise<AccountProcedureMap[P]["output"]> {
  const segments =
    procedure === "accounts.list" ? ["accounts", "list"] : ["accounts", "create"];
  return callProcedure<AccountProcedureMap[P]["output"]>(segments, input);
}

/**
 * Calls one timer procedure. The timer lives under the `timers` segment of
 * the orpc router (it is NOT the `schedules` context, which holds the
 * recurring billing rules).
 */
export function callTimers<P extends TimerProcedure>(
  procedure: P,
  input: TimerProcedureMap[P]["input"],
): Promise<TimerProcedureMap[P]["output"]> {
  return callProcedure<TimerProcedureMap[P]["output"]>(
    ["timers", procedure],
    input,
  );
}

/**
 * Calls one client procedure. The backend exposes the client context
 * under the `clients` segment of the orpc router.
 */
export function callClients<P extends ClientProcedure>(
  procedure: P,
  input: ClientProcedureMap[P]["input"],
): Promise<ClientProcedureMap[P]["output"]> {
  return callProcedure<ClientProcedureMap[P]["output"]>(
    ["clients", procedure],
    input,
  );
}

/**
 * Calls the legacy `tasks/categories-by-type` endpoint. It is not in the
 * orpc contract: the handler reads its input from the QUERY STRING (not
 * the `{json}` body), so the regular callProcedure cannot reach it and
 * this raw fetch lives here, inside the vendor wrapper (PRD-v4 §10.3).
 */
export async function callCategoriesByType(typeId: string): Promise<
  { cate_id: string; cate_name: string; cate_type_id: string }[]
> {
  const response = await fetch(
    `${baseURL}/rpc/tasks/categories-by-type?type_id=${encodeURIComponent(typeId)}`,
    { method: "POST", headers: { "Content-Type": "application/json" }, credentials: "include", body: "{}" },
  );
  if (!response.ok) {
    throw new Error(`categories-by-type failed: ${response.status}`);
  }
  return (await response.json()) as {
    cate_id: string;
    cate_name: string;
    cate_type_id: string;
  }[];
}

/**
 * Calls one config procedure. The writable ones live under `types` (its own
 * context) and `tasks.states` (the columns live with the tasks); the global
 * read-only tables live under `config`.
 */
export function callConfig<P extends ConfigProcedure>(
  procedure: P,
  input: ConfigProcedureMap[P]["input"],
): Promise<ConfigProcedureMap[P]["output"]> {
  const segments = CONFIG_PROCEDURE_PATHS[procedure];
  return callProcedure<ConfigProcedureMap[P]["output"]>(segments, input);
}

const CONFIG_PROCEDURE_PATHS: Record<ConfigProcedure, readonly string[]> = {
  "types.list": ["types", "list"],
  "types.create": ["types", "create"],
  "types.update": ["types", "update"],
  "types.remove": ["types", "remove"],
  "states.list": ["tasks", "states", "list"],
  "states.create": ["tasks", "states", "create"],
  "states.update": ["tasks", "states", "update"],
  "states.remove": ["tasks", "states", "remove"],
  "states.reorder": ["tasks", "states", "reorder"],
  "categories.list": ["categories", "list"],
  "categories.create": ["categories", "create"],
  "categories.update": ["categories", "update"],
  "categories.remove": ["categories", "remove"],
  listApps: ["config", "listApps"],
  listCurrencies: ["config", "listCurrencies"],
  createCurrency: ["config", "createCurrency"],
};
