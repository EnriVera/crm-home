import { cleanup, render, screen, waitFor } from "@testing-library/vue";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import ExpensesView from "~/ui/views/expenses.vue";

const { expensesState, actionMocks, loadMock, loadCatalogsMock, setMock } =
  await vi.hoisted(async () => {
    const { ref } = await import("vue");
    return {
      expensesState: {
        expenses: ref([]),
        accounts: ref([]),
        currencies: ref([]),
        search: ref(""),
        visibleExpenses: ref([]),
        monthTotal: ref(0),
        monthCount: ref(0),
        topCategory: ref(null),
        categories: ref([]),
        isLoading: ref(false),
        error: ref(null),
      },
      actionMocks: {
        add: vi.fn(),
        edit: vi.fn(),
        deleteExpense: vi.fn(),
        addAccount: vi.fn(),
        accountName: vi.fn(() => "Efectivo"),
        accountIconOf: vi.fn(() => "wallet"),
        accountColorOf: vi.fn(() => "#64748b"),
        symbolOf: vi.fn(() => "$"),
      },
      loadMock: vi.fn(),
      loadCatalogsMock: vi.fn(),
      setMock: vi.fn(),
    };
  });

vi.mock("~/shared/composables/use-expenses", () => ({
  useExpenses: () => ({
    ...expensesState,
    ...actionMocks,
    load: loadMock,
    loadCatalogs: loadCatalogsMock,
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
  "expenses.title": "Gastos",
  "expenses.subtitle": "Costos operativos del estudio",
  "expenses.new": "Nuevo gasto",
  "expenses.add": "Agregar gasto",
  "expenses.search": "Buscar gastos…",
  "expenses.empty": "Todavía no tenés gastos.",
  "expenses.loadError": "No pudimos cargar tus gastos.",
  "expenses.saveError": "No pudimos guardar el gasto.",
  "expenses.deleteError": "No pudimos eliminar el gasto.",
  "expenses.delete": "Eliminar gasto",
  "expenses.deleteConfirm": "¿Eliminar {name}?",
  "expenses.deleteConfirmYes": "Sí, eliminar",
  "expenses.noConcept": "Sin concepto",
  "expenses.noCategory": "Sin categoría",
  "expenses.columns.date": "Fecha",
  "expenses.columns.concept": "Concepto",
  "expenses.columns.category": "Categoría",
  "expenses.columns.account": "Cuenta",
  "expenses.columns.amount": "Monto",
  "expenses.cards.monthTotal": "Gastos del mes",
  "expenses.cards.monthTotalHint": "{count} movimientos",
  "expenses.cards.topCategory": "Mayor categoría",
  "expenses.cards.topCategoryHint": "{share} del total",
  "expenses.cards.noCategories": "Sin categorías cargadas",
  "expenses.drawer.newTitle": "Nuevo gasto",
  "expenses.drawer.editTitle": "Editar gasto",
  "expenses.drawer.amount": "Monto",
  "expenses.drawer.description": "Concepto",
  "expenses.drawer.descriptionPlaceholder": "Cowork · julio",
  "expenses.drawer.category": "Categoría",
  "expenses.drawer.categoryPlaceholder": "Software",
  "expenses.drawer.account": "Cuenta origen",
  "expenses.drawer.noAccounts": "Necesitás una cuenta.",
  "expenses.drawer.createAccount": "Crear cuenta",
  "expenses.drawer.date": "Fecha",
  "expenses.drawer.receipt": "Comprobante (URL)",
  "expenses.drawer.receiptPlaceholder": "https://…",
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

describe("expenses view", () => {
  beforeEach(() => {
    loadMock.mockReset();
    loadCatalogsMock.mockReset();
    setMock.mockReset();
    for (const mock of Object.values(actionMocks)) mock.mockReset();
    routeState.params.value = {};
    expensesState.expenses.value = [];
    expensesState.visibleExpenses.value = [];
    expensesState.accounts.value = [];
    expensesState.currencies.value = [];
    expensesState.isLoading.value = false;
    expensesState.error.value = null;
  });

  afterEach(cleanup);

  it("carga los gastos y las cuentas al montar", async () => {
    render(ExpensesView);
    await waitFor(() => expect(loadMock).toHaveBeenCalled());
    expect(loadCatalogsMock).toHaveBeenCalled();
  });

  it("muestra el título y las tres tarjetas", () => {
    render(ExpensesView);
    expect(screen.getByRole("heading", { name: "Gastos" })).toBeTruthy();
    expect(screen.getByText("Gastos del mes")).toBeTruthy();
    expect(screen.getByText("Mayor categoría")).toBeTruthy();
  });

  it("lista los gastos con su categoría, su cuenta y su monto", () => {
    expensesState.visibleExpenses.value = [
      {
        id: "exp-1",
        accountId: "acco-1",
        amount: 180000,
        currencyId: "curr-1",
        description: "Cowork · julio",
        category: "Servicios",
        receiptUrl: null,
        date: "2026-06-28",
        createdAt: new Date(),
      },
    ];
    render(ExpensesView);
    expect(screen.getByText("Cowork · julio")).toBeTruthy();
    expect(screen.getAllByText("Servicios").length).toBeGreaterThan(0);
    expect(screen.getAllByText("$ 180.000").length).toBeGreaterThan(0);
  });

  it("abre el drawer de alta con la cuenta en la URL", async () => {
    render(ExpensesView);
    screen.getByTestId("expenses-new").click();
    await waitFor(() =>
      expect(setMock).toHaveBeenCalledWith({ drawer: "new", edit: "" }),
    );
  });

  it("muestra el error de carga si la API falla", () => {
    expensesState.error.value = "expenses.loadError";
    render(ExpensesView);
    expect(screen.getByTestId("expenses-error").textContent).toContain(
      "No pudimos cargar tus gastos.",
    );
  });
});
