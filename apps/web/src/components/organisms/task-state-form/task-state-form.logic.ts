/**
 * Lógica pura del form de task-state (sin DOM, sin imports de UI).
 *
 * Maneja validación de inputs (tast_name 1..50, tast_order int >= 0) y
 * construye los params para `rpc.tasks.states.create/update`. El componente
 * .tsrx lo consume vía `useTaskStateFormState()` (no testeable).
 *
 * Regla §D6 del design: NO color picker en MVP — el color del estado
 * se autogenera del lado del cliente (placeholder neutral) o queda
 * para Fase 2 con `@octanejs/colorful`.
 */

export type TaskStateFormMode = "create" | "update";

export interface TaskStateFormInput {
 tast_name: string;
 tast_order: number;
}

export const TASK_STATE_NAME_MAX = 50;
export const TASK_STATE_NAME_MIN = 1;
export const TASK_STATE_ORDER_MIN = 0;

export function taskStateNameError(value: string): string | null {
 const trimmed = value.trim();
 if (trimmed.length < TASK_STATE_NAME_MIN) return "tasks.statuses.nameRequired";
 if (trimmed.length > TASK_STATE_NAME_MAX) return "tasks.statuses.nameTooLong";
 return null;
}

export function taskStateOrderError(value: number): string | null {
 if (!Number.isInteger(value)) return "tasks.statuses.orderInvalid";
 if (value < TASK_STATE_ORDER_MIN) return "tasks.statuses.orderInvalid";
 return null;
}

// Re-exporte silencioso de las constantes MIN/MAX para uso externo
// (e.g. consumidores del form que quieran los mismos bounds en UI).
void TASK_STATE_NAME_MIN;
void TASK_STATE_ORDER_MIN;

/**
 * Estado del form: incluye un campo `errorKey` opcional para mostrar
 * el primer error de validación. La .tsrx lo bindea al display.
 */
export interface TaskStateFormState extends TaskStateFormInput {
 errorKey: string | null;
}

export function initialTaskStateFormState(
 initial: Partial<TaskStateFormInput> = {},
): TaskStateFormState {
 return {
  tast_name: "",
  tast_order: 0,
  errorKey: null,
  ...initial,
 };
}

/**
 * Valida el form completo y retorna la primera key i18n con error, o null.
 */
export function validateTaskStateForm(
 state: TaskStateFormState,
): string | null {
 return (
  taskStateNameError(state.tast_name) ?? taskStateOrderError(state.tast_order)
 );
}

/**
 * Construye los params para `rpc.tasks.states.create` o `.update`.
 * El caller provee `mode` para decidir qué RPC invocar.
 */
export function buildStateSubmitParams(
 mode: TaskStateFormMode,
 state: TaskStateFormState,
 existingStateId: string | null,
): {
 stateId: string | null;
 input: { tast_name: string; tast_order: number };
} {
 if (mode === "update" && !existingStateId) {
  throw new Error("existingStateId requerido para modo update");
 }
 const validationError = validateTaskStateForm(state);
 if (validationError) {
  throw new Error(`Validación falló: ${validationError}`);
 }
 return {
  stateId: existingStateId,
  input: {
   tast_name: state.tast_name.trim(),
   tast_order: state.tast_order,
  },
 };
}
