import type {
  IncomeRepository,
  IncomeRow,
} from "../../domain/ports/income-repository";
import { IncomeNotFound } from "./errors";

export interface RemoveIncomeInput {
  userId: string;
  incomeId: string;
}

export interface RemoveIncomeDependencies {
  incomeRepository: IncomeRepository;
}

/**
 * Caso de uso: soft-delete de un income.
 *
 * El repo setea `inco_deleted_at = NOW()`. Si el income no existe o ya
 * estaba borrado, `softDelete` no encuentra la fila y tira → lo
 * traducimos a `IncomeNotFound` (404 en el handler).
 */
export class RemoveIncome {
  constructor(private readonly deps: RemoveIncomeDependencies) {}

  async execute(input: RemoveIncomeInput): Promise<IncomeRow> {
    try {
      return await this.deps.incomeRepository.softDelete(input);
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
