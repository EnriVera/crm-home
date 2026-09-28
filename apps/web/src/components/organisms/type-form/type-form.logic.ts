import type { TypeModule } from "@crm/types";

/**
 * Lógica pura del form de `type` (sin DOM, sin imports de UI).
 *
 * Mismo patrón que `income-form.logic.ts`:
 *   - Estado tipado + reducer de acciones.
 *   - Validaciones puras (testables sin octane).
 *   - Helpers de armado del payload para el contract Zod.
 */

export const TYPE_FORM_MODULES = [
  "tasks",
  "incomes",
  "expenses",
  "schedules",
] as const satisfies readonly TypeModule[];

export interface TypeFormState {
  name: string;
  module: TypeModule;
}

export type TypeFormAction =
  | { type: "set_name"; value: string }
  | { type: "set_module"; value: TypeModule };

export function initialTypeFormState(
  initial: Partial<TypeFormState> = {},
): TypeFormState {
  return {
    name: initial.name ?? "",
    module: initial.module ?? "tasks",
  };
}

export function applyTypeFormAction(
  state: TypeFormState,
  action: TypeFormAction,
): TypeFormState {
  switch (action.type) {
    case "set_name":
      return { ...state, name: action.value };
    case "set_module":
      return { ...state, module: action.value };
  }
}

export interface TypeFormError {
  field: "name" | "module";
  message: string;
}

export function firstTypeFormError(state: TypeFormState): TypeFormError | null {
  const trimmed = state.name.trim();
  if (trimmed.length === 0) {
    return { field: "name", message: "El nombre es obligatorio" };
  }
  if (trimmed.length > 100) {
    return {
      field: "name",
      message: "El nombre no puede superar 100 caracteres",
    };
  }
  if (!TYPE_FORM_MODULES.includes(state.module)) {
    return { field: "module", message: "Módulo inválido" };
  }
  return null;
}

export function isTypeFormReadyToSubmit(state: TypeFormState): boolean {
  return firstTypeFormError(state) === null;
}

export interface TypeFormPayload {
  type_name: string;
  type_module: TypeModule;
}

export function typeFormToApiPayload(state: TypeFormState): TypeFormPayload {
  return {
    type_name: state.name.trim(),
    type_module: state.module,
  };
}
