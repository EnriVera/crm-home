import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/vue";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { Client } from "~/domain/client/entities";
import ClientDrawer from "~/ui/organisms/client-drawer.vue";

const MESSAGES: Record<string, string> = {
  "config.drawer.cancel": "Cancelar",
  "config.drawer.save": "Guardar",
  "config.drawer.saving": "Guardando…",
  "clients.drawer.newTitle": "Nuevo cliente",
  "clients.drawer.editTitle": "Editar cliente",
  "clients.drawer.name": "Nombre o empresa",
  "clients.drawer.namePlaceholder": "Acme Studio",
  "clients.drawer.email": "Email",
  "clients.drawer.emailPlaceholder": "hola@acme.com",
  "clients.drawer.phone": "Teléfono",
  "clients.drawer.phonePlaceholder": "+54 9 11 0000-1111",
  "clients.drawer.delete": "Eliminar cliente",
  "clients.drawer.deleteConfirm": "Este cliente no tiene tareas asociadas.",
  "clients.drawer.deleteWithDependencies":
    "Este cliente tiene {count} tareas asociadas.",
  "clients.drawer.deleteConfirmButton": "Eliminar igual",
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

const existing: Client = {
  id: "c1",
  name: "Acme Studio",
  email: "hola@acme.test",
  phone: "+54 9 11 0000-1111",
  createdAt: new Date(),
  updatedAt: new Date(),
};

describe("client-drawer", () => {
  afterEach(cleanup);

  it("submits the form values with empty fields as null", async () => {
    const { emitted } = render(ClientDrawer, {
      props: { open: true, initial: null },
    });

    await fireEvent.update(screen.getByLabelText("Nombre o empresa"), "  Norte Digital  ");
    await fireEvent.update(screen.getByLabelText("Email"), "hola@norte.test");
    await fireEvent.update(screen.getByLabelText("Teléfono"), "+54 9 11 2222-3333");

    screen.getByTestId("drawer-save").click();

    await waitFor(() => {
      expect(emitted().submit?.[0]?.[0]).toEqual({
        name: "Norte Digital",
        email: "hola@norte.test",
        phone: "+54 9 11 2222-3333",
      });
    });
  });

  it("sends null for the fields left empty", async () => {
    const { emitted } = render(ClientDrawer, {
      props: { open: true, initial: null },
    });

    await fireEvent.update(screen.getByLabelText("Nombre o empresa"), "Acme");
    screen.getByTestId("drawer-save").click();

    await waitFor(() => {
      expect(emitted().submit?.[0]?.[0]).toEqual({
        name: "Acme",
        email: null,
        phone: null,
      });
    });
  });

  it("keeps the save button disabled without a name", async () => {
    render(ClientDrawer, { props: { open: true, initial: null } });

    const save = screen.getByTestId("drawer-save") as HTMLButtonElement;
    expect(save.disabled).toBe(true);
  });

  it("prefills the fields with the edited client", async () => {
    render(ClientDrawer, { props: { open: true, initial: existing } });

    const name = (await screen.findByLabelText("Nombre o empresa")) as HTMLInputElement;
    expect(name.value).toBe("Acme Studio");
    expect((screen.getByLabelText("Email") as HTMLInputElement).value).toBe(
      "hola@acme.test",
    );
    expect((screen.getByLabelText("Teléfono") as HTMLInputElement).value).toBe(
      "+54 9 11 0000-1111",
    );
  });

  it("lists the dependencies before confirming the delete", async () => {
    const loadDependencies = vi.fn(async () => ({
      dependencies: [{ taskId: "t1", taskTitle: "Tarea del cliente" }],
      total: 1,
    }));
    const { emitted } = render(ClientDrawer, {
      props: { open: true, initial: existing, loadDependencies },
    });

    screen.getByTestId("client-delete").click();

    await waitFor(() => expect(loadDependencies).toHaveBeenCalledWith("c1"));
    const confirm = await screen.findByTestId("client-delete-confirm");
    expect(confirm).toBeDefined();
    const list = screen.getByTestId("client-dependencies");
    expect(list.textContent).toContain("Tarea del cliente");

    screen.getByTestId("client-delete-confirm-button").click();
    await waitFor(() => expect(emitted().remove).toEqual([["c1"]]));
  });

  it("confirms without dependencies when the client has none", async () => {
    const loadDependencies = vi.fn(async () => ({
      dependencies: [],
      total: 0,
    }));
    render(ClientDrawer, {
      props: { open: true, initial: existing, loadDependencies },
    });

    screen.getByTestId("client-delete").click();

    const confirm = await screen.findByTestId("client-delete-confirm");
    expect(confirm.textContent).toContain("no tiene tareas");
    expect(screen.queryByTestId("client-dependencies")).toBeNull();
  });

  it("goes back to the form when the confirmation is cancelled", async () => {
    const loadDependencies = vi.fn(async () => ({ dependencies: [], total: 0 }));
    render(ClientDrawer, {
      props: { open: true, initial: existing, loadDependencies },
    });

    screen.getByTestId("client-delete").click();
    await screen.findByTestId("client-delete-confirm");
    screen.getByTestId("client-delete-cancel").click();

    await waitFor(() =>
      expect(screen.queryByTestId("client-delete-confirm")).toBeNull(),
    );
    expect(screen.getByLabelText("Nombre o empresa")).toBeDefined();
  });
});
