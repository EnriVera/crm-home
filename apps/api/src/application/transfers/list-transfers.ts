import type { TransferRepository } from "../../domain/ports/transfer-repository";
import type { TransferRow } from "../../domain/tasks/types";

export interface ListTransfersInput {
    userId: string;
    search: string;
    dateFrom: string | null;
    dateTo: string | null;
    limit: number;
}

export interface ListTransfersDependencies {
    transferRepository: TransferRepository;
}

export class ListTransfers {
    constructor(private readonly deps: ListTransfersDependencies) {}

    async execute(input: ListTransfersInput): Promise<TransferRow[]> {
        const limit = Math.min(Math.max(input.limit, 1), 100);
        return this.deps.transferRepository.list({
            userId: input.userId,
            search: input.search.trim(),
            dateFrom: input.dateFrom,
            dateTo: input.dateTo,
            limit,
        });
    }
}
