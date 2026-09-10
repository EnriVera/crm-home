/**
 * Lógica pura de la página de detalle (sin DOM, sin imports de UI).
 *
 * Maneja los handlers de Editar / Eliminar y construye los params
 * para `rpc.tasks.get/remove`. La página `.tsrx` los conecta al flujo
 * de UI (botones, navegación, confirmación).
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
 * Decisión de navegación cuando el usuario hace click "Editar":
 * - `?edit=true` query param permite abrir el form lateral sobre la misma
 *   página (mismo URL, sólo cambia el flag).
 * - La page lee `searchParams.get("edit") === "true"` y monta el TaskForm.
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
 * Decide si el form lateral de edición debe estar abierto según los
 * search params de la URL. Devuelve `true` cuando `?edit=true` está
 * presente.
 */
export function isEditModeFromSearchParams(
 searchParams: URLSearchParams,
): boolean {
 return searchParams.get("edit") === "true";
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
