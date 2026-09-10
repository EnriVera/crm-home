import type { TypeCategoriesClientRow } from "../tasks/types";

/**
 * Lookup read-only: tipos aplicables al form, filtrados opcionalmente por cliente.
 *
 * Cuando `clieId` es `undefined` o `null` ⇒ devuelve los tipos con filas
 * `type_categories_client` globales (sin cliente asociado) del usuario.
 */
export interface TypeLookupRepository {
  listForForm(params: {
    userId: string;
    clieId?: string;
  }): Promise<TypeCategoriesClientRow[]>;
}
