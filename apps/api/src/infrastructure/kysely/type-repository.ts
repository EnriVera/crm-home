import { sql } from "kysely";
import type { Database } from "./database";
import type {
  TypeModule,
  TypeRepository,
  TypeRow,
} from "../../domain/ports/type-repository";

interface TypeDbRow {
  type_id: string;
  type_user_id: string;
  type_name: string;
  type_module: string;
  type_created_at: Date;
}

function mapTypeRow(row: TypeDbRow): TypeRow {
  return {
    id: row.type_id,
    userId: row.type_user_id,
    name: row.type_name,
    module: row.type_module as TypeModule,
    createdAt: row.type_created_at,
  };
}

/**
 * Adapter kysely de `TypeRepository`. CRUD del módulo `types` del user
 * (multi-tenant via `type_user_id` + `type_deleted_at IS NULL`).
 *
 * `type_module` se persiste como texto libre a nivel SQL (no hay CHECK
 * constraint ni enum nativo de Postgres en la migration 001). La
 * validación del set cerrado (`tasks`/`incomes`/`expenses`/`schedules`)
 * ocurre en el contract Zod + en el use case `CreateType`.
 */
export class KyselyTypeRepository implements TypeRepository {
  constructor(private readonly db: Database) {}

  async list(params: {
    userId: string;
    search: string;
    module: TypeModule | null;
    limit: number;
  }): Promise<TypeRow[]> {
    const cappedLimit = Math.min(Math.max(params.limit, 1), 100);
    let query = this.db
      .selectFrom("types")
      .select([
        "type_id",
        "type_user_id",
        "type_name",
        "type_module",
        "type_created_at",
      ])
      .where("type_user_id", "=", params.userId)
      .where("type_deleted_at", "is", null);

    if (params.module !== null) {
      query = query.where("type_module", "=", params.module);
    }

    const trimmed = params.search.trim();
    if (trimmed !== "") {
      // Búsqueda case-insensitive por prefijo del nombre. Postgres LIKE
      // ya es case-sensitive; ILIKE lo resuelve sin tocar collation.
      query = query.where("type_name", "ilike", `${trimmed}%`);
    }

    const rows = await query
      .orderBy("type_name", "asc")
      .limit(cappedLimit)
      .execute();
    return rows.map((row) => mapTypeRow(row as TypeDbRow));
  }

  async findById(params: {
    userId: string;
    typeId: string;
  }): Promise<TypeRow | null> {
    const row = await this.db
      .selectFrom("types")
      .select([
        "type_id",
        "type_user_id",
        "type_name",
        "type_module",
        "type_created_at",
      ])
      .where("type_user_id", "=", params.userId)
      .where("type_id", "=", params.typeId)
      .where("type_deleted_at", "is", null)
      .executeTakeFirst();
    return row ? mapTypeRow(row as TypeDbRow) : null;
  }

  async insert(params: {
    userId: string;
    name: string;
    module: TypeModule;
  }): Promise<TypeRow> {
    const row = await this.db
      .insertInto("types")
      .values({
        type_id: sql<string>`gen_random_uuid()`,
        type_user_id: params.userId,
        type_name: params.name,
        type_module: params.module,
      })
      .returning([
        "type_id",
        "type_user_id",
        "type_name",
        "type_module",
        "type_created_at",
      ])
      .executeTakeFirstOrThrow();
    return mapTypeRow(row as TypeDbRow);
  }

  async update(params: {
    userId: string;
    typeId: string;
    name?: string;
    module?: TypeModule;
  }): Promise<TypeRow> {
    const setValues: Partial<{
      type_name: string;
      type_module: string;
    }> = {};
    if (params.name !== undefined) setValues.type_name = params.name;
    if (params.module !== undefined) setValues.type_module = params.module;

    const row = await this.db
      .updateTable("types")
      .set(setValues)
      .where("type_user_id", "=", params.userId)
      .where("type_id", "=", params.typeId)
      .where("type_deleted_at", "is", null)
      .returning([
        "type_id",
        "type_user_id",
        "type_name",
        "type_module",
        "type_created_at",
      ])
      .executeTakeFirstOrThrow();
    return mapTypeRow(row as TypeDbRow);
  }

  async softDelete(params: {
    userId: string;
    typeId: string;
  }): Promise<TypeRow> {
    const row = await this.db
      .updateTable("types")
      .set({ type_deleted_at: new Date() })
      .where("type_user_id", "=", params.userId)
      .where("type_id", "=", params.typeId)
      .where("type_deleted_at", "is", null)
      .returning([
        "type_id",
        "type_user_id",
        "type_name",
        "type_module",
        "type_created_at",
      ])
      .executeTakeFirstOrThrow();
    return mapTypeRow(row as TypeDbRow);
  }
}
