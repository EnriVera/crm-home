import type { TypeLookupRepository } from "../../domain/ports/type-lookup-repository";
import type { TypeCategoriesClientRow } from "../../domain/tasks/types";
import type { Database } from "./database";
import {
  mapTypeCategoriesClientRow,
  type TypeCategoriesClientDbRow,
} from "./_mappers";

/**
 * Lookup de filas `type_categories_client` aplicables al form, filtradas por
 * usuario y opcionalmente por cliente. Cuando `clieId` es `undefined` ⇒
 * devuelve las filas GLOBALES (`tccl_clie_id IS NULL`).
 */
export class KyselyTypeLookupRepository implements TypeLookupRepository {
  constructor(private readonly db: Database) {}

  async listForForm(params: {
    userId: string;
    clieId?: string;
  }): Promise<TypeCategoriesClientRow[]> {
    let query = this.db
      .selectFrom("type_categories_client")
      .selectAll()
      .where("tccl_user_id", "=", params.userId)
      .where("tccl_deleted_at", "is", null);

    if (params.clieId === undefined) {
      query = query.where("tccl_clie_id", "is", null);
    } else {
      query = query.where("tccl_clie_id", "=", params.clieId);
    }

    const rows = await query.execute();
    return rows.map((row) =>
      mapTypeCategoriesClientRow(row as TypeCategoriesClientDbRow),
    );
  }
}
