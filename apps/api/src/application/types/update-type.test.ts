import { describe, expect, test } from "bun:test";
import { UpdateType } from "./update-type";
import { InvalidTypeInput, TypeNotFound } from "./errors";
import type { TypeRepository, TypeRow } from "../../domain/ports/type-repository";

function makeRow(overrides: Partial<TypeRow> = {}): TypeRow {
  return {
    id: "t-1",
    userId: "u-1",
    name: "Desarrollo",
    module: "tasks",
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
        ...(params.module === undefined ? {} : { module: params.module }),
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

  test("actualiza solo module", async () => {
    const { repo, rows } = makeRepo([makeRow()]);
    const useCase = new UpdateType({ typeRepository: repo });

    const updated = await useCase.execute({
      userId: "u-1",
      typeId: "t-1",
      module: "incomes",
    });

    expect(updated.module).toBe("incomes");
    expect(updated.name).toBe("Desarrollo"); // intacto
    expect(rows[0]?.module).toBe("incomes");
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
        module: "nope" as unknown as TypeRow["module"],
      }),
    ).rejects.toBeInstanceOf(InvalidTypeInput);
  });

  test("traduce 'no result' del repo a TypeNotFound", async () => {
    const { repo } = makeRepo([]); // vacío: el update no encuentra la fila
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
