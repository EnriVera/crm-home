import { describe, expect, it } from "bun:test";
import { heartbeatTimerInputSchema } from "@crm/contract/schedule";
import { HeartbeatTimer } from "./heartbeat-timer";
import { TimerNotFound } from "./errors";
import type {
  TimerRunRepository,
  TimerRunRow,
} from "../../domain/ports/timer-run-repository";

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

function repo(current: TimerRunRow | null): {
  repository: TimerRunRepository;
  beats: { timerId: string; at: Date }[];
} {
  const beats: { timerId: string; at: Date }[] = [];
  const repository: TimerRunRepository = {
    lockUserTimers: async () => {},
    findOpen: async () => (current && current.end === null ? current : null),
    list: async () => [],
    findById: async () => current,
    insert: async () => current ?? run(),
    close: async (params) => ({ ...(current ?? run()), end: params.end }),
    heartbeat: async (params) => {
      beats.push({ timerId: params.timerId, at: params.at });
      return { ...(current ?? run()), lastHeartbeat: params.at };
    },
  };
  return { repository, beats };
}

describe("HeartbeatTimer", () => {
  it("guarda el latido con el reloj del servidor", async () => {
    const { repository, beats } = repo(run());
    const useCase = new HeartbeatTimer({
      timerRunRepository: repository,
      now: () => new Date("2026-06-28T10:00:00Z"),
    });

    await useCase.execute({ userId: "user-1", timerId: "timer-1" });

    expect(beats).toHaveLength(1);
    expect(beats[0]?.at).toEqual(new Date("2026-06-28T10:00:00Z"));
  });

  it("ignora el instante que declara el cliente", async () => {
    const { repository, beats } = repo(run());
    const useCase = new HeartbeatTimer({
      timerRunRepository: repository,
      now: () => new Date("2026-06-28T10:00:00Z"),
    });

    // Un cliente que manda su propio reloj (el campo ya no está en el
    // contrato): el caso de uso ignora el dato y usa el del servidor.
    const hostile = {
      userId: "user-1",
      timerId: "timer-1",
      at: new Date("2030-01-01T00:00:00Z"),
    };
    await useCase.execute(hostile);

    expect(beats[0]?.at).toEqual(new Date("2026-06-28T10:00:00Z"));
  });

  it("el contrato del latido no acepta un instante del cliente", () => {
    const parsed = heartbeatTimerInputSchema.parse({
      timer_id: "3f2504e0-4f89-11d3-9a0c-0305e82c3301",
      timer_at: "2030-01-01T00:00:00Z",
    });

    expect(parsed).toEqual({
      timer_id: "3f2504e0-4f89-11d3-9a0c-0305e82c3301",
    });
  });

  it("no toca una corrida ya cerrada", async () => {
    const closed = run({
      end: new Date("2026-06-28T10:00:00Z"),
      durationSeconds: 3600,
    });
    const { repository, beats } = repo(closed);
    const useCase = new HeartbeatTimer({ timerRunRepository: repository });

    const result = await useCase.execute({
      userId: "user-1",
      timerId: "timer-1",
    });

    expect(result).toBe(closed);
    expect(beats).toHaveLength(0);
  });

  it("falla si la corrida no existe", async () => {
    const { repository } = repo(null);
    const useCase = new HeartbeatTimer({ timerRunRepository: repository });

    await expect(
      useCase.execute({ userId: "user-1", timerId: "timer-1" }),
    ).rejects.toBeInstanceOf(TimerNotFound);
  });
});
