import { sql, type Kysely, type Transaction } from "kysely";
import type { ClientRepository } from "../../domain/ports/client-repository.ts";
import type { ClientRow } from "../../domain/tasks/types.ts";
import type { Database } from "./database.ts";
import { mapClientRow, type ClientDbRow } from "./_mappers.ts";

/**
 * Adapter kysely de `ClientRepository`. Implementa las 4 operaciones CRUD
 * de /clients:
 *
 *  - `list`: filtro por user + search ILIKE sobre `clie_name`, cap a
 *    `min(limit, 50)` (mismo criterio que el lookup para no devolver
 *    respuestas gigantes).
 *  - `findById`: filtro por user + id + `clie_deleted_at IS NULL`. Retorna
 *    `null` si no existe o está borrado (los callers lo traducen a 404).
 *  - `insert`: genera UUID vía `gen_random_uuid()`, setea timestamps via
 *    `DEFAULT NOW()`. Retorna la fila creada.
 *  - `update`: solo actualiza los campos provistos (los `undefined` se
 *    omiten del UPDATE). Si no se pasa ningún campo, es no-op y retorna
 *    la fila sin cambios.
 *  - `softDelete`: setea `clie_deleted_at = NOW()`. Idempotente: si ya
 *    estaba borrado, actualiza la fecha de todos modos (operación
 *    consistente con `update`).
 *
 * Multi-tenant isolation: TODAS las queries filtran por `clie_user_id`
 * (inyectado por el handler desde el dispatch wrapper). Nunca aceptar
 * un `userId` del input del cliente.
 *
 * Todas las operaciones aceptan opcionalmente una transacción para
 * componer con otras en el mismo `trx`.
 */
export class KyselyClientRepository implements ClientRepository {
  constructor(private readonly db: Kysely<Database>) {}

  private dbOrTrx(trx?: Transaction<Database>): Kysely<Database> | Transaction<Database> {
    return trx ?? this.db;
  }

  async list(params: {
    userId: string;
    search: string;
    limit: number;
  }): Promise<ClientRow[]> {
    const cappedLimit = Math.min(params.limit, 50);
    const rows = await this.db
      .selectFrom("client")
      .selectAll()
      .where("clie_user_id", "=", params.userId)
      .where("clie_deleted_at", "is", null)
      .where("clie_name", "ilike", `%${params.search}%`)
      .limit(cappedLimit)
      .execute();
    return rows.map((row) => mapClientRow(row as ClientDbRow));
  }

  async findById(params: {
    userId: string;
    clientId: string;
  }): Promise<ClientRow | null> {
    const row = await this.db
      .selectFrom("client")
      .selectAll()
      .where("clie_user_id", "=", params.userId)
      .where("clie_id", "=", params.clientId)
      .where("clie_deleted_at", "is", null)
      .executeTakeFirst();
    return row ? mapClientRow(row as ClientDbRow) : null;
  }

  async insert(params: {
    userId: string;
    name: string;
    email: string | null;
    phone: string | null;
  }): Promise<ClientRow> {
    const row = await this.db
      .insertInto("client")
      .values({
        clie_id: sql<string>`gen_random_uuid()`,
        clie_user_id: params.userId,
        clie_name: params.name,
        clie_email: params.email,
        clie_phone: params.phone,
        clie_areaphone: null,
        clie_updated_at: sql<Date>`NOW()`,
      })
      .returningAll()
      .executeTakeFirstOrThrow();
    return mapClientRow(row as ClientDbRow);
  }

  async update(params: {
    userId: string;
    clientId: string;
    name?: string;
    email?: string | null;
    phone?: string | null;
  }): Promise<ClientRow> {
    const setValues: Partial<{
      clie_name: string;
      clie_email: string | null;
      clie_phone: string | null;
      clie_updated_at: Date;
    }> = {};
    if (params.name !== undefined) setValues.clie_name = params.name;
    if (params.email !== undefined) setValues.clie_email = params.email;
    if (params.phone !== undefined) setValues.clie_phone = params.phone;
    setValues.clie_updated_at = new Date();

    const row = await this.db
      .updateTable("client")
      .set(setValues)
      .where("clie_user_id", "=", params.userId)
      .where("clie_id", "=", params.clientId)
      .where("clie_deleted_at", "is", null)
      .returningAll()
      .executeTakeFirstOrThrow();
    return mapClientRow(row as ClientDbRow);
  }

  async softDelete(params: {
    userId: string;
    clientId: string;
  }): Promise<ClientRow> {
    const row = await this.db
      .updateTable("client")
      .set({ clie_deleted_at: new Date() })
      .where("clie_user_id", "=", params.userId)
      .where("clie_id", "=", params.clientId)
      .where("clie_deleted_at", "is", null)
      .returningAll()
      .executeTakeFirstOrThrow();
    return mapClientRow(row as ClientDbRow);
  }
}
