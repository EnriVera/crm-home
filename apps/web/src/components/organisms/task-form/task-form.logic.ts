/**
 * Lógica pura del form de tasks (sin DOM, sin imports de UI).
 *
 * Maneja el state machine del form: cambios en `clie_id` o `type_id` resetean
 * `cate_id` si la categoría previa no aplica al nuevo par; valida que los
 * adjuntos están siempre disabled (PRD §13 UX honesto — Fase 2); valida que
 * el campo Categoría está disabled mientras `type_id` sea null.
 *
 * Esta lógica es testeable sin DOM. El componente `.tsrx` la consume vía
 * `useTaskFormState()` que devuelve un reducer puro.
 */

import {
  resetCategoryIfIncompatible,
  type TaskFormInput,
} from "../../../lib/tasks/tasks-form";
import {
  taskTitleRequired,
  taskDescriptionLength,
} from "../../../lib/validation/task";

export interface TaskFormState extends TaskFormInput {}

export type TaskFormAction =
  | { type: "set-title"; value: string }
  | { type: "set-description"; value: string | null }
  | { type: "set-client-id"; value: string | null }
  | { type: "set-type-id"; value: string }
  | { type: "set-category-id"; value: string | null }
  | { type: "set-state-id"; value: string };

/**
 * Categorías válidas para un par (cliente, tipo). El componente UI provee
 * este callable vía el adapter de lookups. En los tests lo mockeamos.
 */
export type AvailableCategoriesLookup = (params: {
  clientId: string | null;
  typeId: string;
}) => string[];

export function applyTaskFormAction(
  state: TaskFormState,
  action: TaskFormAction,
  availableCategoriesFor: AvailableCategoriesLookup,
): TaskFormState {
  switch (action.type) {
    case "set-title":
      return { ...state, title: action.value };
    case "set-description":
      return { ...state, description: action.value };
    case "set-client-id":
      return resetCategoryIfIncompatible(
        state,
        action.value,
        state.typeId,
        availableCategoriesFor,
      );
    case "set-type-id":
      return resetCategoryIfIncompatible(
        state,
        state.clientId,
        action.value,
        availableCategoriesFor,
      );
    case "set-category-id":
      return { ...state, categoryId: action.value };
    case "set-state-id":
      return { ...state, stateId: action.value };
  }
}

/** Estado inicial del form. */
export function initialTaskFormState(
  input: Partial<TaskFormInput> = {},
): TaskFormState {
  return {
    title: "",
    description: null,
    clientId: null,
    typeId: "",
    categoryId: null,
    stateId: "",
    ...input,
  };
}

/** Adjuntos siempre disabled en MVP (PRD §13 — UX honesto, Fase 2). */
export const ATTACHMENTS_DISABLED = true;

/** Categoría disabled mientras typeId sea vacío/null. */
export function isCategoryDisabled(state: TaskFormState): boolean {
  return state.typeId === "" || state.typeId === null;
}

/** Mensaje de validación agregado para el form (retorna la primera key i18n con error, o null). */
export function firstValidationError(state: TaskFormState): string | null {
  return (
    taskTitleRequired(state.title) ?? taskDescriptionLength(state.description)
  );
}
