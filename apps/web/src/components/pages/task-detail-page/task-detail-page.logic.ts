/**
 * Lógica pura de la página de detalle (sin DOM, sin imports de UI).
 *
 * Maneja los handlers de Editar / Eliminar y construye los params
 * para `rpc.tasks.get/remove`. La página `.tsrx` los conecta al flujo
 * de UI (botones, navegación, confirmación).
 *
 * Nota sobre `?edit=true`: la URL canónica del edit drawer se construye
 * con `editUrl(taskId)`. La lectura del flag vive en el componente
 * `.tsrx` a través de `useQueryState("edit", parseAsBoolean.withDefault(false))`
 * de `@octanejs/nuqs` — la lógica pura del helper original
 * (`isEditModeFromSearchParams`) se reemplazó por el hook tipado. Mantener
 * un helper que duplica el parser sólo agrega drift entre el tipo del URL
 * state y la firma del helper.
 */

export interface DeleteTaskParams {
 taskId: string;
 userId: string;
}

export interface DeleteConfirmationState {
 visible: boolean;
 taskId: string | null;
}

/**
 * URL canónica del edit drawer de un task.
 *
 * Ejemplo: `editUrl("t-42")` → `"/tasks/t-42?edit=true"`. Consumida por
 * el botón "Editar" en `tasks-page` para deep-link al form de edición.
 * La page destino lee el flag con `useQueryState("edit", ...)`.
 */
export function editUrl(taskId: string): string {
 return `/tasks/${taskId}?edit=true`;
}

/** URL de retorno tras Eliminar exitosamente. */
export const TASKS_LIST_PATH = "/tasks";

/**
 * Estado inicial del diálogo de confirmación. `visible = false` por default;
 * `open(taskId)` lo cambia a `visible = true` con el taskId.
 */
export function initialDeleteConfirmationState(): DeleteConfirmationState {
 return { visible: false, taskId: null };
}

export function openDeleteConfirmation(
 taskId: string,
): DeleteConfirmationState {
 return { visible: true, taskId };
}

export function closeDeleteConfirmation(): DeleteConfirmationState {
 return { visible: false, taskId: null };
}

/**
 * Construye los params para `rpc.tasks.remove` validando ownership.
 * El handler de la page llama esto antes de invocar el RPC.
 */
export function buildRemoveParams(
 taskId: string,
 userId: string,
): DeleteTaskParams {
 if (!taskId || !userId) {
  throw new Error("taskId y userId son requeridos");
 }
 return { taskId, userId };
}
