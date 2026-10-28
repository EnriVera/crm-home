import { describe, expect, it } from "vitest";
import {
  buildDashboardSnapshot,
  RECENT_TASKS_LIMIT,
  stateNameOf,
  type TaskState,
  type TaskSummary,
} from "~/domain/task/dashboard";

const states: TaskState[] = [
  { id: "s1", name: "Pendiente", order: 1 },
  { id: "s2", name: "En progreso", order: 2 },
  { id: "s3", name: "Completado", order: 3 },
];

function task(id: string, stateId: string, updatedAt: string): TaskSummary {
  return { id, title: `Tarea ${id}`, stateId, updatedAt: new Date(updatedAt) };
}

describe("buildDashboardSnapshot", () => {
  it("counts the tasks of every column, in column order", () => {
    const snapshot = buildDashboardSnapshot(
      [
        task("a", "s1", "2026-06-01T10:00:00.000Z"),
        task("b", "s2", "2026-06-02T10:00:00.000Z"),
        task("c", "s2", "2026-06-03T10:00:00.000Z"),
      ],
      states,
    );

    expect(snapshot.tallies.map((t) => [t.state.name, t.count])).toEqual([
      ["Pendiente", 1],
      ["En progreso", 2],
      ["Completado", 0],
    ]);
    expect(snapshot.totalTasks).toBe(3);
  });

  it("keeps the five most recently updated tasks, newest first", () => {
    const tasks = Array.from({ length: 7 }, (_, index) =>
      task(
        String(index),
        "s1",
        `2026-06-0${index + 1}T10:00:00.000Z`,
      ),
    );

    const snapshot = buildDashboardSnapshot(tasks, states);

    expect(snapshot.recentTasks).toHaveLength(RECENT_TASKS_LIMIT);
    expect(snapshot.recentTasks.map((t) => t.id)).toEqual([
      "6",
      "5",
      "4",
      "3",
      "2",
    ]);
  });

  it("returns an empty snapshot when the user has no tasks", () => {
    const snapshot = buildDashboardSnapshot([], states);

    expect(snapshot.totalTasks).toBe(0);
    expect(snapshot.recentTasks).toEqual([]);
    // The columns still show, with a zero count each: the state names come
    // from the user's own configuration, not from the tasks.
    expect(snapshot.tallies).toHaveLength(3);
    expect(snapshot.tallies.every((t) => t.count === 0)).toBe(true);
  });

  it("ignores the tasks of a column the user deleted", () => {
    const snapshot = buildDashboardSnapshot(
      [task("a", "s9", "2026-06-01T10:00:00.000Z")],
      states,
    );

    // The task is still counted (it belongs to the user), but no column shows
    // it: the deleted column is not part of the current configuration.
    expect(snapshot.totalTasks).toBe(1);
    expect(snapshot.tallies.map((t) => t.count)).toEqual([0, 0, 0]);
  });
});

describe("stateNameOf", () => {
  it("finds the column name of a task", () => {
    expect(stateNameOf(states, "s2")).toBe("En progreso");
  });

  it("returns undefined for an unknown column", () => {
    expect(stateNameOf(states, "nope")).toBeUndefined();
  });
});
