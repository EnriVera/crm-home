import {
  TYPE_MODULE_NAMES,
  type TypeModuleName,
  type TypeModules,
} from "@crm/types";

/**
 * Lógica pura del form de `type` (sin DOM, sin imports de UI).
 *
 * Mismo patrón que `income-form.logic.ts`:
 *   - Estado tipado + reducer de acciones.
 *   - Validaciones puras (testables sin octane).
 *   - Helpers de armado del payload para el contract Zod.
 *
 * Multi-módulo: el form ahora soporta N módulos por type. La lista
 * vacía `[]` = "all modules" (semántica invertida del viejo single-module
 * donde un valor era required).
 */

export const TYPE_FORM_MODULES: readonly TypeModuleName[] = TYPE_MODULE_NAMES;

export interface TypeFormState {
  name: string;
  modules: TypeModules;
}

export type TypeFormAction =
  | { type: "set_name"; value: string }
  | { type: "toggle_module"; value: TypeModuleName }
  | { type: "set_modules"; value: TypeModules };

export function initialTypeFormState(
  initial: Partial<TypeFormState> = {},
): TypeFormState {
  return {
    name: initial.name ?? "",
    modules: initial.modules ?? [],
  };
}

export function applyTypeFormAction(
  state: TypeFormState,
  action: TypeFormAction,
): TypeFormState {
  switch (action.type) {
    case "set_name":
      return { ...state, name: action.value };
    case "toggle_module": {
      const has = state.modules.includes(action.value);
      const next = has
        ? state.modules.filter((m) => m !== action.value)
        : [...state.modules, action.value];
      return { ...state, modules: next };
    }
    case "set_modules":
      return { ...state, modules: action.value };
  }
}

export interface TypeFormError {
  field: "name" | "modules";
  message: string;
}

export function firstTypeFormError(
  state: TypeFormState,
): TypeFormError | null {
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
  for (const module of state.modules) {
    if (!TYPE_FORM_MODULES.includes(module)) {
      return { field: "modules", message: `Módulo inválido: ${module}` };
    }
  }
  return null;
}

export function isTypeFormReadyToSubmit(state: TypeFormState): boolean {
  return firstTypeFormError(state) === null;
}

export interface TypeFormPayload {
  type_name: string;
  type_modules: TypeModules;
}

export function typeFormToApiPayload(state: TypeFormState): TypeFormPayload {
  return {
    type_name: state.name.trim(),
    type_modules: [...state.modules].sort() as TypeModules,
  };
}
