import type { TransactionManager } from "../../domain/ports/transaction-manager";
import type { Transaction } from "../../domain/ports/transaction";
import type { Database } from "./database";

export class KyselyTransactionManager implements TransactionManager {
  constructor(private readonly db: Database) {}

  async run<T>(work: (trx: Transaction) => Promise<T>): Promise<T> {
    // SAFETY: Transaction is an opaque domain token; Kysely's transaction
    // object is the only concrete value ever passed through this boundary.
    return this.db.transaction().execute((trx) => work(trx as Transaction));
  }
}
