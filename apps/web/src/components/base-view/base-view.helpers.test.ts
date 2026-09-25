import { describe, expect, test } from "bun:test";
import {
  buildBaseViewStorageKey,
  buildViewStorageKey,
  isValidViewKind,
  parsePersistedFilters,
  parsePersistedView,
  serializeFilters,
} from "./base-view.helpers";

describe("buildBaseViewStorageKey", () => {
  test("sin id usa 'default' como sufijo", () => {
    expect(buildBaseViewStorageKey(undefined, "tasks")).toBe(
      "base-view:tasks:default",
    );
  });

  test("con id lo agrega como sufijo", () => {
    expect(buildBaseViewStorageKey("tasks-list", "tasks")).toBe(
      "base-view:tasks:tasks-list",
    );
  });
});

describe("buildViewStorageKey", () => {
  test("deriva de baseViewStorageKey con sufijo ':view'", () => {
    expect(buildViewStorageKey("tasks-list", "tasks")).toBe(
      "base-view:tasks:tasks-list:view",
    );
  });
});

describe("serializeFilters / parsePersistedFilters", () => {
  test("round-trip con objeto no vacío", () => {
    const original = { search: "foo", stateId: "abc" };
    const raw = serializeFilters(original);
    expect(parsePersistedFilters(raw)).toEqual(original);
  });

  test("objeto vacío serializa como {} y parsea como {}", () => {
    expect(parsePersistedFilters(serializeFilters({}))).toEqual({});
  });

  test("raw null o vacío devuelve {}", () => {
    expect(parsePersistedFilters(null)).toEqual({});
    expect(parsePersistedFilters("")).toEqual({});
  });

  test("JSON inválido devuelve {} (fallback defensivo)", () => {
    expect(parsePersistedFilters("not json")).toEqual({});
  });

  test("JSON array devuelve {} (rechaza arrays)", () => {
    expect(parsePersistedFilters("[1,2,3]")).toEqual({});
  });
});

describe("isValidViewKind", () => {
  test("acepta los 3 valores válidos", () => {
    expect(isValidViewKind("list")).toBe(true);
    expect(isValidViewKind("grid")).toBe(true);
    expect(isValidViewKind("kanban")).toBe(true);
  });

  test("rechaza strings arbitrarios", () => {
    expect(isValidViewKind("foo")).toBe(false);
    expect(isValidViewKind("")).toBe(false);
    expect(isValidViewKind("LIST")).toBe(false); // case-sensitive
  });

  test("rechaza no-strings", () => {
    expect(isValidViewKind(null)).toBe(false);
    expect(isValidViewKind(undefined)).toBe(false);
    expect(isValidViewKind(123)).toBe(false);
    expect(isValidViewKind({})).toBe(false);
  });
});

describe("parsePersistedView", () => {
  test("string válido retorna el view kind", () => {
    expect(parsePersistedView("grid")).toBe("grid");
    expect(parsePersistedView("kanban")).toBe("kanban");
  });

  test("null o undefined retorna null", () => {
    expect(parsePersistedView(null)).toBe(null);
    expect(parsePersistedView(undefined)).toBe(null);
    expect(parsePersistedView("")).toBe(null);
  });

  test("string inválido retorna null", () => {
    expect(parsePersistedView("foo")).toBe(null);
    expect(parsePersistedView("LIST")).toBe(null);
  });
});
