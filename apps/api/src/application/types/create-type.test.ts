import { describe, expect, test } from "bun:test";
import { CreateType } from "./create-type";
import { InvalidTypeInput } from "./errors";
import type { TypeRepository, TypeRow } from "../../domain/ports/type-repository";

function makeRepo() {
  const rows: TypeRow[] = [];
  const repo: TypeRepository = {
    async list() {
      return rows;
    },
    async findById() {
      return null;
    },
    async insert(params) {
      const row: TypeRow = {
        id: `t-${rows.length + 1}`,
        userId: params.userId,
        name: params.name,
        modules: params.modules,
        createdAt: new Date(),
      };
      rows.push(row);
      return row;
    },
    async update() {
      throw new Error("no result");
    },
    async softDelete() {
      throw new Error("no result");
    },
  };
  return { repo, rows };
}

describe("CreateType", () => {
  test("inserta con name trimmed, normaliza y deduplica módulos", async () => {
    const { repo, rows } = makeRepo();
    const useCase = new CreateType({ typeRepository: repo });

    const row = await useCase.execute({
      userId: "u-1",
      name: "  Diseño  ",
      modules: ["incomes", "tasks", "incomes"],
    });

    expect(row.name).toBe("Diseño");
    expect(row.modules).toEqual(["incomes", "tasks"]);
    expect(rows).toHaveLength(1);
  });

  test("acepta modules=[] (all-modules)", async () => {
    const { repo, rows } = makeRepo();
    const useCase = new CreateType({ typeRepository: repo });

    const row = await useCase.execute({
      userId: "u-1",
      name: "General",
      modules: [],
    });

    expect(row.modules).toEqual([]);
    expect(rows).toHaveLength(1);
  });

  test("rechaza name vacío", async () => {
    const { repo } = makeRepo();
    const useCase = new CreateType({ typeRepository: repo });

    expect(
      useCase.execute({ userId: "u-1", name: "   ", modules: ["tasks"] }),
    ).rejects.toBeInstanceOf(InvalidTypeInput);
  });

  test("rechaza name de más de 100 chars", async () => {
    const { repo } = makeRepo();
    const useCase = new CreateType({ typeRepository: repo });

    expect(
      useCase.execute({
        userId: "u-1",
        name: "x".repeat(101),
        modules: ["tasks"],
      }),
    ).rejects.toBeInstanceOf(InvalidTypeInput);
  });

  test("rechaza módulo fuera del set cerrado", async () => {
    const { repo } = makeRepo();
    const useCase = new CreateType({ typeRepository: repo });

    expect(
      useCase.execute({
        userId: "u-1",
        name: "OK",
        modules: ["nope" as never],
      }),
    ).rejects.toBeInstanceOf(InvalidTypeInput);
  });
});
