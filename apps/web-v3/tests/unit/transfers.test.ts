import { cleanup, render, screen, waitFor } from "@testing-library/vue";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import TransfersView from "~/ui/views/transfers.vue";

const { transfersState, actionMocks, loadMock, loadCatalogsMock, setMock } =
  await vi.hoisted(async () => {
    const { ref } = await import("vue");
    return {
      transfersState: {
        transfers: ref([]),
        accounts: ref([]),
        currencies: ref([]),
        search: ref(""),
        visibleTransfers: ref([]),
        monthTotal: ref(0),
        monthCount: ref(0),
        lastTransfer: ref(null),
        isLoading: ref(false),
        error: ref(null),
      },
      actionMocks: {
        add: vi.fn(),
        edit: vi.fn(),
        deleteTransfer: vi.fn(),
        addAccount: vi.fn(),
        accountOf: vi.fn(() => null),
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

vi.mock("~/shared/composables/use-transfers", () => ({
  useTransfers: () => ({
    ...transfersState,
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
  "transfers.title": "Transferencias",
  "transfers.subtitle": "Movimientos entre tus cuentas",
  "transfers.new": "Nueva transferencia",
  "transfers.add": "Agregar transferencia",
  "transfers.search": "Buscar transferencias…",
  "transfers.empty": "Todavía no transferiste nada.",
  "transfers.loadError": "No pudimos cargar tus transferencias.",
  "transfers.saveError": "No pudimos guardar la transferencia.",
  "transfers.deleteError": "No pudimos eliminar la transferencia.",
  "transfers.delete": "Eliminar transferencia",
  "transfers.deleteConfirm": "¿Eliminar esta transferencia?",
  "transfers.deleteConfirmYes": "Sí, eliminar",
  "transfers.noNote": "Sin nota",
  "transfers.columns.date": "Fecha",
  "transfers.columns.route": "Origen → Destino",
  "transfers.columns.note": "Nota",
  "transfers.columns.amount": "Monto",
  "transfers.cards.monthTotal": "Transferido este mes",
  "transfers.cards.monthTotalHint": "{count} movimientos",
  "transfers.cards.accounts": "Cuentas activas",
  "transfers.cards.accountsHint": "{count} cuentas",
  "transfers.cards.lastTransfer": "Último movimiento",
  "transfers.cards.noTransfers": "Sin transferencias cargadas",
  "transfers.drawer.newTitle": "Nueva transferencia",
  "transfers.drawer.editTitle": "Editar transferencia",
  "transfers.drawer.amount": "Monto a transferir",
  "transfers.drawer.from": "Origen",
  "transfers.drawer.to": "Destino",
  "transfers.drawer.available": "Disponible: {amount}",
  "transfers.drawer.balance": "Saldo actual: {amount}",
  "transfers.drawer.sameCurrency": "Las monedas coinciden ({from} → {to}).",
  "transfers.drawer.differentCurrency": "Las monedas difieren ({from} → {to}).",
  "transfers.drawer.date": "Fecha",
  "transfers.drawer.note": "Nota (opcional)",
  "transfers.drawer.notePlaceholder": "Reintegro.",
  "transfers.drawer.preview": "Origen quedará en {from} · Destino en {to}",
  "transfers.drawer.sameAccount": "Elegí dos cuentas distintas.",
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

describe("transfers view", () => {
  beforeEach(() => {
    loadMock.mockReset();
    loadCatalogsMock.mockReset();
    setMock.mockReset();
    for (const mock of Object.values(actionMocks)) mock.mockReset();
    routeState.params.value = {};
    transfersState.transfers.value = [];
    transfersState.visibleTransfers.value = [];
    transfersState.accounts.value = [];
    transfersState.currencies.value = [];
    transfersState.isLoading.value = false;
    transfersState.error.value = null;
  });

  afterEach(cleanup);

  it("carga las transferencias y las cuentas al montar", async () => {
    render(TransfersView);
    await waitFor(() => expect(loadMock).toHaveBeenCalled());
    expect(loadCatalogsMock).toHaveBeenCalled();
  });

  it("muestra el título y las tres tarjetas", () => {
    render(TransfersView);
    expect(screen.getByRole("heading", { name: "Transferencias" })).toBeTruthy();
    expect(screen.getByText("Transferido este mes")).toBeTruthy();
    expect(screen.getByText("Cuentas activas")).toBeTruthy();
    expect(screen.getByText("Último movimiento")).toBeTruthy();
  });

  it("lista las transferencias con su monto", () => {
    transfersState.visibleTransfers.value = [
      {
        id: "tran-1",
        fromAccountId: "acco-1",
        toAccountId: "acco-2",
        amount: 300000,
        currencyId: "curr-1",
        description: "Reintegro cowork",
        date: "2026-06-28",
        createdAt: new Date(),
      },
    ];
    render(TransfersView);
    expect(screen.getAllByText("Efectivo").length).toBeGreaterThan(0);
    expect(screen.getAllByText("$ 300.000").length).toBeGreaterThan(0);
  });

  it("abre el drawer de alta con la cuenta en la URL", async () => {
    render(TransfersView);
    screen.getByTestId("transfers-new").click();
    await waitFor(() =>
      expect(setMock).toHaveBeenCalledWith({ drawer: "new", edit: "" }),
    );
  });

  it("muestra el error de carga si la API falla", () => {
    transfersState.error.value = "transfers.loadError";
    render(TransfersView);
    expect(screen.getByTestId("transfers-error").textContent).toContain(
      "No pudimos cargar tus transferencias.",
    );
  });
});
