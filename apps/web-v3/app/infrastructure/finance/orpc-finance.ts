/**
 * Finance adapter: the only place that talks to the API about money
 * (incomes and accounts today, PRD-v4 §8.7).
 *
 * The API speaks snake_case on the wire and the domain speaks camelCase,
 * so the mapping lives here and nowhere else (PRD-v4 §11.4).
 */
import { callAccounts, callFinance } from "~/shared/vendor/orpc";
import type {
  Account,
  Expense,
  Income,
  Transfer,
} from "~/domain/finance/entities";

/* ------------------------------------------------------------------ */
/*  Incomes                                                            */
/* ------------------------------------------------------------------ */

function toIncome(wire: {
  inco_id: string;
  inco_account_id: string;
  inco_amount: string;
  inco_currency_id: string;
  inco_description: string | null;
  inco_category: string | null;
  inco_date: string;
  inco_created_at: string;
}): Income {
  return {
    id: wire.inco_id,
    accountId: wire.inco_account_id,
    amount: Number(wire.inco_amount),
    currencyId: wire.inco_currency_id,
    description: wire.inco_description,
    category: wire.inco_category,
    date: wire.inco_date,
    createdAt: new Date(wire.inco_created_at),
  };
}

/** Every income of the user (the API caps the page at 100). */
export async function listIncomes(): Promise<Income[]> {
  const wire = await callFinance("income.list", { limit: 100 });
  return wire.map(toIncome);
}

/**
 * The API caps a page at 100 movements and orders them by date desc, so a
 * window with more movements than the cap comes back with only the newest
 * ones. Asking again for each half of the window returns every movement:
 * the halves are disjoint date ranges, so none is counted twice.
 */
const PAGE_SIZE = 100;

/** The date range a movement list is filtered by (inclusive on both ends). */
export interface MovementWindow {
  dateFrom: string;
  dateTo: string;
}

/** The day number of a wire date ("YYYY-MM-DD"), in UTC. */
function dayNumber(date: string): number {
  const year = Number(date.slice(0, 4));
  const month = Number(date.slice(5, 7));
  const day = Number(date.slice(8, 10));
  return Date.UTC(year, month - 1, day) / 86_400_000;
}

/** The wire date of a day number, in UTC. */
function dateOfDay(day: number): string {
  return new Date(day * 86_400_000).toISOString().slice(0, 10);
}

/**
 * Splits a window in two disjoint halves.
 *
 * `null` when the window is a single day: the API filters by date, so a
 * day cannot be split any further.
 */
function splitWindow(
  window: MovementWindow,
): [MovementWindow, MovementWindow] | null {
  const from = dayNumber(window.dateFrom);
  const to = dayNumber(window.dateTo);
  if (to <= from) return null;
  const middle = from + Math.floor((to - from) / 2);
  return [
    { dateFrom: window.dateFrom, dateTo: dateOfDay(middle) },
    { dateFrom: dateOfDay(middle + 1), dateTo: window.dateTo },
  ];
}

/**
 * Every movement of a window, complete.
 *
 * A window that comes back with a full page may be truncated: it is split
 * in halves and each half is asked again.
 */
async function listCompleteWindow<T>(
  fetchPage: (window: MovementWindow) => Promise<T[]>,
  window: MovementWindow,
): Promise<T[]> {
  const rows = await fetchPage(window);
  if (rows.length < PAGE_SIZE) return rows;
  const halves = splitWindow(window);
  // A single day that fills the page can't be split further: the API has
  // no cursor to walk the movements of one day.
  if (!halves) return rows;
  const [first, second] = await Promise.all([
    listCompleteWindow(fetchPage, halves[0]),
    listCompleteWindow(fetchPage, halves[1]),
  ]);
  return [...first, ...second];
}

/** Every income of the user inside a date window. */
export async function listIncomesInWindow(
  window: MovementWindow,
): Promise<Income[]> {
  const wire = await listCompleteWindow(
    (part) =>
      callFinance("income.list", {
        date_from: part.dateFrom,
        date_to: part.dateTo,
        limit: PAGE_SIZE,
      }),
    window,
  );
  return wire.map(toIncome);
}

