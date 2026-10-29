import { describe, expect, it } from "vitest";
import {
  filterRuns,
  groupByDay,
  groupByType,
  type TimerRun,
} from "~/domain/schedule/entities";

function run(overrides: Partial<TimerRun> = {}): TimerRun {
  return {
    id: "r1",
    title: "Auditoría web",
    taskId: null,
    clientId: null,
    typeId: null,
    categoryId: null,
    start: new Date("2026-06-28T09:00:00"),
    end: new Date("2026-06-28T10:00:00"),
    durationSeconds: 3600,
    origin: "manual",
    lastHeartbeat: null,
    ...overrides,
  };
}

describe("groupByType", () => {
  it("sums the time of each type", () => {
    const now = new Date("2026-06-28T23:00:00");
    const runs = [
      run({ id: "a", typeId: "t1", end: new Date("2026-06-28T10:00:00") }),
      run({
        id: "b",
        typeId: "t1",
        start: new Date("2026-06-28T11:00:00"),
        end: new Date("2026-06-28T11:30:00"),
      }),
    ];
    const groups = groupByType(runs, new Map([["t1", "Diseño"]]), now);
    expect(groups).toHaveLength(1);
    expect(groups[0]?.label).toBe("Diseño");
    expect(groups[0]?.seconds).toBe(5400);
  });

  it("puts the free timers in their own slice", () => {
    const now = new Date("2026-06-28T23:00:00");
    const groups = groupByType([run({ typeId: null })], new Map(), now);
    expect(groups[0]?.id).toBe("");
    expect(groups[0]?.label).toBe("Sin tipo");
  });

  it("sorts the slices by time", () => {
    const now = new Date("2026-06-28T23:00:00");
    const runs = [
      run({
        id: "a",
        typeId: "t1",
        start: new Date("2026-06-28T09:00:00"),
        end: new Date("2026-06-28T09:10:00"),
      }),
      run({
        id: "b",
        typeId: "t2",
        start: new Date("2026-06-28T10:00:00"),
        end: new Date("2026-06-28T12:00:00"),
      }),
    ];
    const groups = groupByType(runs, new Map([["t2", "Marketing"]]), now);
    expect(groups.map((g) => g.label)).toEqual(["Marketing", "Sin tipo"]);
  });
});

describe("filterRuns", () => {
  const runs = [
    run({ id: "a", title: "Auditoría web", typeId: "t1", categoryId: "k1" }),
    run({ id: "b", title: "Diseño", typeId: "t2", categoryId: null }),
  ];

  it("filters by type", () => {
    expect(filterRuns(runs, { typeId: "t1" }).map((r) => r.id)).toEqual(["a"]);
  });

  it("filters by category", () => {
    expect(filterRuns(runs, { categoryId: "k1" }).map((r) => r.id)).toEqual(["a"]);
  });

  it("filters by title", () => {
    expect(filterRuns(runs, { search: "dise" }).map((r) => r.id)).toEqual(["b"]);
  });

  it("combines the filters", () => {
    expect(
      filterRuns(runs, { typeId: "t1", search: "dise" }),
    ).toEqual([]);
  });
});

describe("groupByDay", () => {
  it("groups the runs by day, newest first", () => {
    const groups = groupByDay([
      run({ id: "a", start: new Date("2026-06-27T09:00:00") }),
      run({ id: "b", start: new Date("2026-06-28T09:00:00") }),
      run({ id: "c", start: new Date("2026-06-28T11:00:00") }),
    ]);
    expect(groups).toHaveLength(2);
    expect(groups[0]?.day).toBe("2026-06-28");
    expect(groups[0]?.runs).toHaveLength(2);
    expect(groups[1]?.day).toBe("2026-06-27");
  });
});
