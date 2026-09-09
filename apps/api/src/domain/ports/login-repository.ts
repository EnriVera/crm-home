import type { Transaction } from "./transaction";

export interface Login {
  id: string;
  email: string;
  code: string;
  expiresAt: Date;
  attempts: number;
  createdAt: Date;
  consumedAt?: Date;
}

export interface LoginRepository {
  create(login: Login, trx?: Transaction): Promise<void>;
  findLatestByEmail(
    email: string,
    trx?: Transaction,
  ): Promise<Login | undefined>;
  incrementAttempts(id: string, trx?: Transaction): Promise<void>;
  markConsumed(id: string, trx?: Transaction): Promise<void>;
  countRecentByEmail(
    email: string,
    since: Date,
    trx?: Transaction,
  ): Promise<number>;
}
