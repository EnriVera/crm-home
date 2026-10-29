import { describe, expect, it } from "bun:test";
import { GetCurrentTimer } from "./get-current-timer";
import type {
  TimerRunRepository,
  TimerRunRow,
} from "../../domain/ports/timer-run-repository";

const HOUR = 60 * 60 * 1000;

function run(overrides: Partial<TimerRunRow> = {}): TimerRunRow {
  return {
    id: "timer-1",
    userId: "user-1",
    title: "Auditoría",
    taskId: null,
    clientId: null,
    typeId: null,
    categoryId: null,
    start: new Date("2026-06-28T09:00:00Z"),
    end: null,
    durationSeconds: null,
    origin: "manual",
    lastHeartbeat: null,
    ...overrides,
  };
}

function repo(open: TimerRunRow | null): {
  repository: TimerRunRepository;
  closed: { timerId: string; end: Date }[];
} {
  const closed: { timerId: string; end: Date }[] = [];
  const repository: TimerRunRepository = {
    findOpen: async () => open,
    list: async () => [],
    findById: async () => open,
    insert: async () => open ?? run(),
    close: async (params) => {
      closed.push({ timerId: params.timerId, end: params.end });
      return { ...(open ?? run()), end: params.end };
    },
    heartbeat: async () => open ?? run(),
  };
  return { repository, closed };
}

describe("GetCurrentTimer", () => {
  it("returns the open run when it is fresh", async () => {
    const { repository, closed } = repo(run());
    const useCase = new GetCurrentTimer({
      timerRunRepository: repository,
      now: () => new Date("2026-06-28T10:00:00Z"),
    });

    const result = await useCase.execute({ userId: "user-1" });

    expect(result?.id).toBe("timer-1");
    expect(closed).toHaveLength(0);
  });

  it("returns null when there is no open run", async () => {
    const { repository } = repo(null);
    const useCase = new GetCurrentTimer({ timerRunRepository: repository });

    expect(await useCase.execute({ userId: "user-1" })).toBeNull();
  });

  it("closes an abandoned run at its last heartbeat", async () => {
    // Arrancó hace 20h; el último latido tiene 20h.
    const open = run({
      start: new Date("2026-06-28T09:00:00Z"),
      lastHeartbeat: new Date("2026-06-28T09:05:00Z"),
    });
    const { repository, closed } = repo(open);
    const useCase = new GetCurrentTimer({
      timerRunRepository: repository,
      now: () => new Date("2026-06-29T05:00:00Z"),
    });

    const result = await useCase.execute({ userId: "user-1" });

    expect(result?.end).toEqual(open.lastHeartbeat);
    expect(closed).toHaveLength(1);
    expect(closed[0]?.end).toEqual(open.lastHeartbeat);
  });

  it("keeps a run whose heartbeat is younger than 12h", async () => {
    const open = run({
      start: new Date("2026-06-28T09:00:00Z"),
      lastHeartbeat: new Date("2026-06-28T18:00:00Z"),
    });
    const { repository, closed } = repo(open);
    const useCase = new GetCurrentTimer({
      timerRunRepository: repository,
      now: () => new Date("2026-06-29T05:00:00Z"),
    });

    await useCase.execute({ userId: "user-1" });

    expect(closed).toHaveLength(0);
  });

  it("closes a run without heartbeat at start + 12h", async () => {
    const open = run({ start: new Date("2026-06-28T09:00:00Z") });
    const { repository, closed } = repo(open);
    const useCase = new GetCurrentTimer({
      timerRunRepository: repository,
      now: () => new Date("2026-06-29T09:00:00Z"),
    });

    await useCase.execute({ userId: "user-1" });

    expect(closed).toHaveLength(1);
    expect(closed[0]?.end.getTime()).toBe(
      new Date("2026-06-28T09:00:00Z").getTime() + 12 * HOUR,
    );
  });
});
