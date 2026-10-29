import { sql } from "kysely";
import type { Database } from "./database";
import {
  TYPE_MODULE_NAMES,
  type TypeModules,
  type TypeRepository,
  type TypeRow,
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
 * Los módulos se interpolan con `sql.lit` (kysely no tiene bind para el
 * array overlap `&&`), así que el set cerrado se valida acá: la allowlist
 * no depende de que el caller haya pasado por el use case.
 */
function litModules(modules: TypeModules): string[] {
  const unknown = modules.filter(
    (module) => !TYPE_MODULE_NAMES.includes(module),
  );
  if (unknown.length > 0) {
    throw new Error(`Unknown type module: ${unknown.join(", ")}`);
  }
  return [...modules];
}

/**
 * Adapter kysely de `TypeRepository`. CRUD del módulo `types` del user
 * (multi-tenant via `type_user_id` + `type_deleted_at IS NULL`).
 *
 * Multi-módulo (migration 007):
 * - `type_modules TEXT[]` reemplaza al viejo `type_module TEXT`.
 * - El filtro por módulos usa el operador `&&` de Postgres (overlap):
 *   matchea cualquier type que tenga AL MENOS uno de los módulos pedidos.
 *   Sin filtro (`modules` vacío) el listado trae todos los types.
 *
 * Set cerrado enforced a tres niveles:
 *   1. CHECK constraint en la DB (migration 007).
 *   2. Validación en el use case `CreateType` / `UpdateType`.
 *   3. Allowlist en el adapter (`litModules`), que es el nivel que hace
 *      seguro el `sql.lit` del filtro.
 */
export class KyselyTypeRepository implements TypeRepository {
  constructor(private readonly db: Database) {}

  async list(params: {
    userId: string;
    search: string;
    modules: TypeModules;
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

    if (params.modules.length > 0) {
      // Array overlap (`&&`): matchea cualquier type que tenga AL
      // MENOS uno de los módulos seleccionados. Es el operador
      // simétrico a "any of" (vs `@>` "contains all of" que usamos
      // en un single-module flow anterior). La diferencia con el
      // filtro viejo: ahora es multi-módulo con OR (no AND).
      //
      // kysely no tiene bind para el array overlap `&&`: los valores
      // entran con `sql.lit`, y por eso `litModules` valida el set
      // cerrado antes (sin esa allowlist, un valor fuera del set
      // sería SQL crudo).
      const modulesArray = sql<string[]>`ARRAY[${sql.join(
        litModules(params.modules).map((m) => sql.lit(m)),
      )}]::TEXT[]`;
      query = query.where(sql<boolean>`type_modules && ${modulesArray}`);
    }
    // modules.length === 0 → sin filtro (mostrar todos los types,
    // incluidos los all-modules con modules=[]).

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
          litModules(params.modules).map((m) => sql.lit(m)),
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
      // El mismo set cerrado que valida el insert: el update escribe el
      // array entero, así que también necesita la allowlist.
      setValues.type_modules = litModules(params.modules);
    }

    // Un PATCH sin campos para cambiar es un no-op: se devuelve la fila
    // actual. Armar un `SET` vacío produce SQL inválido en Postgres
    // ("syntax error at or near where") y terminaba en un 500.
    if (Object.keys(setValues).length === 0) {
      const current = await this.db
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
        .executeTakeFirstOrThrow();
      return mapTypeRow(current as TypeDbRow);
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
