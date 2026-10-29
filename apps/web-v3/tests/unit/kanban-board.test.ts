import { cleanup, render, screen, waitFor } from "@testing-library/vue";
import { afterEach, describe, expect, it, vi } from "vitest";
import KanbanBoard from "~/ui/organisms/kanban-board.vue";
import { tasksByColumn, type Task, type TaskColumn } from "~/domain/task/entities";

const MESSAGES: Record<string, string> = {
  "tasks.emptyColumn": "Arrastrá una tarea acá",
  "tasks.addInColumn": "Agregar tarea en {name}",
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

function task(id: string, stateId: string, order: number): Task {
  return {
    id,
    title: `Tarea ${id}`,
    description: null,
    stateId,
    typeId: null,
    categoryId: null,
    clientId: null,
    kanbanOrder: order,
    createdAt: new Date(),
    updatedAt: new Date(),
  };
}

const columns: TaskColumn[] = [
  { id: "s1", name: "Pendiente", order: 1 },
  { id: "s2", name: "En progreso", order: 2 },
];

describe("kanban-board", () => {
  afterEach(cleanup);

  it("renders one column per state with its count", () => {
    const tasks = [task("a", "s1", 1), task("b", "s1", 2), task("c", "s2", 1)];
    render(KanbanBoard, {
      props: {
        columns,
        board: tasksByColumn(tasks, columns),
        clientNameById: new Map(),
        categoryNameById: new Map(),
      },
    });

    expect(screen.getByTestId("kanban-column-s1")).toBeDefined();
    expect(screen.getByTestId("kanban-column-s2")).toBeDefined();
    const counts = screen.getAllByTestId("kanban-count");
    expect(counts[0]!.textContent).toBe("2");
    expect(counts[1]!.textContent).toBe("1");
  });

  it("shows the empty hint in a column without tasks", () => {
    render(KanbanBoard, {
      props: {
        columns,
        board: tasksByColumn([], columns),
        clientNameById: new Map(),
        categoryNameById: new Map(),
      },
    });

    expect(screen.getAllByText("Arrastrá una tarea acá").length).toBe(2);
  });

  it("resolves the client and category names on the cards", () => {
    const tasks = [task("a", "s1", 1)];
    tasks[0]!.clientId = "c1";
    tasks[0]!.categoryId = "k1";
    render(KanbanBoard, {
      props: {
        columns,
        board: tasksByColumn(tasks, columns),
        clientNameById: new Map(Object.entries({ c1: "Acme Studio" })),
        categoryNameById: new Map(Object.entries({ k1: "Web" })),
      },
    });

    const card = screen.getByTestId("task-card");
    expect(card.textContent).toContain("Acme Studio");
    expect(screen.getByTestId("task-card-category").textContent).toBe("Web");
  });

  it("emits add with the column id when the column button is clicked", async () => {
    const { emitted } = render(KanbanBoard, {
      props: {
        columns,
        board: tasksByColumn([], columns),
        clientNameById: new Map(),
        categoryNameById: new Map(),
      },
    });

    screen.getByTestId("kanban-add-s2").click();

    await waitFor(() => expect(emitted().add).toEqual([["s2"]]));
  });

  it("emits open with the task id when a card is clicked", async () => {
    const { emitted } = render(KanbanBoard, {
      props: {
        columns,
        board: tasksByColumn([task("a", "s1", 1)], columns),
        clientNameById: new Map(),
        categoryNameById: new Map(),
      },
    });

    screen.getByTestId("task-card").click();

    await waitFor(() => expect(emitted().open).toEqual([["a"]]));
  });
});
