import { afterAll, beforeAll, describe, expect, test } from "bun:test";
import { sql } from "kysely";
import { cleanupAuthTables, cleanupTasksTables } from "./test-cleanup";
import { describeIntegration, openTestDatabase } from "./test-db.helper";
import { resolveTestDatabaseUrl } from "./test-db";
import type { Database } from "./database";
import { KyselyClientLookupRepository } from "./client-lookup-repository";

const databaseUrl = resolveTestDatabaseUrl();

describeIntegration(
  "KyselyClientLookupRepository (integration) — multi-user isolation",
  () => {
    let db: Database;
    let repository: KyselyClientLookupRepository;

    beforeAll(async () => {
      db = await openTestDatabase();
      repository = new KyselyClientLookupRepository(db);
    });

    afterAll(async () => {
      await cleanupTasksTables(db);
      await cleanupAuthTables(db);
      await db.destroy();
    });

    test("searchByName devuelve solo clientes del userId (multi-user isolation)", async () => {
      const userA = crypto.randomUUID();
      const userB = crypto.randomUUID();
      await sql`INSERT INTO "user" (user_id, user_email, user_name)
                VALUES (${userA}, ${`a-${Date.now()}@example.com`}, 'A'),
                       (${userB}, ${`b-${Date.now()}@example.com`}, 'B')`.execute(
        db,
      );

      const clientA = crypto.randomUUID();
      const clientB = crypto.randomUUID();
      await sql`INSERT INTO client (clie_id, clie_user_id, clie_name)
                VALUES (${clientA}, ${userA}, 'Acme Corp'),
                       (${clientB}, ${userB}, 'Acme Subsidiary')`.execute(db);

      const results = await repository.searchByName({
        userId: userA,
        query: "Acme",
        limit: 50,
      });

      expect(results.map((r) => r.id)).toEqual([clientA]);
      expect(results.find((r) => r.id === clientB)).toBeUndefined();
    });

    test("searchByName es case-insensitive (ILIKE)", async () => {
      const userId = crypto.randomUUID();
      await sql`INSERT INTO "user" (user_id, user_email, user_name)
                VALUES (${userId}, ${`c-${Date.now()}@example.com`}, 'C')`.execute(
        db,
      );

      const clientId = crypto.randomUUID();
      await sql`INSERT INTO client (clie_id, clie_user_id, clie_name)
                VALUES (${clientId}, ${userId}, 'Globex Industries')`.execute(
        db,
      );

      const lower = await repository.searchByName({
        userId,
        query: "globex",
        limit: 50,
      });
      const upper = await repository.searchByName({
        userId,
        query: "GLOBEX",
        limit: 50,
      });

      expect(lower.map((r) => r.id)).toEqual([clientId]);
      expect(upper.map((r) => r.id)).toEqual([clientId]);
    });

    test("searchByName devuelve hasta 100 filas (el max del contrato)", async () => {
      const userId = crypto.randomUUID();
      await sql`INSERT INTO "user" (user_id, user_email, user_name)
                VALUES (${userId}, ${`d-${Date.now()}@example.com`}, 'D')`.execute(
        db,
      );

      for (let i = 0; i < 120; i += 1) {
        await sql`INSERT INTO client (clie_id, clie_user_id, clie_name)
                  VALUES (${crypto.randomUUID()}, ${userId}, ${`Match ${i}`})`.execute(
          db,
        );
      }

      const results = await repository.searchByName({
        userId,
        query: "Match",
        limit: 100,
      });
      expect(results.length).toBe(100);

      // Por encima del max del contrato el repo no inventa filas.
      const capped = await repository.searchByName({
        userId,
        query: "Match",
        limit: 500,
      });
      expect(capped.length).toBe(100);
    });
  },
);
