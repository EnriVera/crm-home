import { describe, expect, it } from "bun:test";
import { StopTimer } from "./stop-timer";
import { TimerNotFound } from "./errors";
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

/**
 * Repo en memoria: la corrida abierta (`open`) y la que el cliente pide
 * (`addressed`) pueden ser distintas, que es el caso del navegador
 * desfasado (otra pestaña arrancó otra corrida).
 */
function repo(options: {
  open: TimerRunRow | null;
  addressed?: TimerRunRow | null;
}): {
  repository: TimerRunRepository;
  closed: { timerId: string; end: Date }[];
} {
  const closed: { timerId: string; end: Date }[] = [];
  const repository: TimerRunRepository = {
    lockUserTimers: async () => {},
    findOpen: async () => options.open,
    list: async () => [],
    findById: async () => options.addressed ?? null,
    insert: async () => run(),
    close: async (params) => {
      closed.push({ timerId: params.timerId, end: params.end });
      return { ...(options.open ?? run()), end: params.end };
    },
    heartbeat: async () => options.open ?? run(),
  };
  return { repository, closed };
}

describe("StopTimer", () => {
  it("cierra la corrida abierta aunque el id pedido sea de otra", async () => {
    // El navegador espeja una corrida que ya está cerrada; la del servidor
    // es otra: parar tiene que parar la que está corriendo de verdad.
    const open = run({ id: "timer-2" });
    const { repository, closed } = repo({
      open,
      addressed: run({
        id: "timer-1",
        end: new Date("2026-06-28T09:30:00Z"),
        durationSeconds: 1800,
      }),
    });
    const useCase = new StopTimer({
      timerRunRepository: repository,
      now: () => new Date("2026-06-28T10:00:00Z"),
    });

    const result = await useCase.execute({
      userId: "user-1",
      timerId: "timer-1",
    });

    expect(closed).toHaveLength(1);
    expect(closed[0]?.timerId).toBe("timer-2");
    expect(result.id).toBe("timer-2");
    expect(result.end).toEqual(new Date("2026-06-28T10:00:00Z"));
  });

  it("devuelve la corrida pedida sin tocarla si no hay ninguna abierta", async () => {
    const addressed = run({
      id: "timer-1",
      end: new Date("2026-06-28T09:30:00Z"),
      durationSeconds: 1800,
    });
    const { repository, closed } = repo({ open: null, addressed });
    const useCase = new StopTimer({ timerRunRepository: repository });

    const result = await useCase.execute({
      userId: "user-1",
      timerId: "timer-1",
    });

    expect(result).toBe(addressed);
    expect(closed).toHaveLength(0);
  });

  it("falla si no hay corrida abierta ni la pedida", async () => {
    const { repository } = repo({ open: null, addressed: null });
    const useCase = new StopTimer({ timerRunRepository: repository });

    await expect(
      useCase.execute({ userId: "user-1", timerId: "timer-1" }),
    ).rejects.toBeInstanceOf(TimerNotFound);
  });

  it("no registra una duración mayor a 12 hs", async () => {
    // Una corrida abierta hace 20 hs (nadie la cerró): el tope de 12 hs
    // del dominio limita lo que se factura.
    const open = run({
      id: "timer-2",
      start: new Date("2026-06-27T14:00:00Z"),
      lastHeartbeat: new Date("2026-06-27T15:00:00Z"),
    });
    const { repository, closed } = repo({ open });
    const useCase = new StopTimer({
      timerRunRepository: repository,
      now: () => new Date("2026-06-28T10:00:00Z"),
    });

    await useCase.execute({ userId: "user-1", timerId: "timer-2" });

    expect(closed[0]?.end).toEqual(new Date("2026-06-28T02:00:00Z"));
    const durationSeconds =
      (closed[0]!.end.getTime() - open.start.getTime()) / 1000;
    expect(durationSeconds).toBeLessThanOrEqual((12 * HOUR) / 1000);
  });
});
