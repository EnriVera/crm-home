/**
 * Constantes del módulo tasks.
 *
 * - `KANBAN_DEFAULT_STEP`: gap por defecto entre órdenes kanban consecutivos
 *   (1024 ⇒ permite miles de inserciones entre dos tareas antes de rebalancear).
 * - `KANBAN_GAP_REBALANCE_THRESHOLD`: cuando el gap entre dos órdenes consecutivos
 *   cae por debajo de este umbral, el caso de uso `moveTask` dispara un
 *   rebalanceo de la columna entera.
 * - `TASK_TITLE_MAX` / `TASK_DESCRIPTION_MAX`: límites de longitud del payload.
 */
export const KANBAN_DEFAULT_STEP = 1024;
export const KANBAN_GAP_REBALANCE_THRESHOLD = 1e-6;
export const TASK_TITLE_MAX = 200;
export const TASK_DESCRIPTION_MAX = 50_000;
