import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/vue";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import ConfigView from "~/ui/views/config.vue";

const { configState, loadMock, setMock, themeMock, logoutMock, actionMocks } =
  await vi.hoisted(async () => {
    // Dynamic import on purpose: vi.hoisted runs before the module imports are
    // evaluated, so a static `import { ref } from "vue"` would not be available
    // yet. Same pattern as tests/unit/login.test.ts.
    const { ref } = await import("vue");
    return {
      configState: {
        types: ref([]),
        states: ref([]),
        categories: ref([]),
        apps: ref([]),
        currencies: ref([]),
        search: ref(""),
        visibleTypes: ref([]),
        visibleCategories: ref([]),
        visibleStates: ref([]),
        visibleCurrencies: ref([]),
        orderedStates: ref([]),
        isLoading: ref(false),
        error: ref(null),
      },
      loadMock: vi.fn(),
      setMock: vi.fn(),
      themeMock: vi.fn(),
      logoutMock: vi.fn(),
      actionMocks: {
        addType: vi.fn(),
        editType: vi.fn(),
        deleteType: vi.fn(),
        addState: vi.fn(),
        editState: vi.fn(),
        deleteState: vi.fn(),
        addCategory: vi.fn(),
        editCategory: vi.fn(),
        deleteCategory: vi.fn(),
        addCurrency: vi.fn(),
        saveProfile: vi.fn(),
      },
    };
  });

vi.mock("~/shared/composables/use-config", () => ({
  useConfig: () => ({
    types: configState.types,
    states: configState.states,
    categories: configState.categories,
    apps: configState.apps,
    currencies: configState.currencies,
    search: configState.search,
    visibleTypes: configState.visibleTypes,
    visibleCategories: configState.visibleCategories,
    visibleStates: configState.visibleStates,
    visibleCurrencies: configState.visibleCurrencies,
    orderedStates: configState.orderedStates,
    isLoading: configState.isLoading,
    error: configState.error,
    load: loadMock,
    ...actionMocks,
    setTheme: themeMock,
    logout: logoutMock,
  }),
}));

const { routeState } = await vi.hoisted(async () => {
  const { ref } = await import("vue");
  return {
    routeState: {
      /** Tests pin the active tab + drawer params here. */
      params: ref<Record<string, string>>({ tab: "perfil" }),
    },
  };
});

vi.mock("~/shared/composables/use-route-search", () => ({
  useRouteSearch: () => ({
    params: routeState.params,
    set: setMock,
  }),
}));

