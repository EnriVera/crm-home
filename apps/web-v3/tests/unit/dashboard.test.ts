import { cleanup, render, screen, waitFor } from "@testing-library/vue";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ref } from "vue";
import DashboardView from "~/ui/views/dashboard.vue";

const { dashboardState, loadMock, timerState, stopMock } = await vi.hoisted(
  async () => {
    // Dynamic import on purpose: vi.hoisted runs before the module imports are
    // evaluated, so a static `import { ref } from "vue"` would not be available
    // yet. Same pattern as tests/unit/login.test.ts.
    const { ref } = await import("vue");
    return {
      dashboardState: {
        states: ref([]),
        tallies: ref([]),
        recentTasks: ref([]),
        totalTasks: ref(0),
        clients: ref([]),
        types: ref([]),
        categories: ref([]),
        currentTimer: ref(null),
        isEmpty: ref(true),
        isLoading: ref(false),
        error: ref(null),
        currencySymbol: ref("$"),
        monthIncome: ref(0),
        monthExpense: ref(0),
        weekSeconds: ref(0),
        activity: ref([]),
      },
      loadMock: vi.fn(),
      timerState: {
        elapsedSeconds: ref(0),
        history: ref([]),
        syncMock: vi.fn(),
      },
      stopMock: vi.fn(),
    };
  },
);

vi.mock("~/shared/composables/use-dashboard", () => ({
  useDashboard: () => ({
    ...dashboardState,
    load: loadMock,
    formatMoney: (amount: number, symbol: string) => `${symbol} ${amount}`,
  }),
}));

vi.mock("~/shared/composables/use-timer", () => ({
  useTimer: () => ({
    run: dashboardState.currentTimer,
    history: timerState.history,
    elapsedSeconds: timerState.elapsedSeconds,
    weekSeconds: dashboardState.weekSeconds,
    sync: timerState.syncMock,
    stop: stopMock,
  }),
}));

const MESSAGES: Record<string, string> = {
  "dashboard.title": "Dashboard",
  "dashboard.subtitle": "Resumen de tu actividad al {date}",
  "dashboard.newTask": "+ Nueva tarea",
  "dashboard.timerTitle": "Timer activo",
  "dashboard.timerIdle": "No hay ningún timer corriendo.",
  "dashboard.timerCta": "Iniciá tu primer timer",
  "dashboard.stats.income": "Ingresos del mes",
  "dashboard.stats.incomeHint": "Movimientos de este mes",
  "dashboard.stats.expense": "Gastos del mes",
  "dashboard.stats.expenseHint": "Movimientos de este mes",
  "dashboard.stats.activeTasks": "Tareas activas",
  "dashboard.stats.tasksHint": "Tareas en total",
  "dashboard.stats.clients": "Clientes",
  "dashboard.stats.hoursHint": "{time} registradas esta semana",
  "dashboard.upcomingTitle": "Próximas tareas",
  "dashboard.activityTitle": "Actividad reciente",
  "dashboard.activityEmpty": "Todavía no hay actividad.",
  "dashboard.activityTimer": "Registraste un timer de {title}",
  "dashboard.statesTitle": "Tareas por estado",
  "dashboard.totalTasks": "{count} tareas en total",
  "dashboard.recentTitle": "Últimas tareas",
  "dashboard.recentEmpty": "Todavía no hay tareas.",
  "dashboard.updatedAt": "Actualizada {date}",
  "dashboard.emptyTitle": "Empezá por acá",
  "dashboard.emptyCreateTask": "Creá tu primera tarea",
  "dashboard.emptyStartTimer": "Iniciá tu primer timer",
  "dashboard.loadError": "No pudimos cargar tus tareas.",
  "dashboard.viewAll": "Ver todas",
  "schedules.stop": "Parar el timer",
  "schedules.start": "Empezar a contar",
  "schedules.startPlaceholder": "¿Qué estás haciendo?",
  "common.loading": "Cargando…",
};

vi.stubGlobal("useI18n", () => ({
  locale: ref("es"),
  t: (key: string, params?: Record<string, unknown>) => {
    const message = MESSAGES[key] ?? key;
    if (!params) return message;
    return Object.entries(params).reduce(
      (acc, [name, value]) => acc.replace(`{${name}}`, String(value)),
      message,
    );
  },
}));

/**
 * NuxtLink is a Nuxt component: outside the app there is no router, so the
 * test stubs it with a plain anchor that keeps its slot and its `to`.
 */
function renderDashboard() {
  return render(DashboardView, {
    global: {
      stubs: {
        NuxtLink: {
          props: ["to"],
          template: '<a :href="to"><slot /></a>',
        },
      },
    },
  });
}

