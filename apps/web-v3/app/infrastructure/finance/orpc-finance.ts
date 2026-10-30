/**
 * Finance adapter: the only place that talks to the API about money
 * (incomes and accounts today, PRD-v4 §8.7).
 *
 * The API speaks snake_case on the wire and the domain speaks camelCase,
 * so the mapping lives here and nowhere else (PRD-v4 §11.4).
 */
import { callAccounts, callFinance } from "~/shared/vendor/orpc";
import type { Account, Income } from "~/domain/finance/entities";

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
/*  Expenses (solo lo que el dashboard consume hoy)                    */
/* ------------------------------------------------------------------ */

/** A movement of money as the dashboard uses it (income or expense). */
export interface Movement {
  id: string;
  amount: number;
  currencyId: string;
  description: string | null;
  category: string | null;
  date: string;
}

export async function listExpenses(): Promise<Movement[]> {
  const wire = await callFinance("expense.list", { limit: 100 });
  return wire.map((expense) => ({
    id: expense.expe_id,
    amount: Number(expense.expe_amount),
    currencyId: expense.expe_currency_id,
    description: expense.expe_description,
    category: expense.expe_category,
    date: expense.expe_date,
  }));
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
