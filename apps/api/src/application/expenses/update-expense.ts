import type { ExpenseRepository } from "../../domain/ports/expense-repository";
import type { AccountRepository } from "../../domain/ports/account-repository";
import type { CurrencyRepository } from "../../domain/ports/currency-repository";
import type { ExpenseRow } from "../../domain/types";
import { validateMovementCurrencyChange } from "../shared/finance-validation";
import { normalizeAmount } from "../shared/money";
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
  accountRepository: AccountRepository;
  currencyRepository: CurrencyRepository;
}

export class UpdateExpense {
  constructor(private readonly deps: UpdateExpenseDependencies) {}

  async execute(input: UpdateExpenseInput): Promise<ExpenseRow> {
    if (input.amount !== undefined) {
      input = { ...input, amount: normalizeAmount(input.amount.trim()) };
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

    // La cuenta y la moneda del movimiento tienen que quedar emparejadas:
    // el balance de la cuenta suma sus movimientos, así que un gasto en
    // otra moneda dejaría el balance en una suma sin sentido.
    if (input.accountId !== undefined || input.currencyId !== undefined) {
      const current = await this.deps.expenseRepository.findById({
        userId: input.userId,
        expenseId: input.expenseId,
      });
      if (!current) {
        throw new ExpenseNotFound();
      }
      await validateMovementCurrencyChange(
        this.deps,
        {
          userId: input.userId,
          currentAccountId: current.accountId,
          currentCurrencyId: current.currencyId,
          accountId: input.accountId,
          currencyId: input.currencyId,
        },
        (message) => new InvalidExpenseInput(message),
      );
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
