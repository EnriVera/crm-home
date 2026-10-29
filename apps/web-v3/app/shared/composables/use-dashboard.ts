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
 * useDashboard: lo que muestra el dashboard (PRD-v4 §8.3, MVP de PRD-v2 §8.2).
 *
 * El dashboard es un resumen de lectura: el timer corriendo, las tareas por
 * estado, las últimas tareas, los totales del mes y la actividad reciente.
 * Las derivaciones son puras y viven en el dominio; este composable sólo
 * maneja el estado de carga y error.
 *
 * El timer (corrida activa, elapsed, historial) lo trae `useTimer`: el
 * dashboard usa el MISMO composable que /schedules para que el reloj no
 * pueda quedar desfasado entre pantallas.
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

  /** Un usuario sin tareas ni movimientos no tiene nada que mostrar. */
  const isEmpty = computed(() => totalTasks.value === 0);

  /**
   * El símbolo de la moneda.
   *
   * La API no tiene una "moneda por defecto": `currency` es una tabla global
   * sin flag. Se usa la moneda del último movimiento del usuario y, si no
   * hay movimientos, la primera por id (la sembrada al crear la cuenta).
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
      // El dashboard es un resumen de lectura: un fallo deja el estado
      // vacío en lugar de bloquear la app detrás de una pantalla de error.
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
