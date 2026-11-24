import { computed, ref } from "vue";
import {
  buildDashboardSnapshot,
  type DashboardSnapshot,
  type StateTally,
  type TaskState,
  type TaskSummary,
} from "~/domain/task/dashboard";
import {
  totalsByCurrency,
  totalsForMonth,
  type CurrencyTotal,
} from "~/domain/dashboard/summary";
import {
  buildFinanceSeries,
  chartWindow,
  type FinanceSeries,
} from "~/domain/dashboard/finance-chart";
import type { Currency } from "~/domain/config/entities";
import { formatMoney, type MoneyRecord } from "~/domain/finance/entities";
import { listTaskStates, listTasks } from "~/infrastructure/tasks/orpc-tasks";
import { listClients } from "~/infrastructure/client/orpc-client";
import {
  listExpensesInWindow,
  listIncomesInWindow,
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
  // El dashboard sólo necesita monto, fecha, categoría y concepto: el
  // adapter devuelve las entidades completas y acá se toman esos campos.
  const incomes = ref<MoneyRecord[]>([]);
  const expenses = ref<MoneyRecord[]>([]);
  const currencies = ref<Currency[]>([]);
  const types = ref<{ id: string; name: string }[]>([]);
  const categories = ref<{ id: string; name: string; color: string | null }[]>([]);
  const isLoading = ref(false);
  const error = ref<string | null>(null);

  const snapshot = computed<DashboardSnapshot>(() =>
    buildDashboardSnapshot(tasks.value, states.value),
  );

  const tallies = computed<StateTally[]>(() => snapshot.value.tallies);
  const recentTasks = computed<TaskSummary[]>(() => snapshot.value.recentTasks);
  const totalTasks = computed(() => snapshot.value.totalTasks);

  /**
   * El color de dato de cada categoría (PRD-v4 §8.3: el chip de categoría
   * lleva su color). El dashboard carga las categorías, así que el chip
   * no necesita un pedido extra.
   */
  const categoryColorById = computed(() => {
    const map = new Map<string, string | null>();
    for (const category of categories.value) {
      map.set(category.id, category.color);
    }
    return map;
  });

  /** A user with no tasks and no movements has nothing to show. */
  const isEmpty = computed(() => totalTasks.value === 0);

  /**
   * The month totals, one figure per currency.
   *
   * Two currencies are never added together: each one keeps its own
   * symbol, and a user with no movements has no figure at all (there is
   * no total to show, and no currency to label it with).
   *
   * The movements loaded cover several months (the chart needs them), so
   * the totals filter by the month the movement belongs to: the cards
   * show the CURRENT month, not the whole period.
   */
  const currentMonthKey = computed(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  });
  const incomeTotals = computed<CurrencyTotal[]>(() =>
    totalsForMonth(incomes.value, currentMonthKey.value, currencies.value),
  );
  const expenseTotals = computed<CurrencyTotal[]>(() =>
    totalsForMonth(expenses.value, currentMonthKey.value, currencies.value),
  );

  /**
   * The series of the "ingresos vs gastos" chart (PRD-v2 §8.2, Fase 2).
   *
   * One series per currency: two currencies are never added together, so
   * the chart has one axis per money and the screen picks which one it
   * shows.
   */
  const financeSeries = computed<FinanceSeries[]>(() =>
    buildFinanceSeries(incomes.value, expenses.value, currencies.value),
  );

  async function load() {
    isLoading.value = true;
    error.value = null;
    try {
      // The chart needs the last months; the money cards filter the
      // current one out of the same movements.
      const window = chartWindow();
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
        listIncomesInWindow(window),
        listExpensesInWindow(window),
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
    categoryColorById,
    tallies,
    recentTasks,
    totalTasks,
    isEmpty,
    incomeTotals,
    expenseTotals,
    financeSeries,
    isLoading,
    error,
    load,
    formatMoney,
  };
}
