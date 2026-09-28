import { describe, expect, test } from "bun:test";
import { RemoveType } from "./remove-type";
import { TypeNotFound } from "./errors";
import type { TypeRepository, TypeRow } from "../../domain/ports/type-repository";

function makeRepo() {
  const rows: TypeRow[] = [
    {
      id: "t-1",
      userId: "u-1",
      name: "Desarrollo",
      module: "tasks",
      createdAt: new Date(),
    },
  ];
  const repo: TypeRepository = {
    async list() {
      return rows;
    },
    async findById() {
      return null;
    },
    async insert() {
      throw new Error("not used");
    },
    async update() {
      throw new Error("not used");
    },
    async softDelete(params) {
      const idx = rows.findIndex(
        (r) => r.userId === params.userId && r.id === params.typeId,
      );
      if (idx === -1) throw new Error("no result");
      const prev = rows[idx];
      if (!prev) throw new Error("no result");
      return prev;
    },
  };
  return { repo, rows };
}

describe("RemoveType", () => {
  test("soft-delete devuelve la fila original", async () => {
    const { repo, rows } = makeRepo();
    const useCase = new RemoveType({ typeRepository: repo });

    const row = await useCase.execute({ userId: "u-1", typeId: "t-1" });

    expect(row.id).toBe("t-1");
    expect(rows).toHaveLength(1);
  });

  test("traduce 'no result' a TypeNotFound", async () => {
    const { repo } = makeRepo();
    const useCase = new RemoveType({ typeRepository: repo });

    expect(
      useCase.execute({ userId: "u-1", typeId: "no-existe" }),
    ).rejects.toBeInstanceOf(TypeNotFound);
  });
});
