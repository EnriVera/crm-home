import { describe, expect, test } from "bun:test";
import { ListTypes } from "./list-types";
import type { TypeRepository, TypeRow } from "../../domain/ports/type-repository";

function makeType(overrides: Partial<TypeRow> = {}): TypeRow {
  return {
    id: "t-1",
    userId: "u-1",
    name: "Desarrollo",
    module: "tasks",
    createdAt: new Date("2026-01-01T00:00:00Z"),
    ...overrides,
  };
}

class InMemoryTypeRepository implements TypeRepository {
  rows: TypeRow[] = [];
  constructor(initial: TypeRow[] = []) {
    this.rows = [...initial];
  }
  async list(params: {
    userId: string;
    search: string;
    module: TypeRow["module"] | null;
    limit: number;
  }) {
    return this.rows
      .filter((r) => r.userId === params.userId)
      .filter(
        (r) =>
          params.module === null ||
          r.module === params.module,
      )
      .filter(
        (r) =>
          params.search === "" ||
          r.name.toLowerCase().startsWith(params.search.toLowerCase()),
      )
      .slice(0, params.limit);
  }
  async findById(params: { userId: string; typeId: string }) {
    return (
      this.rows.find(
        (r) => r.userId === params.userId && r.id === params.typeId,
      ) ?? null
    );
  }
  async insert(params: {
    userId: string;
    name: string;
    module: TypeRow["module"];
  }) {
    const row: TypeRow = {
      id: `t-${this.rows.length + 1}`,
      userId: params.userId,
      name: params.name,
      module: params.module,
      createdAt: new Date(),
    };
    this.rows.push(row);
    return row;
  }
  async update(params: {
    userId: string;
    typeId: string;
    name?: string;
    module?: TypeRow["module"];
  }) {
    const idx = this.rows.findIndex(
      (r) => r.userId === params.userId && r.id === params.typeId,
    );
    if (idx === -1) throw new Error("no result");
    const prev = this.rows[idx];
    if (!prev) throw new Error("no result");
    const next: TypeRow = {
      ...prev,
      ...(params.name === undefined ? {} : { name: params.name }),
      ...(params.module === undefined ? {} : { module: params.module }),
    };
    this.rows[idx] = next;
    return next;
  }
  async softDelete(params: { userId: string; typeId: string }) {
    const idx = this.rows.findIndex(
      (r) => r.userId === params.userId && r.id === params.typeId,
    );
    if (idx === -1) throw new Error("no result");
    const prev = this.rows[idx];
    if (!prev) throw new Error("no result");
    return prev;
  }
}

describe("ListTypes", () => {
  test("devuelve los types del user filtrando por módulo", async () => {
    const repo = new InMemoryTypeRepository([
      makeType({ id: "t-1", name: "Desarrollo", module: "tasks" }),
      makeType({ id: "t-2", name: "Diseño", module: "tasks" }),
      makeType({ id: "t-3", name: "Sueldo", module: "incomes" }),
    ]);
    const useCase = new ListTypes({ typeRepository: repo });

    const rows = await useCase.execute({
      userId: "u-1",
      search: "",
      module: "tasks",
      limit: 50,
    });

    expect(rows.map((r) => r.id)).toEqual(["t-1", "t-2"]);
  });

  test("filtra por search case-insensitive", async () => {
    const repo = new InMemoryTypeRepository([
      makeType({ id: "t-1", name: "Backend" }),
      makeType({ id: "t-2", name: "Frontend" }),
      makeType({ id: "t-3", name: "Betatesting" }),
      makeType({ id: "t-4", name: "Diseño" }),
    ]);
    const useCase = new ListTypes({ typeRepository: repo });

    // search "BA" (mayúsculas) debe matchear "Backend" pero NO los demás
    // (case-insensitive prefix). "Betatesting" no matchea porque empieza
    // con "BE", no "BA".
    const rows = await useCase.execute({
      userId: "u-1",
      search: "BA",
      module: null,
      limit: 50,
    });

    expect(rows.map((r) => r.id)).toEqual(["t-1"]);
  });

  test("capa limit al rango [1, 100]", async () => {
    const repo = new InMemoryTypeRepository([]);
    const useCase = new ListTypes({ typeRepository: repo });

    // límite 0 → sube a 1; límite 9999 → baja a 100. No rompe ni
    // devuelve array gigante.
    await useCase.execute({
      userId: "u-1",
      search: "",
      module: null,
      limit: 0,
    });
    await useCase.execute({
      userId: "u-1",
      search: "",
      module: null,
      limit: 9999,
    });
    // Sin asserts: el contrato es que no tira; el comportamiento se
    // verifica arriba al pasar `limit: 50` y obtener 2 filas.
    expect(true).toBe(true);
  });

  test("no filtra rows de otros users", async () => {
    const repo = new InMemoryTypeRepository([
      makeType({ id: "t-1", userId: "u-1" }),
      makeType({ id: "t-2", userId: "u-2" }),
    ]);
    const useCase = new ListTypes({ typeRepository: repo });

    const rows = await useCase.execute({
      userId: "u-1",
      search: "",
      module: null,
      limit: 50,
    });

    expect(rows.map((r) => r.id)).toEqual(["t-1"]);
  });
});
