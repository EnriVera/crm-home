/**
 * Finance adapter: the only place that talks to the API about ingresos y
 * expenses (the money cards of the dashboard, PRD-v4 §8.3).
 */
import { callFinance } from "~/shared/vendor/orpc";

/** A movement of money (income or expense) as the dashboard uses it. */
export interface Movement {
  id: string;
  /** The amount as a number (the wire sends NUMERIC as text). */
  amount: number;
  currencyId: string;
  description: string | null;
  category: string | null;
  /** "2026-06-28" */
  date: string;
}

export async function listIncomes(): Promise<Movement[]> {
  const wire = await callFinance("income.list", { limit: 100 });
  return wire.map((income) => ({
    id: income.inco_id,
    amount: Number(income.inco_amount),
    currencyId: income.inco_currency_id,
    description: income.inco_description,
    category: income.inco_category,
    date: income.inco_date,
  }));
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
