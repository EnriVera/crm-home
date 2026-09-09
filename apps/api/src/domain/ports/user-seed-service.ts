import type { Transaction } from "./transaction";
import type { User } from "./user-repository";

export interface UserSeedService {
  seed(email: string, trx?: Transaction): Promise<User>;
}
