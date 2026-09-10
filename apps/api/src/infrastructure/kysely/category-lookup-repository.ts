import type { CategoryLookupRepository } from "../../domain/ports/category-lookup-repository";
import type { CategoryRow } from "../../domain/tasks/types";
import type { Database } from "./database";
import { mapCategoryRow, type CategoryDbRow } from "./_mappers";

/**
 * Lookup de categorías filtradas por `type_id`. Usado por el select dependiente
 * del form de tasks.
 */
export class KyselyCategoryLookupRepository implements CategoryLookupRepository {
  constructor(private readonly db: Database) {}

  async listByType(params: {
    userId: string;
    typeId: string;
  }): Promise<CategoryRow[]> {
    const rows = await this.db
      .selectFrom("categories")
      .selectAll()
      .where("cate_user_id", "=", params.userId)
      .where("cate_type_id", "=", params.typeId)
      .where("cate_deleted_at", "is", null)
      .execute();
    return rows.map((row) => mapCategoryRow(row as CategoryDbRow));
  }
}
