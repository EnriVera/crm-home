/**
 * Dashboard read model — pure TypeScript (PRD-v4 §11.4).
 *
 * The wire format is snake_case; the domain speaks camelCase. The mapping
 * lives in the infrastructure adapter, so nothing here knows about orpc.
 *
 * This file holds the value objects the dashboard reads and the pure
 * functions that derive them. No Vue, Nuxt, orpc or TanStack imports.
 */

/** A task column (PRD-v2 §11 `task_state`). */
export interface TaskState {
  id: string;
  name: string;
  order: number;
}

/** A task, reduced to what the dashboard shows. */
export interface TaskSummary {
  id: string;
  title: string;
  stateId: string;
  updatedAt: Date;
  /** The links the dashboard row shows (client · type). */
  clientId: string | null;
  typeId: string | null;
  categoryId: string | null;
}

/** How many tasks sit in one column. */
export interface StateTally {
  state: TaskState;
  count: number;
}

/** Everything the dashboard renders, already derived. */
export interface DashboardSnapshot {
  /** One entry per column, ordered by the column order. */
  tallies: StateTally[];
  /** The five most recently updated tasks, newest first. */
  recentTasks: TaskSummary[];
  /** Total number of tasks across all columns. */
  totalTasks: number;
}

/** How many tasks the "latest tasks" card shows (PRD-v2 §8.2). */
export const RECENT_TASKS_LIMIT = 5;

/**
 * Counts the tasks per column and picks the most recently updated ones.
 *
 * Both are pure derivations of what the API returned: no data is invented,
 * so a user with no tasks gets a snapshot with zero tallies and no recent
 * tasks (the empty state, PRD-v2 §8.2).
 */
export function buildDashboardSnapshot(
  tasks: TaskSummary[],
  states: TaskState[],
): DashboardSnapshot {
  const counts = new Map<string, number>();
  for (const task of tasks) {
    counts.set(task.stateId, (counts.get(task.stateId) ?? 0) + 1);
  }

  const tallies = [...states]
    .sort((a, b) => a.order - b.order)
    .map((state) => ({ state, count: counts.get(state.id) ?? 0 }));

  const recentTasks = [...tasks]
    .sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime())
    .slice(0, RECENT_TASKS_LIMIT);

  return { tallies, recentTasks, totalTasks: tasks.length };
}

/** The name of the column a task belongs to, for the "recent tasks" rows. */
export function stateNameOf(
  states: TaskState[],
  stateId: string,
): string | undefined {
  return states.find((state) => state.id === stateId)?.name;
}
