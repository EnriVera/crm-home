import type {
  App,
  AppRepository,
} from "../../domain/ports/app-repository";
import type { Transaction } from "../../domain/ports/transaction";
import type { Database } from "./database";

export class KyselyAppRepository implements AppRepository {
  constructor(private readonly db: Database) {}

  async list(_trx?: Transaction): Promise<App[]> {
    const db = this.resolve(_trx);
    const rows = await db
      .selectFrom("apps")
      .select(["apps_id", "apps_name"])
      .orderBy("apps_name", "asc")
      .execute();
    return rows.map(this.mapRow);
  }

  private resolve(trx?: Transaction): Database {
    // SAFETY: Transaction es un opaque domain token; solo Kysely transaction
    // objects se pasan del transaction manager.
    return (trx as Database | undefined) ?? this.db;
  }

  private mapRow(row: { apps_id: string; apps_name: string }): App {
    return {
      id: row.apps_id,
      name: row.apps_name,
    };
  }
}
