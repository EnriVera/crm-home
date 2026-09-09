import type { Transaction } from "./transaction";

export interface TransactionManager {
  run<T>(work: (trx: Transaction) => Promise<T>): Promise<T>;
}
