import { afterAll, beforeAll, describe, expect, test } from "bun:test";
import { KyselyLoginRepository } from "./login-repository";
import { KyselyUserRepository } from "./user-repository";
import { createDatabase, type Database } from "./database";

const databaseUrl = process.env.TEST_DATABASE_URL;

describe.skipIf(!databaseUrl)("KyselyLoginRepository (integration)", () => {
  let db: Database;
  let repository: KyselyLoginRepository;
  let userRepository: KyselyUserRepository;

  beforeAll(async () => {
    if (!databaseUrl) return;
    db = createDatabase(databaseUrl);
    repository = new KyselyLoginRepository(db);
    userRepository = new KyselyUserRepository(db);
  });

  afterAll(async () => {
    if (db) {
      await db.destroy();
    }
  });

  test("CRUD básico de login", async () => {
    const userId = crypto.randomUUID();
    await userRepository.create({
      id: userId,
      email: `login-test-${Date.now()}@example.com`,
      name: "Test",
      theme: "system",
      emailVerified: true,
      acceptedTermsAt: new Date(),
      termsVersion: "1.0",
    });

    const loginId = crypto.randomUUID();
    const now = new Date();
    await repository.create({
      id: loginId,
      email: "ana@example.com",
      code: "041283",
      expiresAt: new Date(now.getTime() + 10 * 60 * 1000),
      attempts: 0,
      createdAt: now,
    });

    const latest = await repository.findLatestByEmail("ana@example.com");
    expect(latest).toBeDefined();
    expect(latest!.code).toBe("041283");

    await repository.incrementAttempts(loginId);
    const updated = await repository.findLatestByEmail("ana@example.com");
    expect(updated!.attempts).toBe(1);

    await repository.markConsumed(loginId);
    const consumed = await repository.findLatestByEmail("ana@example.com");
    expect(consumed).toBeUndefined();
  });

  test("rate-limit exacto usando índice idx_login_email_created", async () => {
    const email = `rate-${Date.now()}@example.com`;
    const now = new Date();
    const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);

    // Tres logins dentro de la última hora.
    for (let i = 0; i < 3; i += 1) {
      await repository.create({
        id: crypto.randomUUID(),
        email,
        code: "041283",
        expiresAt: new Date(now.getTime() + 10 * 60 * 1000),
        attempts: 0,
        createdAt: new Date(now.getTime() - (i + 1) * 10 * 60 * 1000),
      });
    }

    // Un login fuera de la ventana de una hora.
    await repository.create({
      id: crypto.randomUUID(),
      email,
      code: "041283",
      expiresAt: new Date(now.getTime() + 10 * 60 * 1000),
      attempts: 0,
      createdAt: new Date(now.getTime() - 70 * 60 * 1000),
    });

    const count = await repository.countRecentByEmail(email, oneHourAgo);
    expect(count).toBe(3);

    const olderWindow = new Date(now.getTime() - 80 * 60 * 1000);
    expect(await repository.countRecentByEmail(email, olderWindow)).toBe(4);
  });
});
