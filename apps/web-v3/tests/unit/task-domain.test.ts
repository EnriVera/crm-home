import { describe, expect, it } from "vitest";
import {
  filterTasks,
  moveNeighbors,
  sortColumns,
  tasksByColumn,
  type Task,
  type TaskColumn,
} from "~/domain/task/entities";

function task(id: string, overrides: Partial<Task> = {}): Task {
  return {
    id,
    title: `Tarea ${id}`,
    description: null,
    stateId: "s1",
    typeId: null,
    categoryId: null,
    clientId: null,
    kanbanOrder: 1,
    createdAt: new Date("2026-06-01T10:00:00.000Z"),
    updatedAt: new Date("2026-06-01T10:00:00.000Z"),
    ...overrides,
  };
}

const columns: TaskColumn[] = [
  { id: "s1", name: "Pendiente", order: 1 },
  { id: "s2", name: "En progreso", order: 2 },
];

describe("tasksByColumn", () => {
  it("groups the tasks by column, ordered by kanban order", () => {
    const tasks = [
      task("a", { stateId: "s1", kanbanOrder: 2 }),
      task("b", { stateId: "s1", kanbanOrder: 1 }),
      task("c", { stateId: "s2", kanbanOrder: 5 }),
    ];

    const board = tasksByColumn(tasks, columns);

    expect(board.get("s1")?.map((t) => t.id)).toEqual(["b", "a"]);
    expect(board.get("s2")?.map((t) => t.id)).toEqual(["c"]);
  });

  it("keeps every column present even when empty", () => {
    const board = tasksByColumn([], columns);
    expect(board.get("s1")).toEqual([]);
    expect(board.get("s2")).toEqual([]);
  });

  it("puts tasks of an unknown column in the null bucket", () => {
    const board = tasksByColumn([task("x", { stateId: "gone" })], columns);
    expect(board.get("s1")).toEqual([]);
    expect(board.get(null)?.map((t) => t.id)).toEqual(["x"]);
  });
});

describe("moveNeighbors", () => {
  const column = [task("a"), task("b"), task("c")];

  it("returns the task above and below the drop position", () => {
    expect(moveNeighbors(column, 1)).toEqual({
      prevTaskId: "a",
      nextTaskId: "b",
    });
  });

  it("omits prev when the task lands first", () => {
    expect(moveNeighbors(column, 0)).toEqual({ nextTaskId: "a" });
  });

  it("omits next when the task lands last (append to the column)", () => {
    expect(moveNeighbors(column, 3)).toEqual({ prevTaskId: "c" });
  });
});

describe("filterTasks", () => {
  it("matches the title, case-insensitive", () => {
    const tasks = [task("a", { title: "Rediseño web" }), task("b", { title: "Informe" })];
    expect(filterTasks(tasks, "REDISE").map((t) => t.id)).toEqual(["a"]);
    expect(filterTasks(tasks, "  ").length).toBe(2);
    expect(filterTasks(tasks, "zzz")).toEqual([]);
  });
});

describe("sortColumns", () => {
  it("sorts by order and then by name", () => {
    const unsorted = [
      { id: "b", name: "B", order: 2 },
      { id: "a", name: "A", order: 1 },
      { id: "c", name: "C", order: 2 },
    ];
    expect(sortColumns(unsorted).map((c) => c.id)).toEqual(["a", "b", "c"]);
  });
});
