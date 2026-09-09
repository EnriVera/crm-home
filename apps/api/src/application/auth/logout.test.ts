import { describe, expect, test } from "bun:test";
import { Logout } from "./logout";
import type { Clock } from "../../domain/ports/clock";
import type { Session, SessionRepository } from "../../domain/ports/session-repository";
import type { TokenHasher } from "../../domain/ports/token-hasher";

class FixedClock implements Clock {
  constructor(private readonly time: Date) {}
  now(): Date {
    return new Date(this.time);
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

  async updateExpiresAt(_id: string, _expiresAt: Date): Promise<void> {}
}

function createUseCase(overrides: {
  clock?: Clock;
  sessionRepository?: InMemorySessionRepository;
  tokenHasher?: TokenHasher;
} = {}) {
  const now = new Date("2025-01-15T12:00:00.000Z");
  const sessionRepository =
    overrides.sessionRepository ?? new InMemorySessionRepository();
  return {
    now,
    sessionRepository,
    useCase: new Logout({
      clock: overrides.clock ?? new FixedClock(now),
      sessionRepository,
      tokenHasher: overrides.tokenHasher ?? new FakeTokenHasher(),
    }),
  };
}

describe("Logout", () => {
  test("sesión activa queda marcada con deletedAt", async () => {
    const now = new Date("2025-01-15T12:00:00.000Z");
    const sessionRepository = new InMemorySessionRepository();
    await sessionRepository.create({
      id: "session-1",
      userId: "user-1",
      tokenHash: "hash:token-1",
      expiresAt: new Date(now.getTime() + 20 * 24 * 60 * 60 * 1000),
    });
    const { useCase } = createUseCase({
      clock: new FixedClock(now),
      sessionRepository,
    });

    const result = await useCase.execute({ token: "token-1" });

    expect(result).toEqual({ ok: true });
    expect(sessionRepository.sessions[0]!.deletedAt).toBeDefined();
  });

  test("logout con token inexistente no falla", async () => {
    const { useCase } = createUseCase();

    const result = await useCase.execute({ token: "token-desconocido" });

    expect(result).toEqual({ ok: true });
  });

  test("token se hashea antes de soft-delete", async () => {
    const now = new Date("2025-01-15T12:00:00.000Z");
    const sessionRepository = new InMemorySessionRepository();
    await sessionRepository.create({
      id: "session-1",
      userId: "user-1",
      tokenHash: "hash:token-1",
      expiresAt: new Date(now.getTime() + 20 * 24 * 60 * 60 * 1000),
    });
    let hashedToken = "";
    const tokenHasher: TokenHasher = {
      hash(token: string): string {
        hashedToken = token;
        return `hash:${token}`;
      },
      verify(_token: string, _hash: string): boolean {
        return false;
      },
    };
    const { useCase } = createUseCase({
      clock: new FixedClock(now),
      sessionRepository,
      tokenHasher,
    });

    await useCase.execute({ token: "token-1" });

    expect(hashedToken).toBe("token-1");
    expect(sessionRepository.sessions[0]!.deletedAt).toBeDefined();
  });
});
