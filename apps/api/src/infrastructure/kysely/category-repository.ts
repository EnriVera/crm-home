import { sql } from "kysely";
import type { Database } from "./database";
import { mapCategoryRow, type CategoryDbRow } from "./_mappers";
import type { DataColor } from "../../domain/types";
import type {
  CategoryRepository,
  CategoryRow,
} from "../../domain/ports/category-repository";

/**
 * Adapter kysely de `CategoryRepository`. CRUD del módulo `categories`
 * del user (multi-tenant via `cate_user_id` + `cate_deleted_at IS NULL`).
 */
export class KyselyCategoryRepository implements CategoryRepository {
  constructor(private readonly db: Database) {}

  async list(params: {
    userId: string;
    search: string;
    typeId: string | null;
    limit: number;
  }): Promise<CategoryRow[]> {
    const cappedLimit = Math.min(Math.max(params.limit, 1), 100);
    let query = this.db
      .selectFrom("categories")
      .selectAll()
      .where("cate_user_id", "=", params.userId)
      .where("cate_deleted_at", "is", null)
      .orderBy("cate_name", "asc")
      .limit(cappedLimit);

    if (params.typeId !== null) {
      query = query.where("cate_type_id", "=", params.typeId);
    }
    if (params.search.trim().length > 0) {
      query = query.where("cate_name", "ilike", `%${params.search.trim()}%`);
    }

    const rows = await query.execute();
    return rows.map((row) => mapCategoryRow(row as CategoryDbRow));
  }

  async findById(params: {
    userId: string;
    categoryId: string;
  }): Promise<CategoryRow | null> {
    const row = await this.db
      .selectFrom("categories")
      .selectAll()
      .where("cate_user_id", "=", params.userId)
      .where("cate_id", "=", params.categoryId)
      .where("cate_deleted_at", "is", null)
      .executeTakeFirst();
    return row ? mapCategoryRow(row as CategoryDbRow) : null;
  }

  async insert(params: {
    userId: string;
    name: string;
    typeId: string;
    color?: DataColor | null;
  }): Promise<CategoryRow> {
    const row = await this.db
      .insertInto("categories")
      .values({
        cate_id: sql<string>`gen_random_uuid()`,
        cate_user_id: params.userId,
        cate_name: params.name,
        cate_type_id: params.typeId,
        cate_color: params.color ?? null,
      })
      .returningAll()
      .executeTakeFirstOrThrow();
    return mapCategoryRow(row as CategoryDbRow);
  }

  async update(params: {
    userId: string;
    categoryId: string;
    name?: string;
    typeId?: string;
    color?: DataColor | null;
  }): Promise<CategoryRow> {
    const values: Record<string, unknown> = {};
    if (params.name !== undefined) values.cate_name = params.name;
    if (params.typeId !== undefined) values.cate_type_id = params.typeId;
    // `color` acepta `null` explícito (quitar el color) y el token.
    // `undefined` = no tocar el campo.
    if (params.color !== undefined) values.cate_color = params.color;

    // Un PATCH sin campos para cambiar es un no-op: se devuelve la fila
    // actual. Armar un `SET` vacío produce SQL inválido en Postgres
    // ("syntax error at or near where") y terminaba en un 500.
    if (Object.keys(values).length === 0) {
      const current = await this.db
        .selectFrom("categories")
        .selectAll()
        .where("cate_user_id", "=", params.userId)
        .where("cate_id", "=", params.categoryId)
        .where("cate_deleted_at", "is", null)
        .executeTakeFirstOrThrow();
      return mapCategoryRow(current as CategoryDbRow);
    }

    const row = await this.db
      .updateTable("categories")
      .set(values)
      .where("cate_user_id", "=", params.userId)
      .where("cate_id", "=", params.categoryId)
      .where("cate_deleted_at", "is", null)
      .returningAll()
      .executeTakeFirstOrThrow();
    return mapCategoryRow(row as CategoryDbRow);
  }

  async softDelete(params: {
    userId: string;
    categoryId: string;
  }): Promise<CategoryRow> {
    const row = await this.db
      .updateTable("categories")
      .set({ cate_deleted_at: new Date() })
      .where("cate_user_id", "=", params.userId)
      .where("cate_id", "=", params.categoryId)
      .where("cate_deleted_at", "is", null)
      .returningAll()
      .executeTakeFirstOrThrow();
    return mapCategoryRow(row as CategoryDbRow);
  }
}