export interface IncomeInput {
  accountId: string;
  /** Decimal > 0 con hasta 4 decimales (string decimal-safe). */
  amount: string;
  currencyId: string;
  description: string | null;
  /** "YYYY-MM-DD" */
  date: string;
}

export async function createIncome(input: IncomeInput): Promise<Income> {
  const wire = await callFinance("income.create", {
    inco_account_id: input.accountId,
    inco_amount: input.amount,
    inco_currency_id: input.currencyId,
    inco_description: input.description,
    inco_date: input.date,
  });
  return toIncome(wire);
}

export async function updateIncome(
  input: Partial<IncomeInput> & { id: string },
): Promise<Income> {
  const wire = await callFinance("income.update", {
    inco_id: input.id,
    ...(input.accountId !== undefined
      ? { inco_account_id: input.accountId }
      : {}),
    ...(input.amount !== undefined ? { inco_amount: input.amount } : {}),
    ...(input.currencyId !== undefined
      ? { inco_currency_id: input.currencyId }
      : {}),
    ...(input.description !== undefined
      ? { inco_description: input.description }
      : {}),
    ...(input.date !== undefined ? { inco_date: input.date } : {}),
  });
  return toIncome(wire);
}

export async function removeIncome(id: string): Promise<void> {
  await callFinance("income.remove", { inco_id: id });
}

/* ------------------------------------------------------------------ */
/*  Expenses                                                           */
/* ------------------------------------------------------------------ */

function toExpense(wire: {
  expe_id: string;
  expe_account_id: string;
  expe_amount: string;
  expe_currency_id: string;
  expe_description: string | null;
  expe_category: string | null;
  expe_date: string;
  expe_receipt_url: string | null;
  expe_created_at: string;
}): Expense {
  return {
    id: wire.expe_id,
    accountId: wire.expe_account_id,
    amount: Number(wire.expe_amount),
    currencyId: wire.expe_currency_id,
    description: wire.expe_description,
    category: wire.expe_category,
    receiptUrl: wire.expe_receipt_url,
    date: wire.expe_date,
    createdAt: new Date(wire.expe_created_at),
  };
}

export async function listExpenses(): Promise<Expense[]> {
  const wire = await callFinance("expense.list", { limit: 100 });
  return wire.map(toExpense);
}

/** Every expense of the user inside a date window. */
export async function listExpensesInWindow(
  window: MovementWindow,
): Promise<Expense[]> {
  const wire = await listCompleteWindow(
    (part) =>
      callFinance("expense.list", {
        date_from: part.dateFrom,
        date_to: part.dateTo,
        limit: PAGE_SIZE,
      }),
    window,
  );
  return wire.map(toExpense);
}

export interface ExpenseInput {
  accountId: string;
  /** Decimal > 0 con hasta 4 decimales (string decimal-safe). */
  amount: string;
  currencyId: string;
  description: string | null;
  category: string | null;
  receiptUrl: string | null;
  /** "YYYY-MM-DD" */
  date: string;
}

export async function createExpense(input: ExpenseInput): Promise<Expense> {
  const wire = await callFinance("expense.create", {
    expe_account_id: input.accountId,
    expe_amount: input.amount,
    expe_currency_id: input.currencyId,
    expe_description: input.description,
    expe_category: input.category,
    expe_receipt_url: input.receiptUrl,
    expe_date: input.date,
  });
  return toExpense(wire);
}

export async function updateExpense(
  input: Partial<ExpenseInput> & { id: string },
): Promise<Expense> {
  const wire = await callFinance("expense.update", {
    expe_id: input.id,
    ...(input.accountId !== undefined
      ? { expe_account_id: input.accountId }
      : {}),
    ...(input.amount !== undefined ? { expe_amount: input.amount } : {}),
    ...(input.currencyId !== undefined
      ? { expe_currency_id: input.currencyId }
      : {}),
    ...(input.description !== undefined
      ? { expe_description: input.description }
      : {}),
    ...(input.category !== undefined ? { expe_category: input.category } : {}),
    ...(input.receiptUrl !== undefined
      ? { expe_receipt_url: input.receiptUrl }
      : {}),
    ...(input.date !== undefined ? { expe_date: input.date } : {}),
  });
  return toExpense(wire);
}

