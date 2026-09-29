import { sql } from "kysely";
import type { Database } from "./database";
import type {
  TypeModuleName,
  TypeModules,
  TypeRepository,
  TypeRow,
} from "../../domain/ports/type-repository";

interface TypeDbRow {
  type_id: string;
  type_user_id: string;
  type_name: string;
  type_modules: string[];
  type_created_at: Date;
}

function mapTypeRow(row: TypeDbRow): TypeRow {
  return {
    id: row.type_id,
    userId: row.type_user_id,
    name: row.type_name,
    modules: row.type_modules as TypeModules,
    createdAt: row.type_created_at,
  };
}

/**
 * Adapter kysely de `TypeRepository`. CRUD del módulo `types` del user
 * (multi-tenant via `type_user_id` + `type_deleted_at IS NULL`).
 *
 * Multi-módulo (migration 007):
 * - `type_modules TEXT[]` reemplaza al viejo `type_module TEXT`.
 * - Filter "module" usa el operador `@>` de Postgres: `type_modules @> ARRAY[module]`
 *   matchea cualquier array que CONTENGA ese módulo.
 * - Filter `module === null` matchea los "all modules" (`type_modules = '{}'`).
 *
 * Set cerrado enforced a dos niveles:
 *   1. CHECK constraint en la DB (migration 007).
 *   2. Validación en el use case `CreateType` / `UpdateType`.
 * El adapter no re-valida; confía en que el caller ya pasó por el use case.
 */
export class KyselyTypeRepository implements TypeRepository {
  constructor(private readonly db: Database) {}

  async list(params: {
    userId: string;
    search: string;
    module: TypeModuleName | null;
    limit: number;
  }): Promise<TypeRow[]> {
    const cappedLimit = Math.min(Math.max(params.limit, 1), 100);
    let query = this.db
      .selectFrom("types")
      .select([
        "type_id",
        "type_user_id",
        "type_name",
        "type_modules",
        "type_created_at",
      ])
      .where("type_user_id", "=", params.userId)
      .where("type_deleted_at", "is", null);

    if (params.module === null) {
      // module=null → "all modules" = array vacío '{}'.
      query = query.where("type_modules", "=", sql<string[]>`ARRAY[]::TEXT[]`);
    } else {
      // Array-contains: matchea cualquier type que tenga `module` en su
      // array de módulos. En kysely usamos `eb` para construir la
      // expresión `@>` raw (no hay helper directo).
      query = query.where(
        sql<boolean>`type_modules @> ARRAY[${sql.lit(params.module)}]::TEXT[]`,
      );
    }

    const trimmed = params.search.trim();
    if (trimmed !== "") {
      // Búsqueda case-insensitive por prefijo del nombre.
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
        "type_modules",
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
    modules: TypeModules;
  }): Promise<TypeRow> {
    const row = await this.db
      .insertInto("types")
      .values({
        type_id: sql<string>`gen_random_uuid()`,
        type_user_id: params.userId,
        type_name: params.name,
        type_modules: sql<string[]>`ARRAY[${sql.join(
          params.modules.map((m) => sql.lit(m)),
        )}]::TEXT[]`,
      })
      .returning([
        "type_id",
        "type_user_id",
        "type_name",
        "type_modules",
        "type_created_at",
      ])
      .executeTakeFirstOrThrow();
    return mapTypeRow(row as TypeDbRow);
  }

  async update(params: {
    userId: string;
    typeId: string;
    name?: string;
    modules?: TypeModules;
  }): Promise<TypeRow> {
    const setValues: Partial<{
      type_name: string;
      type_modules: string[];
    }> = {};
    if (params.name !== undefined) setValues.type_name = params.name;
    if (params.modules !== undefined) {
      setValues.type_modules = Array.from(params.modules);
    }

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
        "type_modules",
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
        "type_modules",
        "type_created_at",
      ])
      .executeTakeFirstOrThrow();
    return mapTypeRow(row as TypeDbRow);
  }
}
