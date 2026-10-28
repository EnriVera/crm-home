import { describe, expect, it } from "vitest";
import {
  filterTypes,
  reorderStates,
  sortStates,
  taskCountByType,
  type TaskState,
  type TaskType,
} from "~/domain/config/entities";

const types: TaskType[] = [
  {
    id: "t1",
    name: "Diseño",
    modules: ["tasks"],
    createdAt: new Date("2026-06-01T10:00:00.000Z"),
  },
  {
    id: "t2",
    name: "Desarrollo",
    modules: ["tasks"],
    createdAt: new Date("2026-06-02T10:00:00.000Z"),
  },
  {
    id: "t3",
    name: "Marketing",
    modules: ["tasks"],
    createdAt: new Date("2026-06-03T10:00:00.000Z"),
  },
];

const states: TaskState[] = [
  { id: "s1", name: "Pendiente", order: 1 },
  { id: "s2", name: "En progreso", order: 2 },
  { id: "s3", name: "Completado", order: 3 },
];

describe("filterTypes", () => {
  it("returns every type when the search is empty", () => {
    expect(filterTypes(types, "")).toHaveLength(3);
    expect(filterTypes(types, "   ")).toHaveLength(3);
  });

  it("matches the name without case", () => {
    expect(filterTypes(types, "diseño").map((t) => t.id)).toEqual(["t1"]);
  });

  it("returns nothing when no type matches", () => {
    expect(filterTypes(types, "zzz")).toEqual([]);
  });
});

describe("sortStates", () => {
  it("orders the states by their order column", () => {
    const shuffled = [states[2]!, states[0]!, states[1]!];
    expect(sortStates(shuffled).map((s) => s.id)).toEqual(["s1", "s2", "s3"]);
  });

  it("breaks a tie on the order with the name", () => {
    const tied: TaskState[] = [
      { id: "b", name: "Bloqueada", order: 1 },
      { id: "a", name: "Archivada", order: 1 },
    ];
    expect(sortStates(tied).map((s) => s.id)).toEqual(["a", "b"]);
  });

  it("does not mutate the input", () => {
    const input = [states[1]!, states[0]!];
    sortStates(input);
    expect(input.map((s) => s.id)).toEqual(["s2", "s1"]);
  });
});

describe("reorderStates", () => {
  it("moves a state to the requested position", () => {
    const orders = reorderStates(states, "s3", 0);
    expect(orders).toEqual([
      { tast_id: "s3", tast_order: 1 },
      { tast_id: "s1", tast_order: 2 },
      { tast_id: "s2", tast_order: 3 },
    ]);
  });

  it("keeps the relative order of the others", () => {
    const orders = reorderStates(states, "s1", 2);
    expect(orders.map((o) => o.tast_id)).toEqual(["s2", "s3", "s1"]);
  });

  it("sends every state, because the API rejects a partial reorder", () => {
    const orders = reorderStates(states, "s2", 0);
    expect(orders).toHaveLength(states.length);
  });

  it("leaves the order untouched for an unknown state", () => {
    const orders = reorderStates(states, "nope", 0);
    expect(orders.map((o) => o.tast_id)).toEqual(["s1", "s2", "s3"]);
  });
});

describe("taskCountByType", () => {
  it("counts the tasks of each type", () => {
    const counts = taskCountByType([
      { typeId: "t1" },
      { typeId: "t1" },
      { typeId: "t2" },
    ]);
    expect(counts.get("t1")).toBe(2);
    expect(counts.get("t2")).toBe(1);
    expect(counts.get("t3")).toBeUndefined();
  });
});

describe("filterStates / filterCurrencies / filterCategories", () => {
  it("filters states by name, case-insensitive", async () => {
    const { filterStates } = await import("~/domain/config/entities");
    const states = [
      { id: "s1", name: "Pendiente", order: 1 },
      { id: "s2", name: "En progreso", order: 2 },
    ];
    expect(filterStates(states, "pen")).toHaveLength(1);
    expect(filterStates(states, "PROGRESO")).toHaveLength(1);
    expect(filterStates(states, "  ")).toHaveLength(2);
    expect(filterStates(states, "zzz")).toHaveLength(0);
  });

  it("filters currencies by name or symbol", async () => {
    const { filterCurrencies } = await import("~/domain/config/entities");
    const currencies = [
      { id: "c1", name: "Peso argentino", symbol: "$", decimals: 2 },
      { id: "c2", name: "Dólar estadounidense", symbol: "US$", decimals: 2 },
    ];
    expect(filterCurrencies(currencies, "dólar")).toHaveLength(1);
    expect(filterCurrencies(currencies, "us$")).toHaveLength(1);
    expect(filterCurrencies(currencies, "")).toHaveLength(2);
  });

  it("filters categories by name", async () => {
    const { filterCategories } = await import("~/domain/config/entities");
    const categories = [
      { id: "k1", name: "Web", typeId: "t1", createdAt: new Date() },
      { id: "k2", name: "Branding", typeId: "t1", createdAt: new Date() },
    ];
    expect(filterCategories(categories, "brand")).toHaveLength(1);
    expect(filterCategories(categories, "")).toHaveLength(2);
  });
});

describe("categoryTypeName", () => {
  it("resolves the parent type name", async () => {
    const { categoryTypeName } = await import("~/domain/config/entities");
    const types = [
      { id: "t1", name: "Diseño", modules: ["tasks"] as const, createdAt: new Date() },
    ];
    const category = {
      id: "k1",
      name: "Web",
      typeId: "t1",
      createdAt: new Date(),
    };
    expect(categoryTypeName(category, types)).toBe("Diseño");
  });

  it("returns null when the type is not loaded", async () => {
    const { categoryTypeName } = await import("~/domain/config/entities");
    const category = {
      id: "k1",
      name: "Web",
      typeId: "missing",
      createdAt: new Date(),
    };
    expect(categoryTypeName(category, [])).toBeNull();
  });
});
