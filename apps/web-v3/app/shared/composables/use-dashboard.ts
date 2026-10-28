import { computed, ref } from "vue";
import {
  buildDashboardSnapshot,
  type DashboardSnapshot,
  type StateTally,
  type TaskState,
  type TaskSummary,
} from "~/domain/task/dashboard";
import { listTaskStates, listTasks } from "~/infrastructure/tasks/orpc-tasks";

/**
 * useDashboard: reads the tasks of the authenticated user and derives what the
 * dashboard shows (PRD-v4 §8.3, MVP per PRD-v2 §8.2).
 *
 * The derivation itself is pure and lives in the domain; this composable only
 * owns the loading and error state around it.
 */
export function useDashboard() {
  const tasks = ref<TaskSummary[]>([]);
  const states = ref<TaskState[]>([]);
  const isLoading = ref(false);
  const error = ref<string | null>(null);

  const snapshot = computed<DashboardSnapshot>(() =>
    buildDashboardSnapshot(tasks.value, states.value),
  );

  const tallies = computed<StateTally[]>(() => snapshot.value.tallies);
  const recentTasks = computed<TaskSummary[]>(() => snapshot.value.recentTasks);
  const totalTasks = computed(() => snapshot.value.totalTasks);

  /** A user with no tasks has nothing to show; the view renders the CTAs. */
  const isEmpty = computed(() => totalTasks.value === 0);

  async function load() {
    isLoading.value = true;
    error.value = null;
    try {
      const [loadedTasks, loadedStates] = await Promise.all([
        listTasks(),
        listTaskStates(),
      ]);
      tasks.value = loadedTasks;
      states.value = loadedStates;
    } catch {
      // The dashboard is a read-only summary: a failure leaves the empty state
      // in place instead of blocking the whole app behind an error screen.
      error.value = "dashboard.loadError";
    } finally {
      isLoading.value = false;
    }
  }

  return {
    tasks,
    states,
    tallies,
    recentTasks,
    totalTasks,
    isEmpty,
    isLoading,
    error,
    load,
  };
}
