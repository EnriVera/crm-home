import type { ClientLookupRepository } from "../../domain/ports/client-lookup-repository";
import type { Transaction } from "../../domain/ports/transaction";
import type { ClientRow } from "../../domain/tasks/types";
import type { Database } from "./database";
import { mapClientRow, type ClientDbRow } from "./_mappers";

/**
 * Lookup de clientes autocompletables por prefijo de nombre.
 * Usa `ILIKE` case-insensitive sobre `clie_name`, filtra por `clie_user_id`
 * (multi-user isolation) y trunca a `min(limit, 50)` para evitar respuestas
 * gigantes.
 */
export class KyselyClientLookupRepository implements ClientLookupRepository {
  constructor(private readonly db: Database) {}

  async searchByNamePrefix(params: {
    userId: string;
    query: string;
    limit: number;
  }): Promise<ClientRow[]> {
    const cappedLimit = Math.min(params.limit, 50);
    const rows = await this.db
      .selectFrom("client")
      .selectAll()
      .where("clie_user_id", "=", params.userId)
      .where("clie_deleted_at", "is", null)
      .where("clie_name", "ilike", `%${params.query}%`)
      .limit(cappedLimit)
      .execute();
    return rows.map((row) => mapClientRow(row as ClientDbRow));
  }

  // Lookup repos no reciben `trx?` en su contrato (son read-only),
  // pero aceptamos el parámetro para homogeneidad de la firma.
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  private unused(_trx?: Transaction): void {}
}
