import { describe, expect, test } from "bun:test";
import {
  applyTaskFormAction,
  ATTACHMENTS_DISABLED,
  firstValidationError,
  initialTaskFormState,
  isCategoryDisabled,
  type AvailableCategoriesLookup,
} from "./task-form.logic";

const catAvailableFor: AvailableCategoriesLookup = ({ clientId, typeId }) => {
  if (clientId === "client-1" && typeId === "type-1") return ["cat-1", "cat-2"];
  return ["cat-99"];
};

describe("initialTaskFormState", () => {
  test("default vacío", () => {
    const state = initialTaskFormState();
    expect(state.title).toBe("");
    expect(state.description).toBeNull();
    expect(state.clientId).toBeNull();
    expect(state.typeId).toBe("");
    expect(state.categoryId).toBeNull();
    expect(state.stateId).toBe("");
  });

  test("acepta overrides parciales", () => {
    const state = initialTaskFormState({ title: "X", stateId: "state-1" });
    expect(state.title).toBe("X");
    expect(state.stateId).toBe("state-1");
  });
});

describe("applyTaskFormAction — resetCategoryIfIncompatible", () => {
  test("set-client-id resetea categoría si el par (cliente,tipo) cambió", () => {
    const initial = initialTaskFormState({
      clientId: "client-1",
      typeId: "type-1",
      categoryId: "cat-1",
    });
    const next = applyTaskFormAction(
      initial,
      { type: "set-client-id", value: "client-2" },
      catAvailableFor,
    );
    expect(next.categoryId).toBeNull();
  });

  test("set-type-id resetea categoría si el tipo cambió", () => {
    const initial = initialTaskFormState({
      clientId: "client-1",
      typeId: "type-1",
      categoryId: "cat-1",
    });
    const next = applyTaskFormAction(
      initial,
      { type: "set-type-id", value: "type-2" },
      catAvailableFor,
    );
    expect(next.categoryId).toBeNull();
  });

  test("set-client-id PRESERVA categoría si la categoría sigue siendo válida", () => {
    const initial = initialTaskFormState({
      clientId: "client-1",
      typeId: "type-1",
      categoryId: "cat-1",
    });
    const next = applyTaskFormAction(
      initial,
      { type: "set-client-id", value: "client-1" },
      catAvailableFor,
    );
    expect(next.categoryId).toBe("cat-1");
  });

  test("set-category-id setea la nueva categoría explícitamente", () => {
    const initial = initialTaskFormState({
      clientId: "client-1",
      typeId: "type-1",
      categoryId: "cat-1",
    });
    const next = applyTaskFormAction(
      initial,
      { type: "set-category-id", value: "cat-2" },
      catAvailableFor,
    );
    expect(next.categoryId).toBe("cat-2");
  });

  test("set-title solo actualiza title sin tocar otros campos", () => {
    const initial = initialTaskFormState({
      clientId: "client-1",
      typeId: "type-1",
      categoryId: "cat-1",
      title: "old",
    });
    const next = applyTaskFormAction(
      initial,
      { type: "set-title", value: "new" },
      catAvailableFor,
    );
    expect(next.title).toBe("new");
    expect(next.clientId).toBe("client-1");
    expect(next.categoryId).toBe("cat-1");
  });
});

describe("ATTACHMENTS_DISABLED", () => {
  test("siempre true (PRD §13 UX honesto, Fase 2)", () => {
    expect(ATTACHMENTS_DISABLED).toBe(true);
  });
});

describe("isCategoryDisabled", () => {
  test("true cuando typeId es vacío", () => {
    const state = initialTaskFormState({ typeId: "" });
    expect(isCategoryDisabled(state)).toBe(true);
  });

  test("false cuando typeId está seleccionado", () => {
    const state = initialTaskFormState({ typeId: "type-1" });
    expect(isCategoryDisabled(state)).toBe(false);
  });
});

describe("firstValidationError", () => {
  test("devuelve null cuando el form es válido", () => {
    const state = initialTaskFormState({
      title: "Mi tarea",
      description: "Detalle",
      typeId: "type-1",
      stateId: "state-1",
    });
    expect(firstValidationError(state)).toBeNull();
  });

  test("devuelve la primera key i18n de error (title)", () => {
    const state = initialTaskFormState({ title: "" });
    expect(firstValidationError(state)).toBe("tasks.form.titleRequired");
  });

  test("devuelve la primera key i18n de error (description)", () => {
    const state = initialTaskFormState({
      title: "OK",
      description: "x".repeat(50_001),
    });
    expect(firstValidationError(state)).toBe("tasks.form.descriptionTooLong");
  });
});
