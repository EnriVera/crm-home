import { beforeEach, describe, expect, test } from "bun:test";
import { InMemoryClientLookupRepository, makeClient } from "./test-helpers";
import { ListClientsForSelector } from "./list-clients-for-selector";

describe("ListClientsForSelector", () => {
  let repo: InMemoryClientLookupRepository;
  let sut: ListClientsForSelector;

  beforeEach(() => {
    repo = new InMemoryClientLookupRepository();
    sut = new ListClientsForSelector({ clientLookupRepository: repo });
  });

  test("filtra por userId y aplica substring case-insensitive sobre name", async () => {
    await repo.rows.set(
      "c1",
      makeClient({ id: "c1", userId: "u1", name: "Acme Corp" }),
    );
    await repo.rows.set(
      "c2",
      makeClient({ id: "c2", userId: "u1", name: "Globex" }),
    );
    await repo.rows.set(
      "c3",
      makeClient({ id: "c3", userId: "u1", name: "ACME Subsidiary" }),
    );
    await repo.rows.set(
      "c4",
      makeClient({ id: "c4", userId: "u2", name: "Acme Other" }),
    );

    const result = await sut.execute({ userId: "u1", query: "acme" });
    expect(result.map((r) => r.id).sort()).toEqual(["c1", "c3"]);
  });

  test("cap automático en 50 aunque el caller pida más", async () => {
    for (let i = 0; i < 60; i += 1) {
      await repo.rows.set(
        `c${i}`,
        makeClient({ id: `c${i}`, userId: "u1", name: `Client ${i}` }),
      );
    }

    const result = await sut.execute({
      userId: "u1",
      query: "Client",
      limit: 100,
    });
    expect(result.length).toBe(50);
  });

  test("respeta el limit del caller cuando es menor que 50", async () => {
    for (let i = 0; i < 20; i += 1) {
      await repo.rows.set(
        `c${i}`,
        makeClient({ id: `c${i}`, userId: "u1", name: `Match ${i}` }),
      );
    }

    const result = await sut.execute({
      userId: "u1",
      query: "Match",
      limit: 5,
    });
    expect(result.length).toBe(5);
  });
});
