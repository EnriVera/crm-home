import type { Clock } from "../../domain/ports/clock";
import type { IdGenerator } from "../../domain/ports/id-generator";
import type { LoginRepository } from "../../domain/ports/login-repository";
import type { SecureComparator } from "../../domain/ports/secure-comparator";
import type { SessionRepository } from "../../domain/ports/session-repository";
import type { TokenHasher } from "../../domain/ports/token-hasher";
import type { TransactionManager } from "../../domain/ports/transaction-manager";
import type { UserRepository } from "../../domain/ports/user-repository";
import type { UserSeedService } from "../../domain/ports/user-seed-service";
import type { Verdict } from "@crm/types";
import { SESSION_TTL_MS } from "./constants";

export interface VerifyOtpInput {
  email: string;
  code: string;
}

export interface VerifyOtpOutput {
  verdict: Verdict;
  sessionToken?: string;
}

export interface VerifyOtpDependencies {
  clock: Clock;
  idGenerator: IdGenerator;
  loginRepository: LoginRepository;
  sessionRepository: SessionRepository;
  userRepository: UserRepository;
  userSeedService: UserSeedService;
  comparator: SecureComparator;
  tokenHasher: TokenHasher;
  transactionManager: TransactionManager;
}

export class VerifyOtp {
  constructor(private readonly deps: VerifyOtpDependencies) {}

  async execute(input: VerifyOtpInput): Promise<VerifyOtpOutput> {
    const email = input.email.trim().toLowerCase();
    const code = input.code;
    const now = this.deps.clock.now();

    const login = await this.deps.loginRepository.findLatestByEmail(email);
    if (!login) {
      return { verdict: "invalid" };
    }

    if (login.expiresAt < now) {
      return { verdict: "expired" };
    }

    if (login.attempts >= 5) {
      return { verdict: "invalid" };
    }

    if (!this.deps.comparator.areEqual(login.code, code)) {
      await this.deps.loginRepository.incrementAttempts(login.id);
      return { verdict: "invalid" };
    }

    const sessionToken = this.deps.idGenerator.generate();
    const sessionTokenHash = this.deps.tokenHasher.hash(sessionToken);

    await this.deps.transactionManager.run(async (trx) => {
      await this.deps.loginRepository.markConsumed(login.id, trx);

      let user = await this.deps.userRepository.findByEmail(email, trx);
      if (!user) {
        user = await this.deps.userSeedService.seed(email, trx);
      }

      await this.deps.sessionRepository.create(
        {
          id: this.deps.idGenerator.generate(),
          userId: user.id,
          tokenHash: sessionTokenHash,
          expiresAt: new Date(now.getTime() + SESSION_TTL_MS),
        },
        trx,
      );
    });

    return { verdict: "valid", sessionToken };
  }
}
