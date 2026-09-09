import type { Transaction } from "./transaction";

export interface Session {
  id: string;
  userId: string;
  tokenHash: string;
  expiresAt: Date;
  deletedAt?: Date;
}

export interface SessionRepository {
  create(session: Session, trx?: Transaction): Promise<void>;
  findByTokenHash(hash: string, trx?: Transaction): Promise<Session | undefined>;
  softDelete(hash: string, trx?: Transaction): Promise<void>;
  updateExpiresAt(
    id: string,
    expiresAt: Date,
    trx?: Transaction,
  ): Promise<void>;
}
