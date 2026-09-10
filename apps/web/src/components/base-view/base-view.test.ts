import { describe, expect, test } from "bun:test";
import {
  buildBaseViewStorageKey,
  parsePersistedFilters,
  serializeFilters,
} from "./base-view.helpers";

/**
 * Tests del componente BaseView. Se prueban los helpers puros
 * (state, persistence, key namespacing) directamente sin importar el
 * componente `.tsrx` (que requiere el plugin de Octane para resolver).
 *
 * Las pruebas de renderizado real se cubren en E2E con el pipeline de
 * Octane corriendo.
 */

describe("buildBaseViewStorageKey", () => {
  test("usa el namespace base-view:<id> cuando se provee id", () => {
    expect(buildBaseViewStorageKey("tasks-list", "tasks")).toBe(
      "base-view:tasks:tasks-list",
    );
  });

  test("usa el namespace base-view:default-<kind> cuando no se provee id", () => {
    expect(buildBaseViewStorageKey(undefined, "tasks")).toBe(
      "base-view:tasks:default",
    );
  });

  test("NO colisiona con crm-sidebar-layout", () => {
    const key = buildBaseViewStorageKey("tasks-list", "tasks");
    expect(key.startsWith("crm-")).toBe(false);
    expect(key.startsWith("base-view:")).toBe(true);
  });
});

describe("serializeFilters", () => {
  test("serializa filtros a JSON string", () => {
    expect(serializeFilters({ search: "fact" })).toBe(
      '{"search":"fact"}',
    );
  });

  test("objeto vacío serializa como {}", () => {
    expect(serializeFilters({})).toBe("{}");
  });
});

describe("parsePersistedFilters", () => {
  test("parsea JSON string válido a objeto", () => {
    expect(parsePersistedFilters('{"search":"fact"}')).toEqual({
      search: "fact",
    });
  });

  test("devuelve {} cuando el JSON es inválido", () => {
    expect(parsePersistedFilters("not json")).toEqual({});
  });

  test("devuelve {} cuando el string es vacío", () => {
    expect(parsePersistedFilters("")).toEqual({});
  });
});
