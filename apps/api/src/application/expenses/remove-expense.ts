import type {
  ExpenseRepository,
} from "../../domain/ports/expense-repository";
import type { ExpenseRow } from "../../domain/tasks/types";
import { ExpenseNotFound } from "./errors";

export interface RemoveExpenseInput {
  userId: string;
  expenseId: string;
}

export interface RemoveExpenseDependencies {
  expenseRepository: ExpenseRepository;
}

export class RemoveExpense {
  constructor(private readonly deps: RemoveExpenseDependencies) {}

  async execute(input: RemoveExpenseInput): Promise<ExpenseRow> {
    try {
      return await this.deps.expenseRepository.softDelete(input);
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
