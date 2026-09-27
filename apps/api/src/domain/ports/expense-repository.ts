import type { ExpenseRow } from "../tasks/types";

/**
 * Puerto CRUD del módulo /expenses (gastos: plata que sale de una cuenta).
 *
 * Misma forma que `IncomeRepository`, con un campo extra (`receiptUrl`).
 * Multi-tenant: filtra por user + `expe_deleted_at IS NULL`.
 */
export interface ExpenseRepository {
  list(params: {
    userId: string;
    search: string;
    dateFrom: string | null;
    dateTo: string | null;
    limit: number;
  }): Promise<ExpenseRow[]>;

  findById(params: {
    userId: string;
    expenseId: string;
  }): Promise<ExpenseRow | null>;

  insert(params: {
    userId: string;
    accountId: string;
    amount: string;
    currencyId: string;
    description: string | null;
    category: string | null;
    date: string;
    receiptUrl: string | null;
  }): Promise<ExpenseRow>;

  update(params: {
    userId: string;
    expenseId: string;
    accountId?: string;
    amount?: string;
    currencyId?: string;
    description?: string | null;
    category?: string | null;
    date?: string;
    receiptUrl?: string | null;
  }): Promise<ExpenseRow>;

  softDelete(params: {
    userId: string;
    expenseId: string;
  }): Promise<ExpenseRow>;
}
