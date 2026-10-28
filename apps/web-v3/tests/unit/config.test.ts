import { cleanup, render, screen, waitFor } from "@testing-library/vue";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import ConfigView from "~/ui/views/config.vue";

const { configState, loadMock, setMock, themeMock, logoutMock } = await vi.hoisted(
  async () => {
    // Dynamic import on purpose: vi.hoisted runs before the module imports are
    // evaluated, so a static `import { ref } from "vue"` would not be available
    // yet. Same pattern as tests/unit/login.test.ts.
    const { ref } = await import("vue");
    return {
      configState: {
        types: ref([]),
        states: ref([]),
        apps: ref([]),
        currencies: ref([]),
        search: ref(""),
        visibleTypes: ref([]),
        orderedStates: ref([]),
        isLoading: ref(false),
        error: ref(null),
      },
      loadMock: vi.fn(),
      setMock: vi.fn(),
      themeMock: vi.fn(),
      logoutMock: vi.fn(),
    };
  },
);

vi.mock("~/shared/composables/use-config", () => ({
  useConfig: () => ({
    types: configState.types,
    states: configState.states,
    apps: configState.apps,
    currencies: configState.currencies,
    search: configState.search,
    visibleTypes: configState.visibleTypes,
    orderedStates: configState.orderedStates,
    isLoading: configState.isLoading,
    error: configState.error,
    load: loadMock,
    addType: vi.fn(),
    editType: vi.fn(),
    deleteType: vi.fn(),
    addState: vi.fn(),
    editState: vi.fn(),
    deleteState: vi.fn(),
    moveState: vi.fn(),
    setTheme: themeMock,
    logout: logoutMock,
  }),
}));

vi.mock("~/shared/composables/use-route-search", () => ({
  useRouteSearch: () => ({
    params: { value: { tab: "perfil" } },
    set: setMock,
  }),
}));

vi.mock("~/stores/auth", () => ({
  useAuthStore: () => ({ session: { name: "Martin Gómez", email: "martin@estudio.ar" } }),
}));

vi.mock("~/stores/theme", () => ({
  useThemeStore: () => ({ theme: "system", isDark: false, setTheme: vi.fn() }),
}));

const MESSAGES: Record<string, string> = {
  "config.title": "Configuración",
  "config.loadError": "No pudimos cargar tu configuración.",
  "config.themeError": "No pudimos guardar tu preferencia de tema.",
  "config.tabs.ariaLabel": "Secciones de configuración",
  "config.tabs.perfil": "Perfil",
  "config.tabs.perfilSubtitle": "Tu perfil, la apariencia del sistema y tu sesión",
  "config.tabs.estados": "Estados de tarea",
  "config.tabs.estadosSubtitle": "Estados de las columnas del tablero",
  "config.tabs.tipos": "Tipos",
  "config.tabs.tiposSubtitle": "Tipos de trabajo para clasificar tus tareas",
  "config.tabs.apps": "Aplicaciones",
  "config.tabs.appsSubtitle": "Los módulos de la aplicación",
  "config.tabs.monedas": "Monedas",
  "config.tabs.monedasSubtitle": "Las monedas disponibles",
  "config.profile.title": "Información personal",
  "config.profile.subtitle": "Estos datos vienen de tu cuenta",
  "config.profile.name": "Nombre completo",
  "config.profile.email": "Email",
  "config.appearance.title": "Apariencia",
  "config.appearance.subtitle": "Elegí cómo querés ver la interfaz",
  "config.theme.light": "Claro",
  "config.theme.dark": "Oscuro",
  "config.theme.system": "Sistema",
  "config.session.title": "Sesión",
  "config.session.subtitle": "Sesión activa en este dispositivo",
  "config.session.logout": "Cerrar sesión",
  "config.types.search": "Buscar tipos…",
  "config.types.add": "Agregar tipo",
  "config.types.save": "Guardar",
  "config.types.rename": "Renombrar tipo",
  "config.types.delete": "Eliminar",
  "config.types.info": "Los tipos agrupan tus tareas por área de trabajo.",
  "config.states.add": "Agregar estado",
  "config.states.save": "Guardar",
  "config.states.rename": "Renombrar estado",
  "config.states.delete": "Eliminar",
  "config.states.info": "Los estados nuevos aparecen como columnas.",
  "config.apps.info": "Las aplicaciones no se editan desde tu cuenta.",
  "config.monedas.decimals": "decimales",
  "config.monedas.info": "Las monedas son globales.",
  "config.modules.tasks": "Tareas",
  "config.modules.incomes": "Ingresos",
  "config.modules.expenses": "Gastos",
  "config.modules.schedules": "Schedule",
  "common.loading": "Cargando…",
};

vi.stubGlobal("useI18n", () => ({
  t: (key: string) => MESSAGES[key] ?? key,
}));

describe("config view", () => {
  afterEach(cleanup);

  beforeEach(() => {
    loadMock.mockReset();
    setMock.mockReset();
    themeMock.mockReset();
    logoutMock.mockReset();
    configState.types.value = [];
    configState.states.value = [];
    configState.apps.value = [];
    configState.currencies.value = [];
    configState.visibleTypes.value = [];
    configState.orderedStates.value = [];
    configState.isLoading.value = false;
    configState.error.value = null;
  });

  it("loads the active tab when it mounts", async () => {
    render(ConfigView);

    await waitFor(() => expect(loadMock).toHaveBeenCalledWith("perfil"));
  });

  it("shows the five tabs of the config section", () => {
    render(ConfigView);

    for (const id of ["perfil", "estados", "tipos", "apps", "monedas"]) {
      expect(screen.getByTestId(`config-tab-${id}`)).toBeDefined();
    }
  });

  it("shows the profile data and the session card", () => {
    render(ConfigView);

    const perfil = screen.getByTestId("config-perfil");
    expect(perfil.textContent).toContain("Martin Gómez");
    expect(perfil.textContent).toContain("martin@estudio.ar");
    expect(screen.getByTestId("config-logout")).toBeDefined();
  });

  it("saves the theme when a card is clicked", async () => {
    render(ConfigView);

    screen.getByTestId("config-theme-dark").click();

    await waitFor(() => expect(themeMock).toHaveBeenCalledWith("dark"));
  });

  it("ends the session from the session card", async () => {
    render(ConfigView);

    screen.getByTestId("config-logout").click();

    await waitFor(() => expect(logoutMock).toHaveBeenCalledTimes(1));
  });

  it("shows the load failure inline", async () => {
    configState.error.value = "config.loadError";

    render(ConfigView);

    expect(screen.getByTestId("config-error").textContent).toContain(
      "No pudimos cargar tu configuración.",
    );
  });
});
