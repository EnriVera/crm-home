import type {
  Currency,
  CurrencyRepository,
} from "../../domain/ports/currency-repository";
import type { Transaction } from "../../domain/ports/transaction";
import type { Database } from "./database";

export class KyselyCurrencyRepository implements CurrencyRepository {
  constructor(private readonly db: Database) {}

  async list(_trx?: Transaction): Promise<Currency[]> {
    const db = this.resolve(_trx);
    const rows = await db
      .selectFrom("currency")
      .select(["curr_id", "curr_name", "curr_symbol", "curr_decimals"])
      .orderBy("curr_name", "asc")
      .execute();
    return rows.map(this.mapRow);
  }

  private resolve(trx?: Transaction): Database {
    // SAFETY: Transaction es un opaque domain token; solo Kysely transaction
    // objects se pasan del transaction manager.
    return (trx as Database | undefined) ?? this.db;
  }

  private mapRow(row: {
    curr_id: string;
    curr_name: string;
    curr_symbol: string;
    curr_decimals: number;
  }): Currency {
    return {
      id: row.curr_id,
      name: row.curr_name,
      symbol: row.curr_symbol,
      decimals: row.curr_decimals,
    };
  }
}
