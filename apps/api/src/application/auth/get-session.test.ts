import { describe, expect, test } from "bun:test";
import { GetSession } from "./get-session";
import type { Clock } from "../../domain/ports/clock";
import type { Session, SessionRepository } from "../../domain/ports/session-repository";
import type { TokenHasher } from "../../domain/ports/token-hasher";
import type { User, UserRepository } from "../../domain/ports/user-repository";

class FixedClock implements Clock {
  constructor(private readonly time: Date) {}
  now(): Date {
    return new Date(this.time);
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

  async softDelete(hash: string): Promise<void> {
    const session = this.sessions.find((s) => s.tokenHash === hash);
    if (session) {
      session.deletedAt = new Date();
    }
  }

  async updateExpiresAt(id: string, expiresAt: Date): Promise<void> {
    const session = this.sessions.find((s) => s.id === id);
    if (session) {
      session.expiresAt = expiresAt;
    }
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

class InMemoryUserRepository implements UserRepository {
  readonly users: User[] = [];

  async findById(id: string): Promise<User | undefined> {
    return this.users.find((u) => u.id === id);
  }

  async findByEmail(_email: string): Promise<User | undefined> {
    return undefined;
  }

  async create(user: User): Promise<void> {
    this.users.push({ ...user });
  }

  async markEmailVerified(_id: string): Promise<void> {}

  async updateTheme(id: string, theme: string): Promise<void> {
    const user = this.users.find((u) => u.id === id);
    if (user !== undefined) {
      user.theme = theme;
    }
  }
}

function createUseCase(overrides: {
  clock?: Clock;
  sessionRepository?: InMemorySessionRepository;
  userRepository?: InMemoryUserRepository;
  tokenHasher?: TokenHasher;
} = {}) {
  const now = new Date("2025-01-15T12:00:00.000Z");
  const sessionRepository =
    overrides.sessionRepository ?? new InMemorySessionRepository();
  const userRepository = overrides.userRepository ?? new InMemoryUserRepository();
  return {
    now,
    sessionRepository,
    userRepository,
    useCase: new GetSession({
      clock: overrides.clock ?? new FixedClock(now),
      sessionRepository,
      userRepository,
      tokenHasher: overrides.tokenHasher ?? new FakeTokenHasher(),
    }),
  };
}

describe("GetSession", () => {
  test("sesión inexistente devuelve null", async () => {
    const { useCase } = createUseCase();

    const result = await useCase.execute({ token: "token-inexistente" });

    expect(result).toBeNull();
  });

  test("sesión borrada devuelve null", async () => {
    const now = new Date("2025-01-15T12:00:00.000Z");
    const sessionRepository = new InMemorySessionRepository();
    await sessionRepository.create({
      id: "session-1",
      userId: "user-1",
      tokenHash: "hash:token-1",
      expiresAt: new Date(now.getTime() + 20 * 24 * 60 * 60 * 1000),
      deletedAt: now,
    });
    const { useCase } = createUseCase({
      clock: new FixedClock(now),
      sessionRepository,
    });

    const result = await useCase.execute({ token: "token-1" });

    expect(result).toBeNull();
  });

  test("sesión expirada devuelve null", async () => {
    const now = new Date("2025-01-15T12:00:00.000Z");
    const sessionRepository = new InMemorySessionRepository();
    await sessionRepository.create({
      id: "session-1",
      userId: "user-1",
      tokenHash: "hash:token-1",
      expiresAt: new Date(now.getTime() - 1 * 60 * 1000),
    });
    const { useCase } = createUseCase({
      clock: new FixedClock(now),
      sessionRepository,
    });

    const result = await useCase.execute({ token: "token-1" });

    expect(result).toBeNull();
  });

  test("sesión activa devuelve el usuario", async () => {
    const now = new Date("2025-01-15T12:00:00.000Z");
    const sessionRepository = new InMemorySessionRepository();
    const userRepository = new InMemoryUserRepository();
    await userRepository.create({
      id: "user-1",
      email: "ana@example.com",
      name: "Ana",
      theme: "system",
      emailVerified: true,
      acceptedTermsAt: now,
      termsVersion: "1.0",
    });
    await sessionRepository.create({
      id: "session-1",
      userId: "user-1",
      tokenHash: "hash:token-1",
      expiresAt: new Date(now.getTime() + 20 * 24 * 60 * 60 * 1000),
    });
    const { useCase } = createUseCase({
      clock: new FixedClock(now),
      sessionRepository,
      userRepository,
    });

    const result = await useCase.execute({ token: "token-1" });

    expect(result).toEqual({
      user: {
        id: "user-1",
        email: "ana@example.com",
        name: "Ana",
      },
    });
  });

  test("expiración a < 15 días renueva a now + 30 días", async () => {
    const now = new Date("2025-01-15T12:00:00.000Z");
    const sessionRepository = new InMemorySessionRepository();
    const userRepository = new InMemoryUserRepository();
    await userRepository.create({
      id: "user-1",
      email: "ana@example.com",
      name: "Ana",
      theme: "system",
      emailVerified: true,
      acceptedTermsAt: now,
      termsVersion: "1.0",
    });
    await sessionRepository.create({
      id: "session-1",
      userId: "user-1",
      tokenHash: "hash:token-1",
      expiresAt: new Date(now.getTime() + 10 * 24 * 60 * 60 * 1000),
    });
    const { useCase, sessionRepository: repo } = createUseCase({
      clock: new FixedClock(now),
      sessionRepository,
      userRepository,
    });

    const result = await useCase.execute({ token: "token-1" });

    expect(result!.renewed).toBe(true);
    expect(repo.sessions[0]!.expiresAt.getTime()).toBe(
      now.getTime() + 30 * 24 * 60 * 60 * 1000,
    );
  });

  test("usa comparación de hashes a tiempo constante", async () => {
    const now = new Date("2025-01-15T12:00:00.000Z");
    const sessionRepository = new InMemorySessionRepository();
    const userRepository = new InMemoryUserRepository();
    await userRepository.create({
      id: "user-1",
      email: "ana@example.com",
      name: "Ana",
      theme: "system",
      emailVerified: true,
      acceptedTermsAt: now,
      termsVersion: "1.0",
    });
    await sessionRepository.create({
      id: "session-1",
      userId: "user-1",
      tokenHash: "hash:token-1",
      expiresAt: new Date(now.getTime() + 20 * 24 * 60 * 60 * 1000),
    });
    let verifyCalled = false;
    const tokenHasher: TokenHasher = {
      hash(token: string): string {
        return `hash:${token}`;
      },
      verify(_token: string, _hash: string): boolean {
        verifyCalled = true;
        return true;
      },
    };
    const { useCase } = createUseCase({
      clock: new FixedClock(now),
      sessionRepository,
      userRepository,
      tokenHasher,
    });

    await useCase.execute({ token: "token-1" });

    expect(verifyCalled).toBe(true);
  });

  test("expiración a > 15 días no renueva", async () => {
    const now = new Date("2025-01-15T12:00:00.000Z");
    const sessionRepository = new InMemorySessionRepository();
    const userRepository = new InMemoryUserRepository();
    await userRepository.create({
      id: "user-1",
      email: "ana@example.com",
      name: "Ana",
      theme: "system",
      emailVerified: true,
      acceptedTermsAt: now,
      termsVersion: "1.0",
    });
    const originalExpiresAt = new Date(
      now.getTime() + 20 * 24 * 60 * 60 * 1000,
    );
    await sessionRepository.create({
      id: "session-1",
      userId: "user-1",
      tokenHash: "hash:token-1",
      expiresAt: originalExpiresAt,
    });
    const { useCase, sessionRepository: repo } = createUseCase({
      clock: new FixedClock(now),
      sessionRepository,
      userRepository,
    });

    const result = await useCase.execute({ token: "token-1" });

    expect(result!.renewed).toBeUndefined();
    expect(repo.sessions[0]!.expiresAt.getTime()).toBe(originalExpiresAt.getTime());
  });
});
