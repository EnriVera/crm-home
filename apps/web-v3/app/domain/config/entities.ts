/**
 * Config read/write model — pure TypeScript (PRD-v4 §11.4).
 *
 * The wire format is snake_case; the domain speaks camelCase. The mapping
 * lives in the infrastructure adapter, so nothing here knows about orpc.
 *
 * This file holds the value objects `/config` reads and writes, plus the pure
 * helpers that derive what the screen shows. No Vue, Nuxt, orpc or TanStack
 * imports.
 */

/** The modules a type can belong to (`types.type_modules`). */
export const TYPE_MODULES = [
  "tasks",
  "incomes",
  "expenses",
  "schedules",
] as const;

export type TypeModule = (typeof TYPE_MODULES)[number];

/** A task type (PRD-v2 §8.7, tab `tipos`). */
export interface TaskType {
  id: string;
  name: string;
  modules: TypeModule[];
  createdAt: Date;
}

/** A task state — the kanban column (PRD-v2 §8.7, tab `estados`). */
export interface TaskState {
  id: string;
  name: string;
  order: number;
}

/**
 * A category of a task type (PRD-v2 §8.7, tab `categorías`).
 *
 * A category always belongs to a type (`categories.cate_type_id` NOT NULL):
 * the type is its grouping, not an optional tag.
 */
export interface Category {
  id: string;
  name: string;
  typeId: string;
  createdAt: Date;
}

/** An application module (global, read-only in the MVP). */
export interface AppModule {
  id: string;
  name: string;
}

/** A currency (global, read-only in the MVP). */
export interface Currency {
  id: string;
  name: string;
  symbol: string;
  decimals: number;
}

/** The theme the user picked (PRD-v2 §8.7, tab `apariencia`). */
export type ThemePreference = "light" | "dark" | "system";

/** The three theme cards of the Apariencia section, in display order. */
export const THEME_PREFERENCES: ThemePreference[] = ["light", "dark", "system"];

/**
 * The type of a task, given its id.
 *
 * The API does not expose a per-type task count, so the count comes from the
 * task list the app already loads (the dashboard reads the same data).
 */
export function taskCountByType(
  tasks: { typeId: string }[],
): Map<string, number> {
  const counts = new Map<string, number>();
  for (const task of tasks) {
    counts.set(task.typeId, (counts.get(task.typeId) ?? 0) + 1);
  }
  return counts;
}

/**
 * The types that match a search term.
 *
 * The API can filter server-side, but the screen keeps the full list loaded and
 * filters locally: the search box is instant and the list is small.
 */
export function filterTypes(
  types: TaskType[],
  search: string,
): TaskType[] {
  const needle = search.trim().toLowerCase();
  if (!needle) return types;
  return types.filter((type) => type.name.toLowerCase().includes(needle));
}

/**
 * The categories that match a search term.
 *
 * Local filter for the same reason as `filterTypes`: the list is small and
 * the search box is instant.
 */
export function filterCategories(
  categories: Category[],
  search: string,
): Category[] {
  const needle = search.trim().toLowerCase();
  if (!needle) return categories;
  return categories.filter((category) =>
    category.name.toLowerCase().includes(needle),
  );
}

/** The states whose name matches a search term. */
export function filterStates(
  states: TaskState[],
  search: string,
): TaskState[] {
  const needle = search.trim().toLowerCase();
  if (!needle) return states;
  return states.filter((state) => state.name.toLowerCase().includes(needle));
}

/** The currencies whose name or symbol matches a search term. */
export function filterCurrencies(
  currencies: Currency[],
  search: string,
): Currency[] {
  const needle = search.trim().toLowerCase();
  if (!needle) return currencies;
  return currencies.filter(
    (currency) =>
      currency.name.toLowerCase().includes(needle) ||
      currency.symbol.toLowerCase().includes(needle),
  );
}

/**
 * The name of the type a category belongs to, for display.
 *
 * Returns null when the type is not loaded (the categories tab loads both,
 * so this only happens mid-flight).
 */
export function categoryTypeName(
  category: Category,
  types: TaskType[],
): string | null {
  return types.find((type) => type.id === category.typeId)?.name ?? null;
}

/**
 * The states in the order they should be shown: by their order column, and
 * then by name, so two states with the same order keep a stable order.
 */
export function sortStates(states: TaskState[]): TaskState[] {
  return [...states].sort((a, b) => a.order - b.order || a.name.localeCompare(b.name));
}

/**
 * The order values that put the states back in the given sequence.
 *
 * The API requires a reorder to cover EVERY state of the user (a partial
 * reorder is rejected), so a move has to send the whole list back.
 */
export function reorderStates(
  states: TaskState[],
  movedId: string,
  targetIndex: number,
): { tast_id: string; tast_order: number }[] {
  const ordered = sortStates(states);
  const from = ordered.findIndex((state) => state.id === movedId);
  if (from === -1) {
    return ordered.map((state, index) => ({
      tast_id: state.id,
      tast_order: index + 1,
    }));
  }

  const [moved] = ordered.splice(from, 1);
  ordered.splice(Math.max(0, Math.min(targetIndex, ordered.length)), 0, moved!);

  return ordered.map((state, index) => ({
    tast_id: state.id,
    tast_order: index + 1,
  }));
}
