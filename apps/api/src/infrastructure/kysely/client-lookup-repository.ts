import type { ClientLookupRepository } from "../../domain/ports/client-lookup-repository";
import type { ClientRow } from "../../domain/types";
import type { Database } from "./database";
import { mapClientRow, type ClientDbRow } from "./_mappers";

/**
 * Lookup de clientes autocompletables por nombre.
 * Usa `ILIKE` case-insensitive sobre `clie_name` (contiene, no prefijo: el
 * autocompletado busca en medio del nombre), filtra por `clie_user_id`
 * (multi-user isolation) y trunca a `min(limit, 100)`: el tope es el
 * `max` del contrato (`clientLimitSchema`), no un número redondo menor.
 * El autocompletado de tareas se sigue acotando a 50 por su propio
 * schema (`listClientsSearchInputSchema`), no por este repo.
 */
export class KyselyClientLookupRepository implements ClientLookupRepository {
  constructor(private readonly db: Database) {}

  async searchByName(params: {
    userId: string;
    query: string;
    limit: number;
  }): Promise<ClientRow[]> {
    const query = params.query.trim();
    const cappedLimit = Math.min(Math.max(params.limit, 1), 100);
    // Una query vacía matchea todos los clientes del usuario: el filtro
    // se omite en vez de escanear con `%   %`.
    const base = this.db
      .selectFrom("client")
      .selectAll()
      .where("clie_user_id", "=", params.userId)
      .where("clie_deleted_at", "is", null);
    const rows = await (query.length > 0
      ? base.where("clie_name", "ilike", `%${query}%`)
      : base
    )
      .limit(cappedLimit)
      .execute();
    return rows.map((row) => mapClientRow(row as ClientDbRow));
  }
}