describe("dashboard view", () => {
  afterEach(cleanup);

  beforeEach(() => {
    loadMock.mockReset();
    stopMock.mockReset();
    dashboardState.states.value = [];
    dashboardState.tallies.value = [];
    dashboardState.recentTasks.value = [];
    dashboardState.totalTasks.value = 0;
    dashboardState.clients.value = [];
    dashboardState.types.value = [];
    dashboardState.categories.value = [];
    dashboardState.currentTimer.value = null;
    dashboardState.isEmpty.value = true;
    dashboardState.isLoading.value = false;
    dashboardState.error.value = null;
    dashboardState.currencySymbol.value = "$";
    dashboardState.monthIncome.value = 0;
    dashboardState.monthExpense.value = 0;
    dashboardState.weekSeconds.value = 0;
    dashboardState.activity.value = [];
    timerState.elapsedSeconds.value = 0;
    timerState.history.value = [];
    timerState.syncMock.mockReset();
  });

  it("loads the tasks when it mounts", async () => {
    renderDashboard();

    await waitFor(() => expect(loadMock).toHaveBeenCalledTimes(1));
  });

  it("shows one card per task column with its count", async () => {
    dashboardState.tallies.value = [
      { state: { id: "s1", name: "Pendiente", order: 1 }, count: 2 },
      { state: { id: "s2", name: "En progreso", order: 2 }, count: 0 },
    ];
    dashboardState.totalTasks.value = 2;
    dashboardState.isEmpty.value = false;

    renderDashboard();

    const tallies = screen.getByTestId("dashboard-tallies");
    expect(tallies.textContent).toContain("Pendiente");
    expect(tallies.textContent).toContain("En progreso");
    expect(tallies.textContent).toContain("2");
  });

  it("shows the money and count cards with real numbers", async () => {
    dashboardState.monthIncome.value = 1840000;
    dashboardState.monthExpense.value = 486000;
    dashboardState.totalTasks.value = 12;
    dashboardState.clients.value = [
      { id: "c1", name: "Acme Studio" },
      { id: "c2", name: "Norte Digital" },
    ];
    dashboardState.isEmpty.value = false;

    renderDashboard();

    const stats = screen.getByTestId("dashboard-stats");
    expect(stats.textContent).toContain("$ 1840000");
    expect(stats.textContent).toContain("$ 486000");
    expect(stats.textContent).toContain("12");
    expect(stats.textContent).toContain("2");
  });

  it("does NOT render the timer card when there is no running timer", async () => {
    renderDashboard();

    await waitFor(() => expect(loadMock).toHaveBeenCalled());
    expect(screen.queryByTestId("dashboard-timer")).toBeNull();
  });

  it("renders the running timer with its live elapsed time", async () => {
    dashboardState.currentTimer.value = {
      id: "timer-1",
      title: "Diseño de logo",
      taskId: null,
      clientId: null,
      typeId: "t1",
      categoryId: null,
      start: new Date(),
      end: null,
      durationSeconds: null,
      origin: "manual",
      lastHeartbeat: null,
    };
    dashboardState.types.value = [{ id: "t1", name: "Diseño" }];
    timerState.elapsedSeconds.value = 3600;
    dashboardState.isEmpty.value = false;

    renderDashboard();

    const timer = await screen.findByTestId("dashboard-timer");
    expect(timer.textContent).toContain("Diseño de logo");
    expect(timer.textContent).toContain("Diseño");
    expect(timer.textContent).toContain("01:00:00");
  });

  it("lists the activity of the timer runs", async () => {
    timerState.history.value = [
      {
        id: "run-1",
        title: "Auditoría web",
        taskId: null,
        clientId: null,
        typeId: null,
        categoryId: null,
        start: new Date("2026-06-28T10:00:00"),
        end: new Date("2026-06-28T11:00:00"),
        durationSeconds: 3600,
        origin: "manual",
        lastHeartbeat: null,
      },
    ];
    dashboardState.isEmpty.value = false;

    renderDashboard();

    const activity = screen.getByTestId("dashboard-activity");
    expect(activity.textContent).toContain("Auditoría web");
  });

  it("offers the two calls to action when the user has no tasks", async () => {
    renderDashboard();

    const empty = screen.getByTestId("dashboard-empty");
    expect(empty.textContent).toContain("Creá tu primera tarea");
    expect(empty.textContent).toContain("Iniciá tu primer timer");
  });

  it("shows the load failure inline instead of an empty screen", async () => {
    dashboardState.error.value = "dashboard.loadError";

    renderDashboard();

    await waitFor(() =>
      expect(screen.getByTestId("dashboard-error").textContent).toContain(
        "No pudimos cargar tus tareas.",
      ),
    );
  });
});
