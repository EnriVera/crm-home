import { describe, expect, test } from "bun:test";
import { VerifyOtp } from "./verify-otp";
import type { Clock } from "../../domain/ports/clock";
import type { IdGenerator } from "../../domain/ports/id-generator";
import type { Login, LoginRepository } from "../../domain/ports/login-repository";
import type { SecureComparator } from "../../domain/ports/secure-comparator";
import type { Session, SessionRepository } from "../../domain/ports/session-repository";
import type { TokenHasher } from "../../domain/ports/token-hasher";
import type { TransactionManager } from "../../domain/ports/transaction-manager";
import type { Transaction } from "../../domain/ports/transaction";
import type { User, UserRepository } from "../../domain/ports/user-repository";
import type { UserSeedService } from "../../domain/ports/user-seed-service";

class FixedClock implements Clock {
  constructor(private readonly time: Date) {}
  now(): Date {
    return new Date(this.time);
  }
}

class FakeIdGenerator implements IdGenerator {
  private counter = 0;
  generate(): string {
    this.counter += 1;
    return `id-${this.counter}`;
  }
}

class FakeSecureComparator implements SecureComparator {
  areEqual(a: string, b: string): boolean {
    return a === b;
  }
}

class FakeTokenHasher implements TokenHasher {
  hash(token: string): string {
    return `hash:${token}`;
  }
  verify(token: string, hash: string): boolean {
    return hash === this.hash(token);
  }
}

class InMemoryLoginRepository implements LoginRepository {
  readonly logins: Login[] = [];

  async create(login: Login): Promise<void> {
    this.logins.push({ ...login });
  }

  async findLatestByEmail(email: string): Promise<Login | undefined> {
    return this.logins
      .filter((l) => l.email === email && l.consumedAt === undefined)
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())[0];
  }

  async incrementAttempts(id: string): Promise<void> {
    const login = this.logins.find((l) => l.id === id);
    if (login) {
      login.attempts += 1;
    }
  }

  async markConsumed(id: string): Promise<void> {
    const login = this.logins.find((l) => l.id === id);
    if (login) {
      login.consumedAt = new Date();
    }
  }

  async countRecentByEmail(
    _email: string,
    _since: Date,
  ): Promise<number> {
    return 0;
  }
}

class InMemorySessionRepository implements SessionRepository {
  readonly sessions: Session[] = [];

  async create(session: Session): Promise<void> {
    this.sessions.push({ ...session });
  }

  async findByTokenHash(hash: string): Promise<Session | undefined> {
    return this.sessions.find((s) => s.tokenHash === hash && !s.deletedAt);
  }

  async softDelete(_hash: string): Promise<void> {}

  async updateExpiresAt(_id: string, _expiresAt: Date): Promise<void> {}
}

class InMemoryUserRepository implements UserRepository {
  readonly users: User[] = [];

  async findById(id: string): Promise<User | undefined> {
    return this.users.find((u) => u.id === id);
  }

  async findByEmail(email: string): Promise<User | undefined> {
    return this.users.find((u) => u.email === email);
  }

  async create(user: User): Promise<void> {
    this.users.push({ ...user });
  }

  async markEmailVerified(_id: string): Promise<void> {}
}

class FakeUserSeedService implements UserSeedService {
  private counter = 0;
  constructor(private readonly users: User[]) {}

  async seed(email: string): Promise<User> {
    this.counter += 1;
    const user: User = {
      id: `seed-${this.counter}`,
      email,
      name: email.split("@")[0]!,
      theme: "system",
      emailVerified: true,
      acceptedTermsAt: new Date(),
      termsVersion: "1.0",
    };
    this.users.push(user);
    return user;
  }
}

class NoopTransactionManager implements TransactionManager {
  async run<T>(work: (trx: Transaction) => Promise<T>): Promise<T> {
    return work(undefined as unknown as Transaction);
  }
}

class FailingTransactionManager implements TransactionManager {
  async run<T>(_work: (trx: Transaction) => Promise<T>): Promise<T> {
    throw new Error("transaction failed");
  }
}

