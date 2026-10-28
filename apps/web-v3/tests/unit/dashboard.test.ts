import { cleanup, render, screen, waitFor } from "@testing-library/vue";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import DashboardView from "~/ui/views/dashboard.vue";

const { dashboardState, loadMock } = await vi.hoisted(async () => {
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
      isEmpty: ref(true),
      isLoading: ref(false),
      error: ref(null),
    },
    loadMock: vi.fn(),
  };
});

vi.mock("~/shared/composables/use-dashboard", () => ({
  useDashboard: () => ({
    states: dashboardState.states,
    tallies: dashboardState.tallies,
    recentTasks: dashboardState.recentTasks,
    totalTasks: dashboardState.totalTasks,
    isEmpty: dashboardState.isEmpty,
    isLoading: dashboardState.isLoading,
    error: dashboardState.error,
    load: loadMock,
  }),
}));

const MESSAGES: Record<string, string> = {
  "dashboard.title": "Dashboard",
  "dashboard.subtitle": "Resumen de tu actividad al {date}",
  "dashboard.newTask": "+ Nueva tarea",
  "dashboard.timerTitle": "Timer activo",
  "dashboard.timerIdle": "No hay ningún timer corriendo.",
  "dashboard.timerCta": "Iniciá tu primer timer",
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
  "common.loading": "Cargando…",
};

vi.stubGlobal("useI18n", () => ({
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
    dashboardState.states.value = [];
    dashboardState.tallies.value = [];
    dashboardState.recentTasks.value = [];
    dashboardState.totalTasks.value = 0;
    dashboardState.isEmpty.value = true;
    dashboardState.isLoading.value = false;
    dashboardState.error.value = null;
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

  it("lists the latest tasks with their column", async () => {
    dashboardState.isEmpty.value = false;
    dashboardState.totalTasks.value = 1;
    dashboardState.recentTasks.value = [
      {
        id: "t1",
        title: "Tarea de prueba",
        stateId: "s1",
        updatedAt: new Date("2026-06-24T10:00:00.000Z"),
      },
    ];

    renderDashboard();

    const recent = screen.getByTestId("dashboard-recent");
    expect(recent.textContent).toContain("Tarea de prueba");
  });

  it("offers the two calls to action when the user has no tasks", async () => {
    renderDashboard();

    const empty = screen.getByTestId("dashboard-empty");
    expect(empty.textContent).toContain("Creá tu primera tarea");
    expect(empty.textContent).toContain("Iniciá tu primer timer");
  });

  it("always offers the timer card, since the API has no running timer", () => {
    renderDashboard();

    const timer = screen.getByTestId("dashboard-timer");
    expect(timer.textContent).toContain("Iniciá tu primer timer");
  });

  it("shows the load failure inline instead of an empty screen", async () => {
    dashboardState.error.value = "dashboard.loadError";

    renderDashboard();

    await waitFor(() =>
      expect(screen.getByTestId("dashboard-recent").textContent).toContain(
        "No pudimos cargar tus tareas.",
      ),
    );
  });
});
