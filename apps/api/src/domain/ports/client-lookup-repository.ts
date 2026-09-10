import type { ClientRow } from "../tasks/types";

/**
 * Lookup read-only: clientes autocompletables por prefijo de nombre.
 * Consumido por el form organism de tasks (WU11) vía endpoint `/tasks/clients.search`.
 */
export interface ClientLookupRepository {
  searchByNamePrefix(params: {
    userId: string;
    query: string;
    limit: number;
  }): Promise<ClientRow[]>;
}
