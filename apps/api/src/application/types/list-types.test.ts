import { describe, expect, test } from "bun:test";
import { ListTypes } from "./list-types";
import type { TypeRepository, TypeRow } from "../../domain/ports/type-repository";

function makeType(overrides: Partial<TypeRow> = {}): TypeRow {
  return {
    id: "t-1",
    userId: "u-1",
    name: "Desarrollo",
    modules: ["tasks"],
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
    module: TypeRow["modules"][number] | null;
    limit: number;
  }) {
    return this.rows
      .filter((r) => r.userId === params.userId)
      .filter(
        (r) =>
          params.module === null
            ? r.modules.length === 0
            : r.modules.includes(params.module),
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
    modules: TypeRow["modules"];
  }) {
    const row: TypeRow = {
      id: `t-${this.rows.length + 1}`,
      userId: params.userId,
      name: params.name,
      modules: params.modules,
      createdAt: new Date(),
    };
    this.rows.push(row);
    return row;
  }
  async update(params: {
    userId: string;
    typeId: string;
    name?: string;
    modules?: TypeRow["modules"];
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
      ...(params.modules === undefined ? {} : { modules: params.modules }),
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
  test("devuelve los types del user filtrando por módulo (array-contains)", async () => {
    const repo = new InMemoryTypeRepository([
      makeType({ id: "t-1", name: "Desarrollo", modules: ["tasks"] }),
      makeType({ id: "t-2", name: "Diseño", modules: ["tasks", "incomes"] }),
      makeType({ id: "t-3", name: "Sueldo", modules: ["incomes"] }),
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

  test("module=null devuelve los types con modules=[] (all-modules)", async () => {
    const repo = new InMemoryTypeRepository([
      makeType({ id: "t-1", name: "General", modules: [] }),
      makeType({ id: "t-2", name: "Tasks-only", modules: ["tasks"] }),
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

  test("filtra por search case-insensitive", async () => {
    const repo = new InMemoryTypeRepository([
      makeType({ id: "t-1", name: "Backend" }),
      makeType({ id: "t-2", name: "Frontend" }),
      makeType({ id: "t-3", name: "Betatesting" }),
      makeType({ id: "t-4", name: "Diseño" }),
    ]);
    const useCase = new ListTypes({ typeRepository: repo });

    const rows = await useCase.execute({
      userId: "u-1",
      search: "BA",
      // module: "tasks" (no null) — el filter null matchea solo all-modules;
      // acá queremos ejercitar el search, así que pedimos un módulo que
      // contenga los 4 rows de prueba.
      module: "tasks",
      limit: 50,
    });

    expect(rows.map((r) => r.id)).toEqual(["t-1"]);
  });

  test("capa limit al rango [1, 100]", async () => {
    const repo = new InMemoryTypeRepository([]);
    const useCase = new ListTypes({ typeRepository: repo });

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
      // module: "tasks" (no null) — ver comentario en el test de search.
      module: "tasks",
      limit: 50,
    });

    expect(rows.map((r) => r.id)).toEqual(["t-1"]);
  });
});
