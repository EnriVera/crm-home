import type { TransferRow } from "../tasks/types";

/**
 * Puerto CRUD del módulo /transfers (movimientos de plata entre cuentas).
 *
 * Misma forma que IncomeRepository / ExpenseRepository, con la diferencia
 * de que tiene DOS accounts (from + to). El use case valida que ambas
 * cuentas existan + sean del mismo user + tengan la misma currency.
 */
export interface TransferRepository {
  list(params: {
    userId: string;
    search: string;
    dateFrom: string | null;
    dateTo: string | null;
    limit: number;
  }): Promise<TransferRow[]>;

  findById(params: {
    userId: string;
    transferId: string;
  }): Promise<TransferRow | null>;

  insert(params: {
    userId: string;
    fromAccountId: string;
    toAccountId: string;
    amount: string;
    currencyId: string;
    description: string | null;
    date: string;
  }): Promise<TransferRow>;

  update(params: {
    userId: string;
    transferId: string;
    fromAccountId?: string;
    toAccountId?: string;
    amount?: string;
    currencyId?: string;
    description?: string | null;
    date?: string;
  }): Promise<TransferRow>;

  softDelete(params: {
    userId: string;
    transferId: string;
  }): Promise<TransferRow>;
}