export async function removeExpense(id: string): Promise<void> {
  await callFinance("expense.remove", { expe_id: id });
}

/* ------------------------------------------------------------------ */
/*  Transfers                                                          */
/* ------------------------------------------------------------------ */

function toTransfer(wire: {
  tran_id: string;
  tran_from_account_id: string;
  tran_to_account_id: string;
  tran_amount: string;
  tran_currency_id: string;
  tran_description: string | null;
  tran_date: string;
  tran_created_at: string;
}): Transfer {
  return {
    id: wire.tran_id,
    fromAccountId: wire.tran_from_account_id,
    toAccountId: wire.tran_to_account_id,
    amount: Number(wire.tran_amount),
    currencyId: wire.tran_currency_id,
    description: wire.tran_description,
    date: wire.tran_date,
    createdAt: new Date(wire.tran_created_at),
  };
}

export async function listTransfers(): Promise<Transfer[]> {
  const wire = await callFinance("transfer.list", { limit: 100 });
  return wire.map(toTransfer);
}

export interface TransferInput {
  fromAccountId: string;
  toAccountId: string;
  /** Decimal > 0 con hasta 4 decimales (string decimal-safe). */
  amount: string;
  currencyId: string;
  description: string | null;
  /** "YYYY-MM-DD" */
  date: string;
}

export async function createTransfer(input: TransferInput): Promise<Transfer> {
  const wire = await callFinance("transfer.create", {
    tran_from_account_id: input.fromAccountId,
    tran_to_account_id: input.toAccountId,
    tran_amount: input.amount,
    tran_currency_id: input.currencyId,
    tran_description: input.description,
    tran_date: input.date,
  });
  return toTransfer(wire);
}

export async function updateTransfer(
  input: Partial<TransferInput> & { id: string },
): Promise<Transfer> {
  const wire = await callFinance("transfer.update", {
    tran_id: input.id,
    ...(input.fromAccountId !== undefined
      ? { tran_from_account_id: input.fromAccountId }
      : {}),
    ...(input.toAccountId !== undefined
      ? { tran_to_account_id: input.toAccountId }
      : {}),
    ...(input.amount !== undefined ? { tran_amount: input.amount } : {}),
    ...(input.currencyId !== undefined
      ? { tran_currency_id: input.currencyId }
      : {}),
    ...(input.description !== undefined
      ? { tran_description: input.description }
      : {}),
    ...(input.date !== undefined ? { tran_date: input.date } : {}),
  });
  return toTransfer(wire);
}

export async function removeTransfer(id: string): Promise<void> {
  await callFinance("transfer.remove", { tran_id: id });
}

/* ------------------------------------------------------------------ */
/*  Accounts                                                           */
/* ------------------------------------------------------------------ */

function toAccount(wire: {
  acco_id: string;
  acco_name: string;
  acco_icon: string | null;
  acco_color: string | null;
  acco_currency_id: string;
  acco_initial_amount: string;
  acco_balance: string;
  acco_created_at: string;
}): Account {
  return {
    id: wire.acco_id,
    name: wire.acco_name,
    icon: wire.acco_icon,
    color: wire.acco_color,
    currencyId: wire.acco_currency_id,
    initialAmount: Number(wire.acco_initial_amount),
    balance: Number(wire.acco_balance),
    createdAt: new Date(wire.acco_created_at),
  };
}

/** Las cuentas del usuario con su balance calculado (PRD-v2 §8.6). */
export async function listAccounts(): Promise<Account[]> {
  const wire = await callAccounts("accounts.list", undefined);
  return wire.map(toAccount);
}

export interface AccountInput {
  name: string;
  icon: string | null;
  color: string | null;
  currencyId: string;
  /** Decimal ≥ 0 con hasta 4 decimales (string decimal-safe). */
  initialAmount: string;
}

export async function createAccount(input: AccountInput): Promise<Account> {
  const wire = await callAccounts("accounts.create", {
    acco_name: input.name,
    acco_icon: input.icon,
    acco_color: input.color,
    acco_currency_id: input.currencyId,
    acco_initial_amount: input.initialAmount,
  });
  return toAccount(wire);
}
