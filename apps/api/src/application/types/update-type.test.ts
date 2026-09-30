import { describe, expect, test } from "bun:test";
import { UpdateType } from "./update-type";
import { InvalidTypeInput, TypeNotFound } from "./errors";
import type {
  TypeRepository,
  TypeRow,
} from "../../domain/ports/type-repository";

function makeRow(overrides: Partial<TypeRow> = {}): TypeRow {
  return {
    id: "t-1",
    userId: "u-1",
    name: "Desarrollo",
    modules: ["tasks"],
    createdAt: new Date("2026-01-01T00:00:00Z"),
    ...overrides,
  };
}

function makeRepo(initial: TypeRow[]) {
  const rows: TypeRow[] = [...initial];
  const repo: TypeRepository = {
    async list() {
      return rows;
    },
    async findById(params) {
      return (
        rows.find(
          (r) => r.userId === params.userId && r.id === params.typeId,
        ) ?? null
      );
    },
    async insert() {
      throw new Error("not used");
    },
    async update(params) {
      const idx = rows.findIndex(
        (r) => r.userId === params.userId && r.id === params.typeId,
      );
      if (idx === -1) throw new Error("no result");
      const prev = rows[idx];
      if (!prev) throw new Error("no result");
      const next: TypeRow = {
        ...prev,
        ...(params.name === undefined ? {} : { name: params.name }),
        ...(params.modules === undefined ? {} : { modules: params.modules }),
      };
      rows[idx] = next;
      return next;
    },
    async softDelete() {
      throw new Error("not used");
    },
  };
  return { repo, rows };
}

describe("UpdateType", () => {
  test("actualiza name y lo trimea", async () => {
    const { repo, rows } = makeRepo([makeRow()]);
    const useCase = new UpdateType({ typeRepository: repo });

    const updated = await useCase.execute({
      userId: "u-1",
      typeId: "t-1",
      name: "  Frontend  ",
    });

    expect(updated.name).toBe("Frontend");
    expect(rows[0]?.name).toBe("Frontend");
  });

  test("actualiza solo modules (replace, normaliza y ordena)", async () => {
    const { repo, rows } = makeRepo([makeRow({ modules: ["tasks"] })]);
    const useCase = new UpdateType({ typeRepository: repo });

    const updated = await useCase.execute({
      userId: "u-1",
      typeId: "t-1",
      modules: ["expenses", "tasks", "expenses"],
    });

    expect(updated.modules).toEqual(["expenses", "tasks"]);
    expect(rows[0]?.modules).toEqual(["expenses", "tasks"]);
  });

  test("acepta modules=[] para pasar a all-modules", async () => {
    const { repo, rows } = makeRepo([makeRow({ modules: ["tasks"] })]);
    const useCase = new UpdateType({ typeRepository: repo });

    const updated = await useCase.execute({
      userId: "u-1",
      typeId: "t-1",
      modules: [],
    });

    expect(updated.modules).toEqual([]);
    expect(rows[0]?.modules).toEqual([]);
  });

  test("rechaza name vacío", async () => {
    const { repo } = makeRepo([makeRow()]);
    const useCase = new UpdateType({ typeRepository: repo });

    expect(
      useCase.execute({
        userId: "u-1",
        typeId: "t-1",
        name: "   ",
      }),
    ).rejects.toBeInstanceOf(InvalidTypeInput);
  });

  test("rechaza módulo fuera del set cerrado", async () => {
    const { repo } = makeRepo([makeRow()]);
    const useCase = new UpdateType({ typeRepository: repo });

    expect(
      useCase.execute({
        userId: "u-1",
        typeId: "t-1",
        modules: ["nope" as never],
      }),
    ).rejects.toBeInstanceOf(InvalidTypeInput);
  });

  test("traduce 'no result' del repo a TypeNotFound", async () => {
    const { repo } = makeRepo([]);
    const useCase = new UpdateType({ typeRepository: repo });

    expect(
      useCase.execute({
        userId: "u-1",
        typeId: "t-1",
        name: "x",
      }),
    ).rejects.toBeInstanceOf(TypeNotFound);
  });
});
