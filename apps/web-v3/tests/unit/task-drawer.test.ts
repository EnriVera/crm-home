import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/vue";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { Task } from "~/domain/task/entities";

const { categoriesMock } = await vi.hoisted(async () => {
  return {
    categoriesMock: vi.fn(async () => [
      { id: "k1", name: "Web", typeId: "t1" },
      { id: "k2", name: "Brand", typeId: "t1" },
    ]),
  };
});

import type * as TaskAdapter from "~/infrastructure/task/orpc-task";

vi.mock("~/infrastructure/task/orpc-task", async (importOriginal) => {
  const original = await importOriginal<typeof TaskAdapter>();
  return {
    ...original,
    listCategoriesForType: categoriesMock,
  };
});

import TaskDrawer from "~/ui/organisms/task-drawer.vue";

const MESSAGES: Record<string, string> = {
  "config.drawer.cancel": "Cancelar",
  "config.drawer.save": "Guardar",
  "config.drawer.saving": "Guardando…",
  "tasks.drawer.newTitle": "Nueva tarea",
  "tasks.drawer.editTitle": "Editar tarea",
  "tasks.drawer.title": "Título",
  "tasks.drawer.titlePlaceholder": "Qué hay que hacer",
  "tasks.drawer.description": "Descripción",
  "tasks.drawer.bold": "Negrita",
  "tasks.drawer.italic": "Cursiva",
  "tasks.drawer.list": "Lista",
  "tasks.drawer.link": "Enlace",
  "tasks.drawer.linkPrompt": "URL del enlace",
  "tasks.drawer.client": "Cliente",
  "tasks.drawer.noClient": "Sin cliente",
  "tasks.drawer.type": "Tipo",
  "tasks.drawer.noType": "Elegí un tipo",
  "tasks.drawer.category": "Categoría",
  "tasks.drawer.noCategory": "Sin categoría",
  "tasks.drawer.categoryNeedsType": "Elegí un tipo primero",
  "tasks.drawer.delete": "Eliminar tarea",
};

vi.stubGlobal("useI18n", () => ({
  t: (key: string) => MESSAGES[key] ?? key,
}));

const clients = [{ id: "c1", name: "Acme Studio" }];
const types = [
  { id: "t1", name: "Diseño" },
  { id: "t2", name: "Marketing" },
];

describe("task-drawer", () => {
  beforeEach(() => {
    categoriesMock.mockClear();
  });

  afterEach(cleanup);

  it("preselects a type (it is required) and enables the category", async () => {
    render(TaskDrawer, {
      props: { open: true, initial: null, clients, types },
    });

    const typeSelect = (await screen.findByTestId(
      "task-type",
    )) as HTMLSelectElement;
    expect(typeSelect.value).toBe("t1");

    await waitFor(() => expect(categoriesMock).toHaveBeenCalledWith("t1"));
    const category = screen.getByTestId("task-category") as HTMLSelectElement;
    expect(category.disabled).toBe(false);
  });

  it("disables the category again when the type is cleared", async () => {
    render(TaskDrawer, {
      props: { open: true, initial: null, clients, types },
    });

    const typeSelect = (await screen.findByTestId(
      "task-type",
    )) as HTMLSelectElement;
    // Vue removes the `value` attribute of a `:value="null"` option, so the
    // DOM value of the empty option is its TEXT — select it by text.
    const empty = Array.from(typeSelect.options).find(
      (option) => option.textContent?.trim() === "Elegí un tipo",
    )!;
    await fireEvent.update(typeSelect, empty.value);

    const category = screen.getByTestId("task-category") as HTMLSelectElement;
    expect(category.disabled).toBe(true);
    expect(category.title).toBe("Elegí un tipo primero");
  });

  it("keeps the save button disabled without a type", async () => {
    render(TaskDrawer, {
      props: { open: true, initial: null, clients, types },
    });

    const title = (await screen.findByLabelText("Título")) as HTMLInputElement;
    await fireEvent.update(title, "Sin tipo");
    const typeSelect = screen.getByTestId("task-type") as HTMLSelectElement;
    const empty = Array.from(typeSelect.options).find(
      (option) => option.textContent?.trim() === "Elegí un tipo",
    )!;
    await fireEvent.update(typeSelect, empty.value);

    const save = screen.getByTestId("drawer-save") as HTMLButtonElement;
    expect(save.disabled).toBe(true);
  });

  it("loads the categories of the chosen type and enables the select", async () => {
    render(TaskDrawer, {
      props: { open: true, initial: null, clients, types },
    });

    const typeSelect = (await screen.findByTestId(
      "task-type",
    )) as HTMLSelectElement;
    await fireEvent.update(typeSelect, "t1");

    await waitFor(() => expect(categoriesMock).toHaveBeenCalledWith("t1"));
    const category = screen.getByTestId("task-category") as HTMLSelectElement;
    expect(category.disabled).toBe(false);
    expect(category.textContent).toContain("Web");
  });

  it("submits the form values", async () => {
    const { emitted } = render(TaskDrawer, {
      props: { open: true, initial: null, clients, types },
    });

    await fireEvent.update(screen.getByLabelText("Título"), "Nueva web");
    const typeSelect = screen.getByTestId("task-type") as HTMLSelectElement;
    await fireEvent.update(typeSelect, "t1");
    await waitFor(() => expect(categoriesMock).toHaveBeenCalled());

    screen.getByTestId("drawer-save").click();

    await waitFor(() => {
      const payload = emitted().submit?.[0]?.[0] as {
        title: string;
        typeId: string | null;
      };
      expect(payload.title).toBe("Nueva web");
      expect(payload.typeId).toBe("t1");
    });
  });

  it("does not submit an empty title", async () => {
    const { emitted } = render(TaskDrawer, {
      props: { open: true, initial: null, clients, types },
    });

    screen.getByTestId("drawer-save").click();

    await waitFor(() => expect(emitted().submit).toBeUndefined());
  });

  it("emits remove with the task id in edit mode", async () => {
    const task: Task = {
      id: "task-1",
      title: "Tarea",
      description: null,
      stateId: "s1",
      typeId: "t1",
      categoryId: null,
      clientId: null,
      kanbanOrder: 1,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    const { emitted } = render(TaskDrawer, {
      props: { open: true, initial: task, clients, types },
    });

    screen.getByTestId("task-delete").click();

    await waitFor(() => expect(emitted().remove).toEqual([["task-1"]]));
  });

  it("prefills the fields with the edited task", async () => {
    const task: Task = {
      id: "task-1",
      title: "Tarea existente",
      description: "<p>hola</p>",
      stateId: "s1",
      typeId: "t1",
      categoryId: "k1",
      clientId: "c1",
      kanbanOrder: 1,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    render(TaskDrawer, {
      props: { open: true, initial: task, clients, types },
    });

    const title = (await screen.findByLabelText("Título")) as HTMLInputElement;
    expect(title.value).toBe("Tarea existente");
    const client = screen.getByTestId("task-client") as HTMLSelectElement;
    expect(client.value).toBe("c1");
    await waitFor(() => expect(categoriesMock).toHaveBeenCalledWith("t1"));
  });
});
