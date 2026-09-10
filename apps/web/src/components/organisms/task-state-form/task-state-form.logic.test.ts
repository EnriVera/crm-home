import { describe, expect, test } from "bun:test";
import {
  buildStateSubmitParams,
  initialTaskStateFormState,
  taskStateNameError,
  taskStateOrderError,
  validateTaskStateForm,
  TASK_STATE_NAME_MAX,
} from "./task-state-form.logic";

describe("taskStateNameError", () => {
  test("null cuando el nombre es válido", () => {
    expect(taskStateNameError("Pendiente")).toBeNull();
  });

  test("error cuando el nombre está vacío", () => {
    expect(taskStateNameError("")).toBe("tasks.statuses.nameRequired");
  });

  test("error cuando el nombre es solo espacios", () => {
    expect(taskStateNameError("   ")).toBe("tasks.statuses.nameRequired");
  });

  test("error cuando excede 50 caracteres", () => {
    const tooLong = "x".repeat(TASK_STATE_NAME_MAX + 1);
    expect(taskStateNameError(tooLong)).toBe("tasks.statuses.nameTooLong");
  });

  test("null cuando tiene exactamente 50 caracteres", () => {
    const exact = "x".repeat(TASK_STATE_NAME_MAX);
    expect(taskStateNameError(exact)).toBeNull();
  });
});

describe("taskStateOrderError", () => {
  test("null cuando el orden es entero >= 0", () => {
    expect(taskStateOrderError(0)).toBeNull();
    expect(taskStateOrderError(5)).toBeNull();
  });

  test("error cuando el orden es negativo", () => {
    expect(taskStateOrderError(-1)).toBe("tasks.statuses.orderInvalid");
  });

  test("error cuando el orden no es entero", () => {
    expect(taskStateOrderError(1.5)).toBe("tasks.statuses.orderInvalid");
  });
});

describe("initialTaskStateFormState", () => {
  test("default vacío", () => {
    const state = initialTaskStateFormState();
    expect(state.tast_name).toBe("");
    expect(state.tast_order).toBe(0);
    expect(state.errorKey).toBeNull();
  });

  test("acepta overrides parciales", () => {
    const state = initialTaskStateFormState({
      tast_name: "Pendiente",
      tast_order: 2,
    });
    expect(state.tast_name).toBe("Pendiente");
    expect(state.tast_order).toBe(2);
  });
});

describe("validateTaskStateForm", () => {
  test("devuelve null cuando todo es válido", () => {
    const state = initialTaskStateFormState({ tast_name: "OK", tast_order: 0 });
    expect(validateTaskStateForm(state)).toBeNull();
  });

  test("devuelve la primera key de error (name)", () => {
    const state = initialTaskStateFormState({ tast_name: "", tast_order: 0 });
    expect(validateTaskStateForm(state)).toBe("tasks.statuses.nameRequired");
  });

  test("devuelve la primera key de error (order)", () => {
    const state = initialTaskStateFormState({ tast_name: "OK", tast_order: -1 });
    expect(validateTaskStateForm(state)).toBe("tasks.statuses.orderInvalid");
  });
});

describe("buildStateSubmitParams", () => {
  test("modo create retorna params sin stateId", () => {
    const state = initialTaskStateFormState({ tast_name: "Nuevo", tast_order: 1 });
    const params = buildStateSubmitParams("create", state, null);
    expect(params.stateId).toBeNull();
    expect(params.input).toEqual({ tast_name: "Nuevo", tast_order: 1 });
  });

  test("modo update retorna params con stateId", () => {
    const state = initialTaskStateFormState({ tast_name: "Editado", tast_order: 3 });
    const params = buildStateSubmitParams("update", state, "s-1");
    expect(params.stateId).toBe("s-1");
    expect(params.input).toEqual({ tast_name: "Editado", tast_order: 3 });
  });

  test("modo update sin stateId lanza error", () => {
    const state = initialTaskStateFormState({ tast_name: "OK" });
    expect(() => buildStateSubmitParams("update", state, null)).toThrow();
  });

  test("validación falla lanza error", () => {
    const state = initialTaskStateFormState({ tast_name: "" });
    expect(() => buildStateSubmitParams("create", state, null)).toThrow();
  });

  test("trim() aplicado a tast_name antes del submit", () => {
    const state = initialTaskStateFormState({
      tast_name: "  Con espacios  ",
      tast_order: 0,
    });
    const params = buildStateSubmitParams("create", state, null);
    expect(params.input.tast_name).toBe("Con espacios");
  });
});
