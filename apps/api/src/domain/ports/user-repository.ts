import type { Transaction } from "./transaction";

export interface User {
  id: string;
  email: string;
  name: string;
  theme: string;
  emailVerified: boolean;
  acceptedTermsAt: Date;
  termsVersion: string;
}

export interface UserRepository {
  findById(id: string, trx?: Transaction): Promise<User | undefined>;
  findByEmail(email: string, trx?: Transaction): Promise<User | undefined>;
  create(user: User, trx?: Transaction): Promise<void>;
  markEmailVerified(id: string, trx?: Transaction): Promise<void>;
  updateTheme(
    id: string,
    theme: string,
    trx?: Transaction,
  ): Promise<void>;
}
