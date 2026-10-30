import { cleanup, render, screen, waitFor } from "@testing-library/vue";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import IncomesView from "~/ui/views/incomes.vue";

const { incomesState, actionMocks, loadMock, loadCurrenciesMock, setMock } =
  await vi.hoisted(async () => {
    const { ref } = await import("vue");
    return {
      incomesState: {
        incomes: ref([]),
        accounts: ref([]),
        currencies: ref([]),
        search: ref(""),
        visibleIncomes: ref([]),
        monthTotal: ref(0),
        monthCount: ref(0),
        ticketAverage: ref(0),
        categories: ref([]),
        isLoading: ref(false),
        error: ref(null),
      },
      actionMocks: {
        add: vi.fn(),
        edit: vi.fn(),
        deleteIncome: vi.fn(),
        addAccount: vi.fn(),
        accountName: vi.fn(() => "Efectivo"),
        accountIconOf: vi.fn(() => "wallet"),
        accountColorOf: vi.fn(() => "#64748b"),
      },
      loadMock: vi.fn(),
      loadCurrenciesMock: vi.fn(),
      setMock: vi.fn(),
    };
  });

vi.mock("~/shared/composables/use-incomes", () => ({
  useIncomes: () => ({
    ...incomesState,
    ...actionMocks,
    load: loadMock,
    loadCurrencies: loadCurrenciesMock,
  }),
}));

const { routeState } = await vi.hoisted(async () => {
  const { ref } = await import("vue");
  return { routeState: { params: ref<Record<string, string>>({}) } };
});

vi.mock("~/shared/composables/use-route-search", () => ({
  useRouteSearch: () => ({ params: routeState.params, set: setMock }),
}));

const MESSAGES: Record<string, string> = {
  "incomes.title": "Ingresos",
  "incomes.subtitle": "Cobros y facturación del estudio",
  "incomes.new": "Nuevo ingreso",
  "incomes.add": "Agregar ingreso",
  "incomes.search": "Buscar ingresos…",
  "incomes.empty": "Todavía no tenés ingresos.",
  "incomes.loadError": "No pudimos cargar tus ingresos.",
  "incomes.saveError": "No pudimos guardar el ingreso.",
  "incomes.deleteError": "No pudimos eliminar el ingreso.",
  "incomes.delete": "Eliminar ingreso",
  "incomes.deleteConfirm": "¿Eliminar {name}?",
  "incomes.deleteConfirmYes": "Sí, eliminar",
  "incomes.noConcept": "Sin concepto",
  "incomes.columns.date": "Fecha",
  "incomes.columns.concept": "Concepto",
  "incomes.columns.account": "Cuenta",
  "incomes.columns.amount": "Monto",
  "incomes.cards.monthTotal": "Ingresos del mes",
  "incomes.cards.monthTotalHint": "{count} movimientos",
  "incomes.cards.ticketAverage": "Ticket promedio",
  "incomes.cards.ticketAverageHint": "Promedio de tus ingresos",
  "incomes.cards.lastIncome": "Último ingreso",
  "incomes.cards.noLast": "Sin ingresos cargados",
  "incomes.drawer.newTitle": "Nuevo ingreso",
  "incomes.drawer.editTitle": "Editar ingreso",
  "incomes.drawer.amount": "Monto",
  "incomes.drawer.description": "Concepto",
  "incomes.drawer.descriptionPlaceholder": "Factura #1046",
  "incomes.drawer.account": "Cuenta destino",
  "incomes.drawer.noAccounts": "Necesitás una cuenta.",
  "incomes.drawer.createAccount": "Crear cuenta",
  "incomes.drawer.date": "Fecha",
  "accounts.drawer.newTitle": "Nueva cuenta",
  "accounts.drawer.name": "Nombre de la cuenta",
  "accounts.drawer.namePlaceholder": "Banco Nación",
  "accounts.drawer.kind": "Tipo de cuenta",
  "accounts.drawer.currency": "Moneda",
  "accounts.drawer.initialAmount": "Saldo inicial",
  "accounts.drawer.color": "Color",
  "accounts.kinds.bank": "Banco",
  "accounts.kinds.wallet": "Billetera",
  "accounts.kinds.cash": "Efectivo",
  "config.drawer.cancel": "Cancelar",
  "config.drawer.save": "Guardar",
  "config.drawer.saving": "Guardando…",
  "baseview.switcher": "Cambiar vista",
  "baseview.grid": "Grilla",
  "baseview.list": "Lista",
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

describe("incomes view", () => {
  beforeEach(() => {
    loadMock.mockReset();
    loadCurrenciesMock.mockReset();
    setMock.mockReset();
    for (const mock of Object.values(actionMocks)) mock.mockReset();
    routeState.params.value = {};
    incomesState.incomes.value = [];
    incomesState.visibleIncomes.value = [];
    incomesState.accounts.value = [];
    incomesState.currencies.value = [];
    incomesState.isLoading.value = false;
    incomesState.error.value = null;
  });

  afterEach(cleanup);

  it("carga los ingresos y las monedas al montar", async () => {
    render(IncomesView);
    await waitFor(() => expect(loadMock).toHaveBeenCalled());
    expect(loadCurrenciesMock).toHaveBeenCalled();
  });

  it("muestra el título y las tres tarjetas del mes", () => {
    render(IncomesView);
    expect(screen.getByRole("heading", { name: "Ingresos" })).toBeTruthy();
    expect(screen.getByText("Ingresos del mes")).toBeTruthy();
    expect(screen.getByText("Ticket promedio")).toBeTruthy();
    expect(screen.getByText("Último ingreso")).toBeTruthy();
  });

  it("lista los ingresos con su cuenta y su monto", () => {
    incomesState.currencies.value = [
      { id: "curr-1", name: "Peso", symbol: "$", decimals: 2 },
    ];
    incomesState.visibleIncomes.value = [
      {
        id: "inc-1",
        accountId: "acco-1",
        amount: 250,
        currencyId: "curr-1",
        description: "Factura #1",
        category: null,
        date: "2026-06-28",
        createdAt: new Date(),
      },
    ];
    render(IncomesView);
    expect(screen.getByText("Factura #1")).toBeTruthy();
    expect(screen.getAllByText("Efectivo").length).toBeGreaterThan(0);
    expect(screen.getAllByText("$ 250").length).toBeGreaterThan(0);
  });

  it("abre el drawer de alta con la cuenta en la URL", async () => {
    render(IncomesView);
    screen.getByTestId("incomes-new").click();
    await waitFor(() =>
      expect(setMock).toHaveBeenCalledWith({ drawer: "new", edit: "" }),
    );
  });

  it("muestra el error de carga si la API falla", () => {
    incomesState.error.value = "incomes.loadError";
    render(IncomesView);
    expect(screen.getByTestId("incomes-error").textContent).toContain(
      "No pudimos cargar tus ingresos.",
    );
  });
});
