import type { IncomeRepository, IncomeRow } from "../../domain/ports/income-repository";

export interface ListIncomesInput {
  userId: string;
  search: string;
  dateFrom: string | null;
  dateTo: string | null;
  limit: number;
}

export interface ListIncomesDependencies {
  incomeRepository: IncomeRepository;
}

/**
 * Caso de uso: listar incomes del user con filtros opcionales.
 *
 * Filtros: search (ILIKE en description/category) + rango de fechas
 * (inco_date entre dateFrom y dateTo). El repo aplica la cap a `min(limit, 100)`
 * y filtra `inco_deleted_at IS NULL`.
 *
 * Los filtros se validan en el Zod del contract (search max 100, dates formato
 * YYYY-MM-DD, limit 1-100). El use case solo normaliza el limit.
 */
export class ListIncomes {
  constructor(private readonly deps: ListIncomesDependencies) {}

  async execute(input: ListIncomesInput): Promise<IncomeRow[]> {
    const limit = Math.min(Math.max(input.limit, 1), 100);
    return this.deps.incomeRepository.list({
      userId: input.userId,
      search: input.search.trim(),
      dateFrom: input.dateFrom,
      dateTo: input.dateTo,
      limit,
    });
  }
}
