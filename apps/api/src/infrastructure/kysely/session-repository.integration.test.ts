import { afterAll, beforeAll, describe, expect, test } from "bun:test";
import { KyselySessionRepository } from "./session-repository";
import { KyselyUserRepository } from "./user-repository";
import { createDatabase, type Database } from "./database";

const databaseUrl = process.env.TEST_DATABASE_URL;

describe.skipIf(!databaseUrl)("KyselySessionRepository (integration)", () => {
  let db: Database;
  let repository: KyselySessionRepository;
  let userRepository: KyselyUserRepository;

  beforeAll(async () => {
    if (!databaseUrl) return;
    db = createDatabase(databaseUrl);
    repository = new KyselySessionRepository(db);
    userRepository = new KyselyUserRepository(db);
  });

  afterAll(async () => {
    if (db) {
      await db.destroy();
    }
  });

  test("CRUD básico de sesión", async () => {
    const userId = crypto.randomUUID();
    await userRepository.create({
      id: userId,
      email: `session-test-${Date.now()}@example.com`,
      name: "Test",
      theme: "system",
      emailVerified: true,
      acceptedTermsAt: new Date(),
      termsVersion: "1.0",
    });

    const sessionId = crypto.randomUUID();
    const now = new Date();
    await repository.create({
      id: sessionId,
      userId,
      tokenHash: "hash-token-1",
      expiresAt: new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000),
    });

    const found = await repository.findByTokenHash("hash-token-1");
    expect(found).toBeDefined();
    expect(found!.userId).toBe(userId);

    const newExpiresAt = new Date(now.getTime() + 60 * 24 * 60 * 60 * 1000);
    await repository.updateExpiresAt(sessionId, newExpiresAt);
    const updated = await repository.findByTokenHash("hash-token-1");
    expect(updated!.expiresAt.getTime()).toBe(newExpiresAt.getTime());

    await repository.softDelete("hash-token-1");
    const deleted = await repository.findByTokenHash("hash-token-1");
    expect(deleted).toBeUndefined();
  });
});
