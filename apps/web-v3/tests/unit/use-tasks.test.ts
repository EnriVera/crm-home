import { beforeEach, describe, expect, it, vi } from "vitest";

const { adapterMock } = await vi.hoisted(async () => {
  const { ref } = await import("vue");
  return {
    adapterMock: {
      listTasks: vi.fn(),
      listTaskColumns: vi.fn(),
      listClients: vi.fn(),
      listTaskTypes: vi.fn(),
      listAllCategories: vi.fn(),
      createTask: vi.fn(),
      updateTask: vi.fn(),
      moveTask: vi.fn(),
      removeTask: vi.fn(),
    },
  };
});

vi.mock("~/infrastructure/task/orpc-task", () => adapterMock);
vi.mock("~/infrastructure/client/orpc-client", () => ({
  listClients: vi.fn(async () => []),
}));

import { useTasks } from "~/shared/composables/use-tasks";
import type { Task, TaskColumn } from "~/domain/task/entities";

function task(id: string, stateId: string, order: number): Task {
  return {
    id,
    title: `Tarea ${id}`,
    description: null,
    stateId,
    typeId: "t1",
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

describe("use-tasks", () => {
  beforeEach(() => {
    for (const mock of Object.values(adapterMock)) mock.mockReset();
    adapterMock.listTasks.mockResolvedValue([]);
    adapterMock.listTaskColumns.mockResolvedValue(columns);
    adapterMock.listClients.mockResolvedValue([]);
    adapterMock.listTaskTypes.mockResolvedValue([]);
    adapterMock.listAllCategories.mockResolvedValue([]);
  });

  it("moves a task to another column without duplicating it", async () => {
    const tasks = [task("a", "s1", 1), task("b", "s1", 2)];
    adapterMock.listTasks.mockResolvedValue(tasks);
    adapterMock.moveTask.mockImplementation(async (input: { id: string; targetStateId: string }) => ({
      ...task(input.id, input.targetStateId, 1),
    }));

    const { load, move, board, tasks: state } = useTasks();
    await load();

    await move({
      id: "a",
      targetStateId: "s2",
      index: 0,
      // The target column WITHOUT the moved task (the API's contract).
      columnTasks: [],
    });

    // The task is in the target column and nowhere else.
    expect(board.value.get("s2")?.map((t) => t.id)).toEqual(["a"]);
    expect(board.value.get("s1")?.map((t) => t.id)).toEqual(["b"]);
    expect(state.value.filter((t) => t.id === "a")).toHaveLength(1);
    expect(adapterMock.moveTask).toHaveBeenCalledWith({
      id: "a",
      targetStateId: "s2",
      prevTaskId: undefined,
      nextTaskId: undefined,
    });
  });

  it("sends the neighbors of the drop position", async () => {
    const tasks = [task("a", "s1", 1), task("b", "s2", 1), task("c", "s2", 2)];
    adapterMock.listTasks.mockResolvedValue(tasks);
    adapterMock.moveTask.mockImplementation(async (input: { id: string; targetStateId: string }) => ({
      ...task(input.id, input.targetStateId, 1),
    }));

    const { load, move } = useTasks();
    await load();

    await move({
      id: "a",
      targetStateId: "s2",
      index: 1,
      columnTasks: [task("b", "s2", 1), task("c", "s2", 2)],
    });

    expect(adapterMock.moveTask).toHaveBeenCalledWith({
      id: "a",
      targetStateId: "s2",
      prevTaskId: "b",
      nextTaskId: "c",
    });
  });

  it("restores the board when the move fails", async () => {
    const tasks = [task("a", "s1", 1)];
    adapterMock.listTasks.mockResolvedValue(tasks);
    adapterMock.moveTask.mockRejectedValue(new Error("boom"));

    const { load, move, board } = useTasks();
    await load();

    await expect(
      move({
        id: "a",
        targetStateId: "s2",
        index: 0,
        columnTasks: [],
      }),
    ).rejects.toThrow("boom");

    expect(board.value.get("s1")?.map((t) => t.id)).toEqual(["a"]);
    expect(board.value.get("s2")).toEqual([]);
  });

  it("creates a task in the first column when no column is given", async () => {
    adapterMock.createTask.mockImplementation(async (input: { title: string; stateId: string }) =>
      task("new", input.stateId, 1),
    );

    const { load, add } = useTasks();
    await load();

    await add({
      title: "Nueva",
      description: null,
      typeId: "t1",
      categoryId: null,
      clientId: null,
    });

    expect(adapterMock.createTask).toHaveBeenCalledWith(
      expect.objectContaining({ stateId: "s1" }),
    );
  });
});