vi.mock("~/stores/auth", () => ({
  useAuthStore: () => ({
    session: { name: "Martin Gómez", email: "martin@estudio.ar" },
    profile: { name: "Martin Gómez", studio: null },
    setProfile: vi.fn(),
  }),
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
  "config.tabs.perfilSubtitle": "Tu perfil, la apariencia y tu sesión",
  "config.tabs.estados": "Estados de tarea",
  "config.tabs.estadosSubtitle": "Estados de las columnas",
  "config.tabs.tipos": "Tipos",
  "config.tabs.tiposSubtitle": "Tipos de trabajo",
  "config.tabs.categorias": "Categorías",
  "config.tabs.categoriasSubtitle": "Categorías para reportes",
  "config.tabs.apps": "Aplicaciones",
  "config.tabs.appsSubtitle": "Los módulos",
  "config.tabs.monedas": "Monedas",
  "config.tabs.monedasSubtitle": "Las monedas",
  "config.profile.title": "Información personal",
  "config.profile.subtitle": "Estos datos vienen de tu cuenta",
  "config.profile.name": "Nombre completo",
  "config.profile.email": "Email",
  "config.profile.emailReadOnly": "No se puede cambiar: es tu identidad.",
  "config.profile.studio": "Estudio",
  "config.profile.studioPlaceholder": "Tu estudio o marca",
  "config.profile.studioHint": "Opcional.",
  "config.profile.save": "Guardar cambios",
  "config.profile.saving": "Guardando…",
  "config.profile.saved": "Listo, tus datos quedaron guardados.",
  "config.profile.nameRequired": "El nombre no puede estar vacío.",
  "config.profile.saveError": "No pudimos guardar tus datos. Probá de nuevo.",
  "config.appearance.title": "Apariencia",
  "config.appearance.subtitle": "Elegí cómo ver la interfaz",
  "config.theme.light": "Claro",
  "config.theme.dark": "Oscuro",
  "config.theme.system": "Sistema",
  "config.session.title": "Sesión",
  "config.session.subtitle": "Sesión activa",
  "config.session.logout": "Cerrar sesión",
  "config.types.search": "Buscar tipos…",
  "config.types.add": "Agregar tipo",
  "config.types.delete": "Eliminar",
  "config.types.info": "Los tipos agrupan tus tareas.",
  "config.states.search": "Buscar estados…",
  "config.states.add": "Agregar estado",
  "config.states.delete": "Eliminar",
  "config.states.position": "Columna {n}",
  "config.states.info": "Los estados nuevos son columnas.",
  "config.categorias.search": "Buscar categorías…",
  "config.categorias.add": "Agregar categoría",
  "config.categorias.delete": "Eliminar",
  "config.categorias.info": "Las categorías filtran tareas.",
  "config.apps.info": "Las aplicaciones no se editan.",
  "config.monedas.search": "Buscar monedas…",
  "config.monedas.add": "Agregar moneda",
  "config.monedas.decimals": "decimales",
  "config.monedas.info": "Las monedas son globales.",
  "config.drawer.cancel": "Cancelar",
  "config.drawer.save": "Guardar",
  "config.drawer.saving": "Guardando…",
  "config.drawer.name": "Nombre",
  "config.drawer.nameTypePlaceholder": "Nombre del tipo",
  "config.drawer.nameStatePlaceholder": "Nombre del estado",
  "config.drawer.nameCategoryPlaceholder": "Nombre de la categoría",
  "config.drawer.nameCurrencyPlaceholder": "Nombre de la moneda",
  "config.drawer.modules": "Módulos",
  "config.drawer.modulesEmpty": "Aplica a todos.",
  "config.drawer.position": "Posición en el tablero",
  "config.drawer.positionStart": "Al principio",
  "config.drawer.positionAfter": "Después de {name}",
  "config.drawer.type": "Tipo",
  "config.drawer.noTypes": "Creá un tipo primero.",
  "config.drawer.symbol": "Símbolo",
  "config.drawer.symbolPlaceholder": "$",
  "config.drawer.decimals": "Decimales",
  "config.drawer.newType": "Nuevo tipo",
  "config.drawer.editType": "Editar tipo",
  "config.drawer.newState": "Nuevo estado",
  "config.drawer.editState": "Editar estado",
  "config.drawer.newCategory": "Nueva categoría",
  "config.drawer.editCategory": "Editar categoría",
  "config.drawer.newCurrency": "Nueva moneda",
  "config.drawer.saveError": "No pudimos guardar. Reintentá.",
  "config.modules.tasks": "Tareas",
  "config.modules.incomes": "Ingresos",
  "config.modules.expenses": "Gastos",
  "config.modules.schedules": "Schedule",
  "common.loading": "Cargando…",
};

vi.stubGlobal("useI18n", () => ({
  t: (key: string, params?: Record<string, unknown>) => {
    let value = MESSAGES[key] ?? key;
    if (params) {
      for (const [k, v] of Object.entries(params)) {
        value = value.replace(`{${k}}`, String(v));
      }
    }
    return value;
  },
}));

describe("config view", () => {
  afterEach(cleanup);

  beforeEach(() => {
    loadMock.mockReset();
    setMock.mockReset();
    themeMock.mockReset();
    logoutMock.mockReset();
    routeState.params.value = { tab: "perfil" };
    for (const mock of Object.values(actionMocks)) mock.mockReset();
    for (const ref of Object.values(configState)) {
      ref.value = Array.isArray(ref.value) ? [] : ref.value;
    }
    configState.search.value = "";
    configState.isLoading.value = false;
    configState.error.value = null;
  });

  it("loads the active tab when it mounts", async () => {
    render(ConfigView);

    await waitFor(() => expect(loadMock).toHaveBeenCalledWith("perfil"));
  });

  it("shows the six tabs of the config section", () => {
    render(ConfigView);

    for (const id of [
      "perfil",
      "estados",
      "tipos",
      "categorias",
      "apps",
      "monedas",
    ]) {
      expect(screen.getByTestId(`config-tab-${id}`)).toBeDefined();
    }
  });

  it("shows the profile data and the session card", () => {
    render(ConfigView);

    const perfil = screen.getByTestId("config-perfil");
    // The name is EDITABLE (PRD-v4 §8.8): it lives in the input, not in
    // the text of the card.
    expect(
      (screen.getByTestId("config-profile-name") as HTMLInputElement).value,
    ).toBe("Martin Gómez");
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

  it("shows the types grid with the records and the add card", () => {
    routeState.params.value = { tab: "tipos" };
    configState.visibleTypes.value = [
      { id: "t1", name: "Diseño", modules: ["tasks"], createdAt: new Date() },
    ];

    render(ConfigView);

    expect(screen.getByTestId("baseview-grid-view").textContent).toContain(
      "Diseño",
    );
    expect(screen.getByTestId("config-add-type")).toBeDefined();
  });

  it("the add card puts the drawer in the URL and opens it", async () => {
    routeState.params.value = { tab: "tipos" };

    render(ConfigView);
    screen.getByTestId("config-add-type").click();

    await waitFor(() =>
      expect(setMock).toHaveBeenCalledWith({
        tab: "tipos",
        drawer: "new",
        edit: "",
      }),
    );

    // With the URL updated the drawer renders.
    routeState.params.value = { tab: "tipos", drawer: "new" };
    await waitFor(() => expect(screen.getByTestId("drawer-panel")).toBeDefined());
    expect(screen.getByTestId("drawer-panel").textContent).toContain(
      "Nuevo tipo",
    );
  });

  it("creating a type submits the form values and closes the drawer", async () => {
    routeState.params.value = { tab: "tipos", drawer: "new" };

    render(ConfigView);

    const panel = await screen.findByTestId("drawer-panel");
    const nameInput = panel.querySelector("input")!;
    await fireEvent.update(nameInput, "Consultoría");

    screen.getByTestId("drawer-save").click();

    await waitFor(() =>
      expect(actionMocks.addType).toHaveBeenCalledWith({
        name: "Consultoría",
        modules: ["tasks"],
        color: null,
      }),
    );
    // closeDrawer clears the URL params.
    await waitFor(() =>
      expect(setMock).toHaveBeenCalledWith({ drawer: "", edit: "" }),
    );
  });

  it("the category edit button puts the record id in the URL", async () => {
    routeState.params.value = { tab: "categorias" };
    const category = {
      id: "c1",
      name: "Web",
      typeId: "t1",
      createdAt: new Date(),
    };
    configState.visibleCategories.value = [category];
    configState.categories.value = [category];
    configState.types.value = [
      { id: "t1", name: "Diseño", modules: ["tasks"], createdAt: new Date() },
    ];

    render(ConfigView);
    screen.getAllByTestId("config-card-edit")[0]!.click();

    await waitFor(() =>
      expect(setMock).toHaveBeenCalledWith({
        tab: "categorias",
        edit: "c1",
        drawer: "",
      }),
    );
  });

  it("the currency drawer opens from the add card", async () => {
    routeState.params.value = { tab: "monedas" };

    render(ConfigView);
    screen.getByTestId("config-add-currency").click();

    await waitFor(() =>
      expect(setMock).toHaveBeenCalledWith({
        tab: "monedas",
        drawer: "new",
        edit: "",
      }),
    );

    routeState.params.value = { tab: "monedas", drawer: "new" };
    await waitFor(() => expect(screen.getByTestId("drawer-panel")).toBeDefined());
    expect(screen.getByTestId("drawer-panel").textContent).toContain(
      "Nueva moneda",
    );
  });
});
