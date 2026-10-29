import { describe, expect, it } from "vitest";
import {
  elapsedSeconds,
  formatClock,
  formatDay,
  formatDuration,
  formatTimeRange,
  longestRun,
  startOfDay,
  startOfWeek,
  totalSeconds,
  type TimerRun,
} from "~/domain/schedule/entities";

function run(overrides: Partial<TimerRun> = {}): TimerRun {
  return {
    id: "t1",
    title: "Rediseño sección precios",
    taskId: null,
    clientId: null,
    typeId: null,
    categoryId: null,
    start: new Date("2026-06-28T09:12:00"),
    end: null,
    durationSeconds: null,
    origin: "manual",
    lastHeartbeat: null,
    ...overrides,
  };
}

describe("elapsedSeconds", () => {
  it("counts from the server start while the run is open", () => {
    const open = run({ start: new Date("2026-06-28T09:00:00") });
    const now = new Date("2026-06-28T10:30:00");
    expect(elapsedSeconds(open, now)).toBe(5400);
  });

  it("returns the stored duration for a closed run", () => {
    const closed = run({
      end: new Date("2026-06-28T10:00:00"),
      durationSeconds: 3600,
    });
    expect(elapsedSeconds(closed, new Date("2026-06-28T12:00:00"))).toBe(3600);
  });

  it("never goes negative", () => {
    const future = run({ start: new Date("2026-06-28T12:00:00") });
    expect(elapsedSeconds(future, new Date("2026-06-28T09:00:00"))).toBe(0);
  });
});

describe("formatDuration", () => {
  it("formats hours and minutes", () => {
    expect(formatDuration(4 * 3600 + 35 * 60)).toBe("4h 35m");
  });

  it("formats minutes and seconds", () => {
    expect(formatDuration(98 * 60 + 20)).toBe("1h 38m");
    expect(formatDuration(42 * 60)).toBe("42m 00s");
  });

  it("formats seconds when asked", () => {
    expect(formatDuration(9, true)).toBe("9s");
  });
});

describe("formatClock / formatDay / formatTimeRange", () => {
  it("formats the clock", () => {
    expect(formatClock(new Date("2026-06-28T09:05:00"))).toBe("09:05");
  });

  it("formats the day", () => {
    expect(formatDay(new Date("2026-06-28T09:05:00"))).toBe("28 jun");
  });

  it("formats the range of a closed run", () => {
    const closed = run({
      start: new Date("2026-06-28T09:12:00"),
      end: new Date("2026-06-28T10:50:00"),
    });
    expect(formatTimeRange(closed)).toBe("09:12 – 10:50");
  });

  it("formats only the start for an open run", () => {
    expect(formatTimeRange(run())).toBe("09:12");
  });
});

describe("totalSeconds", () => {
  const now = new Date("2026-06-28T23:00:00");

  it("sums the runs inside the period", () => {
    const runs = [
      run({
        start: new Date("2026-06-28T09:00:00"),
        end: new Date("2026-06-28T10:00:00"),
        durationSeconds: 3600,
      }),
      run({
        start: new Date("2026-06-28T11:00:00"),
        end: new Date("2026-06-28T11:30:00"),
        durationSeconds: 1800,
      }),
    ];
    expect(
      totalSeconds(runs, startOfDay(now), now, now),
    ).toBe(5400);
  });

  it("counts only the part of a run that falls inside the period", () => {
    // Empezó ayer y sigue abierto: sólo cuenta la parte de hoy.
    const crossing = run({
      start: new Date("2026-06-27T22:00:00"),
      end: null,
    });
    const total = totalSeconds([crossing], startOfDay(now), now, now);
    expect(total).toBe(23 * 3600);
  });

  it("ignores runs outside the period", () => {
    const old = run({
      start: new Date("2026-06-01T09:00:00"),
      end: new Date("2026-06-01T10:00:00"),
      durationSeconds: 3600,
    });
    expect(totalSeconds([old], startOfDay(now), now, now)).toBe(0);
  });
});

describe("longestRun", () => {
  it("picks the run with the most hours in the period", () => {
    const now = new Date("2026-06-28T23:00:00");
    const runs = [
      run({
        id: "a",
        start: new Date("2026-06-28T09:00:00"),
        end: new Date("2026-06-28T10:00:00"),
        durationSeconds: 3600,
      }),
      run({
        id: "b",
        start: new Date("2026-06-28T11:00:00"),
        end: new Date("2026-06-28T19:00:00"),
        durationSeconds: 8 * 3600,
      }),
    ];
    expect(longestRun(runs, startOfWeek(now), now, now)?.id).toBe("b");
  });

  it("returns null with no runs", () => {
    const now = new Date("2026-06-28T23:00:00");
    expect(longestRun([], startOfWeek(now), now, now)).toBeNull();
  });
});

describe("startOfDay / startOfWeek", () => {
  it("starts the day at midnight", () => {
    const start = startOfDay(new Date("2026-06-28T15:30:00"));
    expect(start.getHours()).toBe(0);
    expect(start.getDate()).toBe(28);
  });

  it("starts the week on Monday", () => {
    // 2026-06-28 es domingo: la semana arranca el 22 (lunes).
    const start = startOfWeek(new Date("2026-06-28T15:30:00"));
    expect(start.getDate()).toBe(22);
    expect(start.getHours()).toBe(0);
  });
});
