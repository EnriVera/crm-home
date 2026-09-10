import { beforeEach, describe, expect, test } from "bun:test";
import { InMemoryTypeLookupRepository } from "./test-helpers";
import type { TypeCategoriesClientRow } from "../../domain/tasks/types";
import { ListTypesForForm } from "./list-types-for-form";

function makeRow(overrides: Partial<TypeCategoriesClientRow>): TypeCategoriesClientRow {
  return {
    id: "row-1",
    userId: "u1",
    typeId: "type-1",
    categoryId: "cat-1",
    clientId: null,
    createdAt: new Date(0),
    updatedAt: new Date(0),
    deletedAt: null,
    ...overrides,
  };
}

describe("ListTypesForForm", () => {
  let repo: InMemoryTypeLookupRepository;
  let sut: ListTypesForForm;

  beforeEach(() => {
    repo = new InMemoryTypeLookupRepository();
    sut = new ListTypesForForm({ typeLookupRepository: repo });
  });

  test("sin clieId devuelve las filas GLOBALES (clientId === null)", async () => {
    await repo.rows.set("g1", makeRow({ id: "g1", clientId: null }));
    await repo.rows.set("c1", makeRow({ id: "c1", clientId: "client-1" }));

    const result = await sut.execute({ userId: "u1" });
    expect(result.map((r) => r.id)).toEqual(["g1"]);
  });

  test("con clieId devuelve las filas asociadas al cliente", async () => {
    await repo.rows.set("g1", makeRow({ id: "g1", clientId: null }));
    await repo.rows.set("c1", makeRow({ id: "c1", clientId: "client-1" }));
    await repo.rows.set("c2", makeRow({ id: "c2", clientId: "client-2" }));

    const result = await sut.execute({ userId: "u1", clieId: "client-1" });
    expect(result.map((r) => r.id)).toEqual(["c1"]);
  });

  test("excluye filas de otros usuarios", async () => {
    await repo.rows.set("g1", makeRow({ id: "g1", userId: "u1", clientId: null }));
    await repo.rows.set("g2", makeRow({ id: "g2", userId: "u2", clientId: null }));

    const result = await sut.execute({ userId: "u1" });
    expect(result.map((r) => r.id)).toEqual(["g1"]);
  });
});
