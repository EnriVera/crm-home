import { KANBAN_DEFAULT_STEP, KANBAN_GAP_REBALANCE_THRESHOLD } from "./constants";

/**
 * Helpers puros del algoritmo kanban. Sin imports de kysely/h3/nitro, sin
 * repositorios ni reloj. Testeables en aislamiento total.
 *
 * Convenciones:
 * - `order` se trabaja como `number` (en DB es `DOUBLE PRECISION`).
 * - `KANBAN_DEFAULT_STEP = 1024` deja ~1000 inserciones entre dos tareas antes
 *   de que `shouldRebalance` dispare rebalanceo.
 * - `KANBAN_GAP_REBALANCE_THRESHOLD = 1e-6` es el epsilon bajo el cual el gap
 *   entre dos órdenes consecutivas se considera agotado.
 */

/**
 * Calcula el orden para insertar entre dos referencias.
 * Si `prevOrder` o `nextOrder` son `undefined` (insert al inicio o al fin),
 * el caller debe usar `prependOrder` o `appendOrder` respectivamente.
 */
export function computeInsertOrder(prevOrder: number, nextOrder: number): number {
  return (prevOrder + nextOrder) / 2;
}

/**
 * ¿El gap entre dos órdenes consecutivas está agotado?
 * Si sí, el caso de uso debe disparar `rebalanceColumn` antes de persistir.
 */
export function shouldRebalance(gap: number): boolean {
  return Math.abs(gap) < KANBAN_GAP_REBALANCE_THRESHOLD;
}

/**
 * Re-asigna `order` a múltiplos de `KANBAN_DEFAULT_STEP` preservando el orden
 * relativo de la columna. Se invoca cuando el gap está agotado.
 *
 * Importante: el caller debe persistir el resultado vía
 * `taskRepository.persistOrders(rows, trx?)` dentro de la misma unidad de trabajo.
 */
export function rebalanceColumn<R extends { id: string; order: number }>(
  rows: R[],
): Array<R & { order: number }> {
  return rows.map((row, index) => ({
    ...row,
    order: KANBAN_DEFAULT_STEP * (index + 1),
  }));
}

/**
 * Orden para APPEND al final de una columna: `max(order) + step`.
 * Si la columna está vacía, devuelve el primer múltiplo (1024).
 */
export function appendOrder<R extends { order: number }>(rows: R[]): number {
  if (rows.length === 0) return KANBAN_DEFAULT_STEP;
  const max = rows.reduce((acc, r) => Math.max(acc, r.order), 0);
  return max + KANBAN_DEFAULT_STEP;
}

/**
 * Orden para PREPEND al inicio de una columna: `min(order) / 2`.
 * Mantiene siempre un gap positivo entre el nuevo elemento y el primero
 * (gap = min/2 entre el prepend y el primer elemento).
 *
 * Si la columna está vacía, devuelve el primer múltiplo (1024).
 */
export function prependOrder<R extends { order: number }>(rows: R[]): number {
  if (rows.length === 0) return KANBAN_DEFAULT_STEP;
  const min = rows.reduce((acc, r) => Math.min(acc, r.order), Number.POSITIVE_INFINITY);
  return min / 2;
}
