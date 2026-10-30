import type {
  IncomeRepository,
  IncomeRow,
} from "../../domain/ports/income-repository";
import type { AccountRepository } from "../../domain/ports/account-repository";
import type { CurrencyRepository } from "../../domain/ports/currency-repository";
import {
  assertCurrencyExists,
  assertOwnedAccount,
} from "../shared/finance-validation";
import { IncomeNotFound, InvalidIncomeInput } from "./errors";

export interface UpdateIncomeInput {
  userId: string;
  incomeId: string;
  accountId?: string;
  amount?: string;
  currencyId?: string;
  description?: string | null;
  category?: string | null;
  date?: string;
}

export interface UpdateIncomeDependencies {
  incomeRepository: IncomeRepository;
  accountRepository: AccountRepository;
  currencyRepository: CurrencyRepository;
}

/**
 * Caso de uso: actualizar parcialmente un income.
 *
 * Solo se actualizan los campos provistos. El repo ya filtra por user + id +
 * `inco_deleted_at IS NULL`, por lo que un income que no existe o pertenece
 * a otro user hace que `update` retorne "no row" → lo traducimos a
 * `IncomeNotFound`.
 *
 * Validaciones de longitud (mismas que CreateIncome) se aplican acá
 * también para defensa en profundidad.
 */
export class UpdateIncome {
  constructor(private readonly deps: UpdateIncomeDependencies) {}

  async execute(input: UpdateIncomeInput): Promise<IncomeRow> {
    if (input.amount !== undefined) {
      const trimmed = input.amount.trim();
      const numAmount = Number(trimmed);
      if (!Number.isFinite(numAmount) || numAmount <= 0) {
        throw new InvalidIncomeInput("amount must be a positive number");
      }
      input = { ...input, amount: numAmount.toFixed(4) };
    }
    if (
      input.description !== undefined &&
      input.description !== null &&
      input.description.length > 500
    ) {
      throw new InvalidIncomeInput("description exceeds 500 chars");
    }
    if (
      input.category !== undefined &&
      input.category !== null &&
      input.category.length > 100
    ) {
      throw new InvalidIncomeInput("category exceeds 100 chars");
    }

    // Si la cuenta o la moneda cambian, se validan igual: la cuenta
    // tiene que seguir siendo del usuario.
    if (input.accountId !== undefined) {
      await assertOwnedAccount(
        this.deps,
        { userId: input.userId, accountId: input.accountId },
        (message) => new InvalidIncomeInput(message),
      );
    }
    if (input.currencyId !== undefined) {
      await assertCurrencyExists(this.deps, input.currencyId, (message) =>
        new InvalidIncomeInput(message),
      );
    }

    try {
      return await this.deps.incomeRepository.update(input);
    } catch (err) {
      if (
        err instanceof Error &&
        (err.message.includes("no result") || err.message.includes("not found"))
      ) {
        throw new IncomeNotFound();
      }
      throw err;
    }
  }
}
