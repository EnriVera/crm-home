import type {
  IncomeRepository,
  IncomeRow,
} from "../../domain/ports/income-repository";
import type { AccountRepository } from "../../domain/ports/account-repository";
import type { CurrencyRepository } from "../../domain/ports/currency-repository";
import { validateMovementCurrencyChange } from "../shared/finance-validation";
import { normalizeAmount } from "../shared/money";
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
      input = { ...input, amount: normalizeAmount(input.amount.trim()) };
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

    // La cuenta y la moneda del movimiento tienen que quedar emparejadas:
    // el balance de la cuenta suma sus movimientos, así que un ingreso en
    // otra moneda dejaría el balance en una suma sin sentido.
    if (input.accountId !== undefined || input.currencyId !== undefined) {
      const current = await this.deps.incomeRepository.findById({
        userId: input.userId,
        incomeId: input.incomeId,
      });
      if (!current) {
        throw new IncomeNotFound();
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
        (message) => new InvalidIncomeInput(message),
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
