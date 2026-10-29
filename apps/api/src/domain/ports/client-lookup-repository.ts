import type { ClientRow } from "../types";

/**
 * Lookup read-only: clientes autocompletables por prefijo de nombre.
 * Consumido por el form organism de tasks (WU11) vía endpoint `/tasks/clients.search`.
 */
export interface ClientLookupRepository {
  searchByName(params: {
    userId: string;
    query: string;
    limit: number;
  }): Promise<ClientRow[]>;
}