function createUseCase(overrides: {
  clock?: Clock;
  idGenerator?: IdGenerator;
  loginRepository?: InMemoryLoginRepository;
  sessionRepository?: InMemorySessionRepository;
  userRepository?: InMemoryUserRepository;
  userSeedService?: UserSeedService;
  comparator?: SecureComparator;
  tokenHasher?: TokenHasher;
  transactionManager?: TransactionManager;
} = {}) {
  const now = new Date("2025-01-15T12:00:00.000Z");
  const loginRepository = overrides.loginRepository ?? new InMemoryLoginRepository();
  const sessionRepository =
    overrides.sessionRepository ?? new InMemorySessionRepository();
  const userRepository = overrides.userRepository ?? new InMemoryUserRepository();
  return {
    now,
    loginRepository,
    sessionRepository,
    userRepository,
    useCase: new VerifyOtp({
      clock: overrides.clock ?? new FixedClock(now),
      idGenerator: overrides.idGenerator ?? new FakeIdGenerator(),
      loginRepository,
      sessionRepository,
      userRepository,
      userSeedService:
        overrides.userSeedService ??
        new FakeUserSeedService(userRepository.users),
      comparator: overrides.comparator ?? new FakeSecureComparator(),
      tokenHasher: overrides.tokenHasher ?? new FakeTokenHasher(),
      transactionManager:
        overrides.transactionManager ?? new NoopTransactionManager(),
    }),
  };
}

