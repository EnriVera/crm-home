/**
 * Task read/write model — pure TypeScript (PRD-v4 §11.4).
 *
 * The wire format is snake_case (`task_*`); the domain speaks camelCase.
 * The mapping lives in the infrastructure adapter.
 *
 * What the wire carries and what it does not (verified against
 * packages/contract/src/task/contracts.ts):
 * - Tasks reference client/type/category by ID only — no names. The
 *   screens that show names (kanban cards, drawer selects) resolve them
 *   through lookup maps the caller loads separately.
 * - There is no due date and no color on the wire; the catalogue shows
 *   both, so neither renders until the API exposes them.
 */

/** A task (PRD-v2 §8.3). */
export interface Task {
  id: string;
  title: string;
  description: string | null;
  stateId: string;
  typeId: string | null;
  categoryId: string | null;
  clientId: string | null;
  kanbanOrder: number;
  createdAt: Date;
  updatedAt: Date;
}

/** A kanban column (same shape the config context uses). */
export interface TaskColumn {
  id: string;
  name: string;
  order: number;
}

/**
 * The tasks of each column, in board order.
 *
 * Tasks without a matching column (the state was deleted after the task
 * was created) surface under `null` so the caller decides what to do
 * with them instead of dropping them silently.
 */
export function tasksByColumn(
  tasks: Task[],
  columns: TaskColumn[],
): Map<string | null, Task[]> {
  const map = new Map<string | null, Task[]>();
  for (const column of columns) {
    map.set(column.id, []);
  }
  for (const task of tasks) {
    const key = map.has(task.stateId) ? task.stateId : null;
    const list = map.get(key) ?? [];
    list.push(task);
    map.set(key, list);
  }
  for (const list of map.values()) {
    list.sort((a, b) => a.kanbanOrder - b.kanbanOrder || a.id.localeCompare(b.id));
  }
  return map;
}

/**
 * The tasks whose title matches a search term.
 *
 * The wire task has no client/type names, so the search covers the title
 * only — searching "by client or type" needs joined data the API does
 * not return yet.
 */
export function filterTasks(tasks: Task[], search: string): Task[] {
  const needle = search.trim().toLowerCase();
  if (!needle) return tasks;
  return tasks.filter((task) => task.title.toLowerCase().includes(needle));
}

/**
 * The neighbor ids the move endpoint wants for a task that landed at
 * `index` of `column` (the column WITHOUT the moved task, in board
 * order): `prev` is the task above, `next` the one below. Both undefined
 * = append to the end, which is the endpoint's server-side default.
 */
export function moveNeighbors(
  column: Task[],
  index: number,
): { prevTaskId?: string; nextTaskId?: string } {
  const prev = index - 1 >= 0 ? column[index - 1] : undefined;
  const next = index < column.length ? column[index] : undefined;
  return {
    ...(prev ? { prevTaskId: prev.id } : {}),
    ...(next ? { nextTaskId: next.id } : {}),
  };
}

/**
 * The columns in board order.
 */
export function sortColumns(columns: TaskColumn[]): TaskColumn[] {
  return [...columns].sort(
    (a, b) => a.order - b.order || a.name.localeCompare(b.name),
  );
}
