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
 * - The due date is a `timestamptz`: it arrives as a Date and it can
 *   carry a time, not only a day.
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
  /** The due date; null = the task has no deadline. */
  dueDate: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

/** A kanban column (same shape the config context uses). */
export interface TaskColumn {
  id: string;
  name: string;
  order: number;
  /** Data color token of the column (PRD-v4 §8.4); null = none. */
  color: string | null;
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
 * The due-date buckets of a task (PRD-v4 §8.3: la card muestra "vence
 * <fecha>").
 *
 * `overdue` = the deadline already passed; `today` = it is due today;
 * `upcoming` = it falls in the future; `none` = the task has no deadline
 * (and those show nothing, per PRD-v4 §17).
 *
 * The comparison is by DAY, not by instant: a task that is due at 23:00
 * today is still "today" at 22:00.
 */
export type DueBucket = "overdue" | "today" | "upcoming" | "none";

/** How many days ahead count as "this week" in the toolbar filter. */
export const UPCOMING_DAYS = 7;

/** The day of a date, without the time (the local calendar day). */
function dayKey(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

/** The bucket of a due date. */
export function dueBucket(dueDate: Date | null, now: Date = new Date()): DueBucket {
  if (!dueDate) return "none";
  const today = dayKey(now);
  const due = dayKey(dueDate);
  if (due < today) return "overdue";
  if (due === today) return "today";
  return "upcoming";
}

/**
 * Whether the deadline falls inside the next `days` days (the "esta
 * semana" filter of the toolbar).
 */
export function isDueWithinDays(
  dueDate: Date | null,
  days: number = UPCOMING_DAYS,
  now: Date = new Date(),
): boolean {
  if (!dueDate) return false;
  const today = dayKey(now);
  const due = dayKey(dueDate);
  if (due < today) return false;
  const horizon = new Date(now.getFullYear(), now.getMonth(), now.getDate() + days);
  return due <= dayKey(horizon);
}

/** The tasks whose deadline falls in a bucket. */
export function tasksByDueBucket(
  tasks: Task[],
  bucket: DueBucket,
  now: Date = new Date(),
): Task[] {
  if (bucket === "none") {
    return tasks.filter((task) => task.dueDate === null);
  }
  return tasks.filter((task) => dueBucket(task.dueDate, now) === bucket);
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
