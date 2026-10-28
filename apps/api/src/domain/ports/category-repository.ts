import type { Transaction } from "./transaction";

/**
 * Puerto CRUD del módulo /config → categorías.
 *
 * Cada user tiene sus propias categories (`cate_user_id` filtra por
 * sesión). El lookup global (para forms de tasks) vive en
 * `CategoryLookupRepository`; este puerto es para el CRUD del user.
 *
 * Multi-tenant: filtra por user + `cate_deleted_at IS NULL` en toda
 * operación. El repo nunca devuelve filas de otro user.
 *
 * Una categoría siempre pertenece a un type (`cate_type_id NOT NULL`,
 * FK a `types(type_id)`).
 */
export interface CategoryRow {
  id: string;
  userId: string;
  name: string;
  typeId: string;
  createdAt: Date;
}

export interface CategoryRepository {
  list(params: {
    userId: string;
    search: string;
    /** Filtro por type. `null` = sin filtro (todas). */
    typeId: string | null;
    limit: number;
  }): Promise<CategoryRow[]>;

  findById(params: {
    userId: string;
    categoryId: string;
  }): Promise<CategoryRow | null>;

  insert(params: {
    userId: string;
    name: string;
    typeId: string;
  }): Promise<CategoryRow>;

  update(params: {
    userId: string;
    categoryId: string;
    name?: string;
    typeId?: string;
  }): Promise<CategoryRow>;

  softDelete(params: {
    userId: string;
    categoryId: string;
  }): Promise<CategoryRow>;
}
