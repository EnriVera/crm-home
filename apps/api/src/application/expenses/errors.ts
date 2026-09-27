/**
 * Base común para errores del módulo expenses. Mismo patrón que
 * `incomes/errors.ts`.
 */
export abstract class ExpenseDomainError extends Error {
  abstract readonly code: string;
}

export class ExpenseNotFound extends ExpenseDomainError {
  readonly code = "EXPENSE_NOT_FOUND";

  constructor(message = "Expense not found") {
    super(message);
    this.name = "ExpenseNotFound";
  }
}

export class InvalidExpenseInput extends ExpenseDomainError {
  readonly code = "INVALID_EXPENSE_INPUT";

  constructor(message = "Invalid expense input") {
    super(message);
    this.name = "InvalidExpenseInput";
  }
}
