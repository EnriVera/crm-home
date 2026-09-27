import type { ExpenseRepository } from "../../domain/ports/expense-repository";
import type { ExpenseRow } from "../../domain/tasks/types";

export interface ListExpensesInput {
    userId: string;
    search: string;
    dateFrom: string | null;
    dateTo: string | null;
    limit: number;
}

export interface ListExpensesDependencies {
    expenseRepository: ExpenseRepository;
}

export class ListExpenses {
    constructor(private readonly deps: ListExpensesDependencies) {}

    async execute(input: ListExpensesInput): Promise<ExpenseRow[]> {
        const limit = Math.min(Math.max(input.limit, 1), 100);
        return this.deps.expenseRepository.list({
            userId: input.userId,
            search: input.search.trim(),
            dateFrom: input.dateFrom,
            dateTo: input.dateTo,
            limit,
        });
    }
}
