import type { CategoryRow } from "../tasks/types";

/**
 * Lookup read-only: categorías de un tipo dado, para alimentar el select
 * dependiente del form organism.
 */
export interface CategoryLookupRepository {
  listByType(params: {
    userId: string;
    typeId: string;
  }): Promise<CategoryRow[]>;
}
