import type { ClientLookupRepository } from "../../domain/ports/client-lookup-repository";
import type { ClientRow } from "../../domain/tasks/types";

export interface ListClientsInput {
  userId: string;
  search: string;
  limit: number;
}

export interface ListClientsDependencies {
  clientLookupRepository: ClientLookupRepository;
}

export class ListClients {
  constructor(private readonly deps: ListClientsDependencies) {}

  async execute(input: ListClientsInput): Promise<ClientRow[]> {
    const limit = Math.min(Math.max(input.limit, 1), 100);
    return this.deps.clientLookupRepository.searchByNamePrefix({
      userId: input.userId,
      query: input.search,
      limit,
    });
  }
}
