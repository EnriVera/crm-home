import { beforeEach, describe, expect, test } from "bun:test";
import { InMemoryCategoryLookupRepository, makeTask } from "./test-helpers";
import type { CategoryRow } from "../../domain/tasks/types";
import { ListCategoriesByType } from "./list-categories-by-type";

function makeCategory(overrides: Partial<CategoryRow>): CategoryRow {
  return {
    id: "cat-1",
    userId: "u1",
    name: "General",
    typeId: "type-1",
    createdAt: new Date(0),
    deletedAt: null,
    ...overrides,
  };
}

describe("ListCategoriesByType", () => {
  let repo: InMemoryCategoryLookupRepository;
  let sut: ListCategoriesByType;

  beforeEach(() => {
    repo = new InMemoryCategoryLookupRepository();
    sut = new ListCategoriesByType({ categoryLookupRepository: repo });
  });

  test("filtra categorías por typeId", async () => {
    await repo.rows.set("c1", makeCategory({ id: "c1", typeId: "type-1" }));
    await repo.rows.set("c2", makeCategory({ id: "c2", typeId: "type-1" }));
    await repo.rows.set("c3", makeCategory({ id: "c3", typeId: "type-2" }));

    const result = await sut.execute({ userId: "u1", typeId: "type-1" });
    expect(result.map((r) => r.id).sort()).toEqual(["c1", "c2"]);
  });

  test("filtra por userId y excluye soft-deleted", async () => {
    await repo.rows.set(
      "c1",
      makeCategory({ id: "c1", userId: "u1", typeId: "type-1" }),
    );
    await repo.rows.set(
      "c2",
      makeCategory({ id: "c2", userId: "u2", typeId: "type-1" }),
    );
    await repo.rows.set(
      "c3",
      makeCategory({
        id: "c3",
        userId: "u1",
        typeId: "type-1",
        deletedAt: new Date(1000),
      }),
    );

    const result = await sut.execute({ userId: "u1", typeId: "type-1" });
    expect(result.map((r) => r.id)).toEqual(["c1"]);
  });
});
