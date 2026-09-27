import type { ExpenseRepository } from "../../domain/ports/expense-repository";
import type { ExpenseRow } from "../../domain/tasks/types";
import { ExpenseNotFound, InvalidExpenseInput } from "./errors";

export interface UpdateExpenseInput {
  userId: string;
  expenseId: string;
  accountId?: string;
  amount?: string;
  currencyId?: string;
  description?: string | null;
  category?: string | null;
  date?: string;
  receiptUrl?: string | null;
}

export interface UpdateExpenseDependencies {
  expenseRepository: ExpenseRepository;
}

export class UpdateExpense {
  constructor(private readonly deps: UpdateExpenseDependencies) {}

  async execute(input: UpdateExpenseInput): Promise<ExpenseRow> {
    if (input.amount !== undefined) {
      const trimmed = input.amount.trim();
      const numAmount = Number(trimmed);
      if (!Number.isFinite(numAmount) || numAmount <= 0) {
        throw new InvalidExpenseInput("amount must be a positive number");
      }
      input = { ...input, amount: numAmount.toFixed(4) };
    }
    if (
      input.description !== undefined &&
      input.description !== null &&
      input.description.length > 500
    ) {
      throw new InvalidExpenseInput("description exceeds 500 chars");
    }
    if (
      input.category !== undefined &&
      input.category !== null &&
      input.category.length > 100
    ) {
      throw new InvalidExpenseInput("category exceeds 100 chars");
    }
    if (
      input.receiptUrl !== undefined &&
      input.receiptUrl !== null &&
      input.receiptUrl.length > 2000
    ) {
      throw new InvalidExpenseInput("receipt_url exceeds 2000 chars");
    }

    try {
      return await this.deps.expenseRepository.update(input);
    } catch (err) {
      if (
        err instanceof Error &&
        (err.message.includes("no result") || err.message.includes("not found"))
      ) {
        throw new ExpenseNotFound();
      }
      throw err;
    }
  }
}
