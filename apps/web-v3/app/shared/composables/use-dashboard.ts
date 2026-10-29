import { computed, ref } from "vue";
import {
  buildDashboardSnapshot,
  type DashboardSnapshot,
  type StateTally,
  type TaskState,
  type TaskSummary,
} from "~/domain/task/dashboard";
import {
  formatMoney,
  monthMovements,
  sumAmount,
} from "~/domain/dashboard/summary";
import { listTaskStates, listTasks } from "~/infrastructure/tasks/orpc-tasks";
import { listClients } from "~/infrastructure/client/orpc-client";
import {
  listExpenses,
  listIncomes,
  type Movement,
} from "~/infrastructure/finance/orpc-finance";
import { listCurrencies } from "~/infrastructure/config/orpc-config";
import {
  listAllCategories,
  listTaskTypes,
} from "~/infrastructure/task/orpc-task";

/**
 * useDashboard: what the dashboard shows (PRD-v4 §8.3, PRD-v2 §8.2 MVP).
 *
 * The dashboard is a read-only summary: the running timer, the tasks by
 * state, the latest tasks, the monthly totals and the recent activity.
 * The derivations are pure and live in the domain; this composable only
 * handles the loading and error state.
 *
 * The timer (active run, elapsed, history) comes from `useTimer`: the
 * dashboard uses the SAME composable as /schedules so the clock cannot get
 * out of sync between screens.
 */
export function useDashboard() {
  const tasks = ref<TaskSummary[]>([]);
  const states = ref<TaskState[]>([]);
  const clients = ref<{ id: string; name: string }[]>([]);
  const incomes = ref<Movement[]>([]);
  const expenses = ref<Movement[]>([]);
  const currencies = ref<{ id: string; symbol: string }[]>([]);
  const types = ref<{ id: string; name: string }[]>([]);
  const categories = ref<{ id: string; name: string }[]>([]);
  const isLoading = ref(false);
  const error = ref<string | null>(null);

  const snapshot = computed<DashboardSnapshot>(() =>
    buildDashboardSnapshot(tasks.value, states.value),
  );

  const tallies = computed<StateTally[]>(() => snapshot.value.tallies);
  const recentTasks = computed<TaskSummary[]>(() => snapshot.value.recentTasks);
  const totalTasks = computed(() => snapshot.value.totalTasks);

  /** A user with no tasks and no movements has nothing to show. */
  const isEmpty = computed(() => totalTasks.value === 0);

  /**
   * The currency symbol.
   *
   * The API has no "default currency": `currency` is a global table without
   * a flag. The currency of the user's latest movement is used and, when
   * there are no movements, the first one by id (the one seeded when the
   * account was created).
   */
  const currencySymbol = computed(() => {
    const latest = [...incomes.value, ...expenses.value].sort((a, b) =>
      b.date.localeCompare(a.date),
    )[0];
    const byId = [...currencies.value].sort((a, b) => a.id.localeCompare(b.id));
    if (latest) {
      const symbol = currencies.value.find(
        (currency) => currency.id === latest.currencyId,
      )?.symbol;
      if (symbol) return symbol;
    }
    return byId[0]?.symbol ?? "$";
  });

  const monthIncome = computed(() =>
    sumAmount(monthMovements(incomes.value)),
  );
  const monthExpense = computed(() =>
    sumAmount(monthMovements(expenses.value)),
  );

  async function load() {
    isLoading.value = true;
    error.value = null;
    try {
      const [
        loadedTasks,
        loadedStates,
        loadedClients,
        loadedIncomes,
        loadedExpenses,
        loadedCurrencies,
        loadedTypes,
        loadedCategories,
      ] = await Promise.all([
        listTasks(),
        listTaskStates(),
        listClients(),
        listIncomes(),
        listExpenses(),
        listCurrencies(),
        listTaskTypes(),
        listAllCategories(),
      ]);
      tasks.value = loadedTasks;
      states.value = loadedStates;
      clients.value = loadedClients;
      incomes.value = loadedIncomes;
      expenses.value = loadedExpenses;
      currencies.value = loadedCurrencies;
      types.value = loadedTypes;
      categories.value = loadedCategories;
    } catch {
      // The dashboard is a read-only summary: a failure leaves the state
      // empty instead of blocking the app behind an error screen.
      error.value = "dashboard.loadError";
    } finally {
      isLoading.value = false;
    }
  }

  return {
    tasks,
    states,
    clients,
    types,
    categories,
    tallies,
    recentTasks,
    totalTasks,
    isEmpty,
    currencySymbol,
    monthIncome,
    monthExpense,
    isLoading,
    error,
    load,
    formatMoney,
  };
}