describe("VerifyOtp", () => {
  test("código con ceros a la izquierda válido devuelve valid y crea sesión", async () => {
    const now = new Date("2025-01-15T12:00:00.000Z");
    const loginRepository = new InMemoryLoginRepository();
    await loginRepository.create({
      id: "login-1",
      email: "ana@example.com",
      code: "041283",
      expiresAt: new Date(now.getTime() + 5 * 60 * 1000),
      attempts: 0,
      createdAt: now,
    });
    const { useCase, sessionRepository, userRepository } = createUseCase({
      clock: new FixedClock(now),
      loginRepository,
    });

    const result = await useCase.execute({
      email: "ana@example.com",
      code: "041283",
    });

    expect(result.verdict).toBe("valid");
    expect(result.sessionToken).toBeDefined();
    expect(sessionRepository.sessions).toHaveLength(1);
    expect(userRepository.users).toHaveLength(1);
    expect(userRepository.users[0]!.email).toBe("ana@example.com");
    expect(loginRepository.logins[0]!.consumedAt).toBeDefined();
  });

  test("código expirado devuelve expired y no crea sesión", async () => {
    const now = new Date("2025-01-15T12:00:00.000Z");
    const loginRepository = new InMemoryLoginRepository();
    await loginRepository.create({
      id: "login-1",
      email: "ana@example.com",
      code: "041283",
      expiresAt: new Date(now.getTime() - 1 * 60 * 1000),
      attempts: 0,
      createdAt: new Date(now.getTime() - 11 * 60 * 1000),
    });
    const { useCase, sessionRepository } = createUseCase({
      clock: new FixedClock(now),
      loginRepository,
    });

    const result = await useCase.execute({
      email: "ana@example.com",
      code: "041283",
    });

    expect(result.verdict).toBe("expired");
    expect(sessionRepository.sessions).toHaveLength(0);
  });

  test("código incorrecto incrementa intentos y devuelve invalid", async () => {
    const now = new Date("2025-01-15T12:00:00.000Z");
    const loginRepository = new InMemoryLoginRepository();
    await loginRepository.create({
      id: "login-1",
      email: "ana@example.com",
      code: "041283",
      expiresAt: new Date(now.getTime() + 5 * 60 * 1000),
      attempts: 0,
      createdAt: now,
    });
    const { useCase } = createUseCase({
      clock: new FixedClock(now),
      loginRepository,
    });

    const result = await useCase.execute({
      email: "ana@example.com",
      code: "000000",
    });

    expect(result.verdict).toBe("invalid");
    expect(loginRepository.logins[0]!.attempts).toBe(1);
  });

  test("5 intentos fallidos bloquean el login", async () => {
    const now = new Date("2025-01-15T12:00:00.000Z");
    const loginRepository = new InMemoryLoginRepository();
    await loginRepository.create({
      id: "login-1",
      email: "ana@example.com",
      code: "041283",
      expiresAt: new Date(now.getTime() + 5 * 60 * 1000),
      attempts: 4,
      createdAt: now,
    });
    const { useCase, sessionRepository } = createUseCase({
      clock: new FixedClock(now),
      loginRepository,
    });

    const result = await useCase.execute({
      email: "ana@example.com",
      code: "000000",
    });

    expect(result.verdict).toBe("invalid");
    expect(loginRepository.logins[0]!.attempts).toBe(5);
    expect(sessionRepository.sessions).toHaveLength(0);
  });

  test(" después de 5 intentos, código correcto sigue siendo invalid", async () => {
    const now = new Date("2025-01-15T12:00:00.000Z");
    const loginRepository = new InMemoryLoginRepository();
    await loginRepository.create({
      id: "login-1",
      email: "ana@example.com",
      code: "041283",
      expiresAt: new Date(now.getTime() + 5 * 60 * 1000),
      attempts: 5,
      createdAt: now,
    });
    const { useCase, sessionRepository } = createUseCase({
      clock: new FixedClock(now),
      loginRepository,
    });

    const result = await useCase.execute({
      email: "ana@example.com",
      code: "041283",
    });

    expect(result.verdict).toBe("invalid");
    expect(sessionRepository.sessions).toHaveLength(0);
  });

  test("usa comparación a tiempo constante (no === directo)", async () => {
    let comparatorCalled = false;
    const comparator: SecureComparator = {
      areEqual(a: string, b: string): boolean {
        comparatorCalled = true;
        return a === b;
      },
    };
    const now = new Date("2025-01-15T12:00:00.000Z");
    const loginRepository = new InMemoryLoginRepository();
    await loginRepository.create({
      id: "login-1",
      email: "ana@example.com",
      code: "041283",
      expiresAt: new Date(now.getTime() + 5 * 60 * 1000),
      attempts: 0,
      createdAt: now,
    });
    const { useCase } = createUseCase({
      clock: new FixedClock(now),
      loginRepository,
      comparator,
    });

    await useCase.execute({ email: "ana@example.com", code: "041283" });

    expect(comparatorCalled).toBe(true);
  });

  test("usuario existente no re-seedea", async () => {
    const now = new Date("2025-01-15T12:00:00.000Z");
    const userRepository = new InMemoryUserRepository();
    await userRepository.create({
      id: "existing-user",
      email: "ana@example.com",
      name: "Ana",
      theme: "system",
      emailVerified: true,
      acceptedTermsAt: now,
      termsVersion: "1.0",
    });
    const loginRepository = new InMemoryLoginRepository();
    await loginRepository.create({
      id: "login-1",
      email: "ana@example.com",
      code: "041283",
      expiresAt: new Date(now.getTime() + 5 * 60 * 1000),
      attempts: 0,
      createdAt: now,
    });
    const seedSpy = {
      async seed(_email: string): Promise<User> {
        throw new Error("should not seed existing user");
      },
    };
    const { useCase, sessionRepository } = createUseCase({
      clock: new FixedClock(now),
      loginRepository,
      userRepository,
      userSeedService: seedSpy,
    });

    const result = await useCase.execute({
      email: "ana@example.com",
      code: "041283",
    });

    expect(result.verdict).toBe("valid");
    expect(userRepository.users).toHaveLength(1);
    expect(sessionRepository.sessions[0]!.userId).toBe("existing-user");
  });

  test("rollback transaccional del seed revierte login consumido", async () => {
    const now = new Date("2025-01-15T12:00:00.000Z");
    const loginRepository = new InMemoryLoginRepository();
    await loginRepository.create({
      id: "login-1",
      email: "ana@example.com",
      code: "041283",
      expiresAt: new Date(now.getTime() + 5 * 60 * 1000),
      attempts: 0,
      createdAt: now,
    });
    const { useCase } = createUseCase({
      clock: new FixedClock(now),
      loginRepository,
      transactionManager: new FailingTransactionManager(),
    });

    await expect(
      useCase.execute({ email: "ana@example.com", code: "041283" }),
    ).rejects.toThrow("transaction failed");

    expect(loginRepository.logins[0]!.consumedAt).toBeUndefined();
  });
});
