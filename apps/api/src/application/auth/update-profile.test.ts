import { describe, expect, test } from "bun:test";
import { UpdateProfile, InvalidProfileError } from "./update-profile";
import type { Clock } from "../../domain/ports/clock";
import type {
  Session,
  SessionRepository,
} from "../../domain/ports/session-repository";
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

  async findByEmail(email: string): Promise<User | undefined> {
    return this.users.find((u) => u.email === email);
  }

  async create(user: User): Promise<void> {
    this.users.push({ ...user });
  }

  async markEmailVerified(id: string): Promise<void> {
    const user = this.users.find((u) => u.id === id);
    if (user) user.emailVerified = true;
  }

  async updateTheme(id: string, theme: string): Promise<void> {
    const user = this.users.find((u) => u.id === id);
    if (user) user.theme = theme;
  }

  async updateProfile(
    id: string,
    profile: { name: string; studio: string | null },
  ): Promise<void> {
    const user = this.users.find((u) => u.id === id);
    if (user) {
      user.name = profile.name;
      user.studio = profile.studio;
    }
  }
}

const NOW = new Date("2026-11-23T12:00:00.000Z");

function createUseCase(overrides: {
  clock?: Clock;
  sessionRepository?: InMemorySessionRepository;
  userRepository?: InMemoryUserRepository;
} = {}) {
  const clock = overrides.clock ?? new FixedClock(NOW);
  const sessionRepository =
    overrides.sessionRepository ?? new InMemorySessionRepository();
  const userRepository =
    overrides.userRepository ?? new InMemoryUserRepository();
  const useCase = new UpdateProfile({
    clock,
    sessionRepository,
    userRepository,
    tokenHasher: new FakeTokenHasher(),
  });
  return { useCase, sessionRepository, userRepository };
}

async function seedActiveSession(
  sessionRepository: InMemorySessionRepository,
  userRepository: InMemoryUserRepository,
): Promise<void> {
  await userRepository.create({
    id: "user-1",
    email: "ana@example.com",
    name: "Ana",
    theme: "system",
    emailVerified: true,
    acceptedTermsAt: NOW,
    studio: null,
    termsVersion: "1.0",
  });
  await sessionRepository.create({
    id: "session-1",
    userId: "user-1",
    tokenHash: "hash:token-1",
    expiresAt: new Date(NOW.getTime() + 20 * 24 * 60 * 60 * 1000),
  });
}

describe("UpdateProfile", () => {
  test("actualiza nombre y estudio", async () => {
    const { useCase, sessionRepository, userRepository } = createUseCase();
    await seedActiveSession(sessionRepository, userRepository);

    const result = await useCase.execute({
      token: "token-1",
      name: "Ana López",
      studio: "Estudio Norte",
    });

    expect(result).not.toBeNull();
    expect(result?.name).toBe("Ana López");
    expect(result?.studio).toBe("Estudio Norte");
    // El email NO se toca: la identidad del usuario es el email.
    expect(result?.email).toBe("ana@example.com");
  });

  test("persiste el cambio en el repositorio", async () => {
    const { useCase, sessionRepository, userRepository } = createUseCase();
    await seedActiveSession(sessionRepository, userRepository);

    await useCase.execute({
      token: "token-1",
      name: "Ana López",
      studio: "Estudio Norte",
    });

    const stored = await userRepository.findById("user-1");
    expect(stored?.name).toBe("Ana López");
    expect(stored?.studio).toBe("Estudio Norte");
    expect(stored?.email).toBe("ana@example.com");
  });

  test("guarda el estudio vacío como null (sin definir)", async () => {
    const { useCase, sessionRepository, userRepository } = createUseCase();
    await seedActiveSession(sessionRepository, userRepository);

    const result = await useCase.execute({
      token: "token-1",
      name: "Ana",
      studio: "   ",
    });

    expect(result?.studio).toBeNull();
  });

  test("recorta el nombre y el estudio", async () => {
    const { useCase, sessionRepository, userRepository } = createUseCase();
    await seedActiveSession(sessionRepository, userRepository);

    const result = await useCase.execute({
      token: "token-1",
      name: "  Ana López  ",
      studio: "  Estudio Norte  ",
    });

    expect(result?.name).toBe("Ana López");
    expect(result?.studio).toBe("Estudio Norte");
  });

  test("rechaza un nombre vacío", async () => {
    const { useCase, sessionRepository, userRepository } = createUseCase();
    await seedActiveSession(sessionRepository, userRepository);

    await expect(
      useCase.execute({ token: "token-1", name: "   ", studio: null }),
    ).rejects.toBeInstanceOf(InvalidProfileError);
  });

  test("rechaza un nombre de más de 120 caracteres", async () => {
    const { useCase, sessionRepository, userRepository } = createUseCase();
    await seedActiveSession(sessionRepository, userRepository);

    await expect(
      useCase.execute({
        token: "token-1",
        name: "a".repeat(121),
        studio: null,
      }),
    ).rejects.toBeInstanceOf(InvalidProfileError);
  });

  test("sin sesión válida devuelve null", async () => {
    const { useCase } = createUseCase();

    const result = await useCase.execute({
      token: "token-inexistente",
      name: "Ana",
      studio: null,
    });

    expect(result).toBeNull();
  });

  test("no actualiza nada si la sesión está expirada", async () => {
    const sessionRepository = new InMemorySessionRepository();
    const userRepository = new InMemoryUserRepository();
    const now = new Date("2026-11-23T12:00:00.000Z");
    await userRepository.create({
      id: "user-1",
      email: "ana@example.com",
      name: "Ana",
      theme: "system",
      emailVerified: true,
      acceptedTermsAt: now,
      studio: null,
      termsVersion: "1.0",
    });
    await sessionRepository.create({
      id: "session-1",
      userId: "user-1",
      tokenHash: "hash:token-1",
      expiresAt: new Date(now.getTime() - 1000),
    });
    const { useCase } = createUseCase({ sessionRepository, userRepository });

    const result = await useCase.execute({
      token: "token-1",
      name: "Ana López",
      studio: null,
    });

    expect(result).toBeNull();
    const stored = await userRepository.findById("user-1");
    expect(stored?.name).toBe("Ana");
  });
});
