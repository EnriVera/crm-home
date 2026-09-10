/**
 * Helpers cliente del módulo tasks (puros, sin DOM).
 *
 * Se usan ANTES del POST a `rpc.tasks.move` — el cliente ordena/valida la
 * intención del usuario y luego delega al backend el orden atómico via
 * transactionManager. Aquí viven las funciones puras que el componente
 * kanban organism invoca mientras el usuario arrastra.
 */

/** Subset mínimo del TaskRow que el kanban organism necesita para ordenar. */
export interface KanbanRow {
 id: string;
 order: number;
}

export function sortByOrder<R extends KanbanRow>(rows: R[]): R[] {
 return [...rows].sort((a, b) => a.order - b.order);
}

/**
 * Mueve una row de `fromId` a la posición `toIndex` y reasigna `order`
 * con gaps de 1024 (mismo KANBAN_DEFAULT_STEP del backend). Si `fromId` no
 * existe, retorna los rows sin mutar.
 */
export function moveItem<R extends KanbanRow>(
 rows: R[],
 fromId: string,
 toIndex: number,
): R[] {
 const fromIndex = rows.findIndex((r) => r.id === fromId);
 if (fromIndex === -1) return rows;
 const next = [...rows];
 const [moved] = next.splice(fromIndex, 1);
 if (!moved) return rows;
 const clampedIndex = Math.max(0, Math.min(toIndex, next.length));
 next.splice(clampedIndex, 0, moved);
 return next.map((row, index) => ({
  ...row,
  order: (index + 1) * 1024,
 }));
}
