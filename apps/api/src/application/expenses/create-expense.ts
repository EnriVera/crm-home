import type {
  ExpenseRepository,
} from "../../domain/ports/expense-repository";
import type { ExpenseRow } from "../../domain/tasks/types";
import { InvalidExpenseInput } from "./errors";

export interface CreateExpenseInput {
  userId: string;
  accountId: string;
  amount: string;
  currencyId: string;
  description: string | null;
  category: string | null;
  date: string;
  receiptUrl: string | null;
}

export interface CreateExpenseDependencies {
  expenseRepository: ExpenseRepository;
}

export class CreateExpense {
  constructor(private readonly deps: CreateExpenseDependencies) {}

  async execute(input: CreateExpenseInput): Promise<ExpenseRow> {
    const amount = input.amount.trim();
    const numAmount = Number(amount);
    if (!Number.isFinite(numAmount) || numAmount <= 0) {
      throw new InvalidExpenseInput("amount must be a positive number");
    }
    const normalized = numAmount.toFixed(4);

    if (input.description !== null && input.description.length > 500) {
      throw new InvalidExpenseInput("description exceeds 500 chars");
    }
    if (input.category !== null && input.category.length > 100) {
      throw new InvalidExpenseInput("category exceeds 100 chars");
    }
    if (input.receiptUrl !== null && input.receiptUrl.length > 2000) {
      throw new InvalidExpenseInput("receipt_url exceeds 2000 chars");
    }

    return this.deps.expenseRepository.insert({
      userId: input.userId,
      accountId: input.accountId,
      amount: normalized,
      currencyId: input.currencyId,
      description: input.description,
      category: input.category,
      date: input.date,
      receiptUrl: input.receiptUrl,
    });
  }
}
