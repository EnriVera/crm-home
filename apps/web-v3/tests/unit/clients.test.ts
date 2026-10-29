import { cleanup, render, screen, waitFor } from "@testing-library/vue";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import ClientsView from "~/ui/views/clients.vue";

const { clientsState, loadMock, setMock, actionMocks, dependenciesMock } =
  await vi.hoisted(async () => {
    const { ref } = await import("vue");
    return {
      clientsState: {
        clients: ref([]),
        search: ref(""),
        visibleClients: ref([]),
        isLoading: ref(false),
        error: ref(null),
      },
      loadMock: vi.fn(),
      setMock: vi.fn(),
      dependenciesMock: vi.fn(async () => ({ dependencies: [], total: 0 })),
      actionMocks: {
        add: vi.fn(),
        edit: vi.fn(),
        deleteClient: vi.fn(),
      },
    };
  });

vi.mock("~/shared/composables/use-clients", () => ({
  useClients: () => ({
    clients: clientsState.clients,
    search: clientsState.search,
    visibleClients: clientsState.visibleClients,
    isLoading: clientsState.isLoading,
    error: clientsState.error,
    load: loadMock,
    ...actionMocks,
    dependencies: dependenciesMock,
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
  "clients.title": "Clientes",
  "clients.subtitle": "{count} clientes",
  "clients.new": "Nuevo cliente",
  "clients.add": "Agregar cliente",
  "clients.search": "Buscar clientes…",
  "clients.empty": "Todavía no tenés clientes.",
  "clients.loadError": "No pudimos cargar tus clientes.",
  "clients.deleteError": "No pudimos eliminar el cliente.",
  "clients.drawer.newTitle": "Nuevo cliente",
  "clients.drawer.editTitle": "Editar cliente",
  "clients.drawer.name": "Nombre o empresa",
  "clients.drawer.namePlaceholder": "Acme Studio",
  "clients.drawer.email": "Email",
  "clients.drawer.emailPlaceholder": "hola@acme.com",
  "clients.drawer.phone": "Teléfono",
  "clients.drawer.phonePlaceholder": "+54 9 11 0000-1111",
  "clients.drawer.delete": "Eliminar cliente",
  "clients.drawer.deleteConfirm": "Sin tareas.",
  "clients.drawer.deleteWithDependencies": "{count} tareas.",
  "clients.drawer.deleteConfirmButton": "Eliminar igual",
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

describe("clients view", () => {
  beforeEach(() => {
    loadMock.mockReset();
    setMock.mockReset();
    for (const mock of Object.values(actionMocks)) mock.mockReset();
    dependenciesMock.mockClear();
    routeState.params.value = {};
    clientsState.clients.value = [];
    clientsState.visibleClients.value = [];
    clientsState.isLoading.value = false;
    clientsState.error.value = null;
  });

  afterEach(cleanup);

  it("loads the clients on mount", async () => {
    render(ClientsView);

    await waitFor(() => expect(loadMock).toHaveBeenCalledTimes(1));
  });

  it("shows the count of clients in the header", async () => {
    clientsState.clients.value = [
      {
        id: "c1",
        name: "Acme Studio",
        email: "hola@acme.test",
        phone: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ];
    clientsState.visibleClients.value = clientsState.clients.value;

    render(ClientsView);

    expect(screen.getByText("1 clientes")).toBeDefined();
  });

  it("renders a card per client with the initials avatar", async () => {
    clientsState.visibleClients.value = [
      {
        id: "c1",
        name: "Acme Studio",
        email: "hola@acme.test",
        phone: "+54 9 11 0000-1111",
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ];

    render(ClientsView);

    const card = screen.getByTestId("client-card");
    expect(card.textContent).toContain("Acme Studio");
    expect(screen.getByTestId("client-avatar").textContent).toBe("AS");
    expect(screen.getByTestId("client-email").textContent).toContain(
      "hola@acme.test",
    );
    expect(screen.getByTestId("client-phone").textContent).toContain(
      "+54 9 11 0000-1111",
    );
  });

  it("puts the drawer in the URL when the add card is clicked", async () => {
    render(ClientsView);

    screen.getByTestId("clients-add").click();

    await waitFor(() =>
      expect(setMock).toHaveBeenCalledWith({ drawer: "new", edit: "" }),
    );
  });

  it("puts the client id in the URL when a card is edited", async () => {
    clientsState.clients.value = [
      {
        id: "c1",
        name: "Acme Studio",
        email: null,
        phone: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ];
    clientsState.visibleClients.value = clientsState.clients.value;

    render(ClientsView);
    screen.getByTestId("client-card-edit").click();

    await waitFor(() =>
      expect(setMock).toHaveBeenCalledWith({
        edit: "c1",
        drawer: "",
        delete: "",
      }),
    );
  });

  it("opens the drawer with the client when the URL has the edit param", async () => {
    routeState.params.value = { edit: "c1" };
    clientsState.clients.value = [
      {
        id: "c1",
        name: "Acme Studio",
        email: "hola@acme.test",
        phone: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ];

    render(ClientsView);

    const panel = await screen.findByTestId("drawer-panel");
    expect(panel.textContent).toContain("Editar cliente");
    expect((screen.getByLabelText("Nombre o empresa") as HTMLInputElement).value).toBe(
      "Acme Studio",
    );
  });

  it("shows the empty state when there are no clients", async () => {
    render(ClientsView);

    expect(screen.getByTestId("clients-empty")).toBeDefined();
  });
});
