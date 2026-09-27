import type {
  IncomeRepository,
  IncomeRow,
} from "../../domain/ports/income-repository";
import { InvalidIncomeInput } from "./errors";

export interface CreateIncomeInput {
  userId: string;
  accountId: string;
  amount: string;
  currencyId: string;
  description: string | null;
  category: string | null;
  date: string;
}

export interface CreateIncomeDependencies {
  incomeRepository: IncomeRepository;
}

/**
 * Caso de uso: crear un income (entrada de plata a una cuenta).
 *
 * Validaciones (defensa en profundidad — el Zod del contract ya las hace):
 * - amount > 0 (regex + refine en el schema; aquí re-validamos como número)
 * - accountId y currencyId son UUIDs (regex en el schema)
 * - date formato YYYY-MM-DD (regex en el schema)
 * - description max 500, category max 100
 *
 * El repo aplica el CHECK constraint `inco_amount > 0` a nivel DB. Si la
 * validación client-side pasara pero la DB rechazara (race condition),
 * el repo tira via `executeTakeFirstOrThrow` → traducimos a InvalidIncomeInput.
 */
export class CreateIncome {
  constructor(private readonly deps: CreateIncomeDependencies) {}

  async execute(input: CreateIncomeInput): Promise<IncomeRow> {
    const amount = input.amount.trim();
    const numAmount = Number(amount);
    if (!Number.isFinite(numAmount) || numAmount <= 0) {
      throw new InvalidIncomeInput("amount must be a positive number");
    }
    // Re-normalizar el amount a 4 decimales (estilo NUMERIC(19,4) de Postgres)
    const normalized = numAmount.toFixed(4);

    if (input.description !== null && input.description.length > 500) {
      throw new InvalidIncomeInput("description exceeds 500 chars");
    }
    if (input.category !== null && input.category.length > 100) {
      throw new InvalidIncomeInput("category exceeds 100 chars");
    }

    return this.deps.incomeRepository.insert({
      userId: input.userId,
      accountId: input.accountId,
      amount: normalized,
      currencyId: input.currencyId,
      description: input.description,
      category: input.category,
      date: input.date,
    });
  }
}
