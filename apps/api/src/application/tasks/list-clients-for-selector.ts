import type { ClientLookupRepository } from "../../domain/ports/client-lookup-repository";
import type { ClientRow } from "../../domain/tasks/types";

export interface ListClientsForSelectorInput {
  userId: string;
  query: string;
  limit?: number;
}

export interface ListClientsForSelectorDependencies {
  clientLookupRepository: ClientLookupRepository;
}

/**
 * Caso de uso: autocomplete de clientes por prefijo de nombre (case-insensitive).
 * El adapter trunca a `limit` con cap 50; este caso de uso aplica el cap explícito.
 */
export class ListClientsForSelector {
  constructor(private readonly deps: ListClientsForSelectorDependencies) {}

  async execute(input: ListClientsForSelectorInput): Promise<ClientRow[]> {
    const limit = Math.min(input.limit ?? 50, 50);
    return this.deps.clientLookupRepository.searchByNamePrefix({
      userId: input.userId,
      query: input.query,
      limit,
    });
  }
}
