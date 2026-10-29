import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { TimerRun } from "~/domain/schedule/entities";

const getCurrentTimer = vi.fn();
const listTimerRuns = vi.fn();
const startTimer = vi.fn();
const stopTimer = vi.fn();
const heartbeatTimer = vi.fn();

vi.mock("~/infrastructure/schedule/orpc-timer", () => ({
  getCurrentTimer: () => getCurrentTimer(),
  heartbeatTimer: () => heartbeatTimer(),
  listTimerRuns: (params: unknown) => listTimerRuns(params),
  startTimer: (params: unknown) => startTimer(params),
  stopTimer: (id: string) => stopTimer(id),
}));

const { useTimer } = await import("~/shared/composables/use-timer");

function run(overrides: Partial<TimerRun> = {}): TimerRun {
  return {
    id: "t1",
    title: "Diseño",
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

describe("useTimer: respuestas fuera de orden", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    getCurrentTimer.mockReset();
    listTimerRuns.mockReset();
    startTimer.mockReset();
    stopTimer.mockReset();
    heartbeatTimer.mockReset();
    listTimerRuns.mockResolvedValue([]);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("un sync tardío no borra un timer recién arrancado", async () => {
    // El sync se dispara al abrir la pantalla y su respuesta llega
    // después de que el usuario arrancó un timer: si el sync gains,
    // la UI mostraría "sin timer" con el server corriendo.
    const current = Promise.withResolvers<TimerRun | null>();
    getCurrentTimer.mockReturnValue(current.promise);
    startTimer.mockResolvedValue(run({ id: "nueva" }));

    const timer = useTimer();
    const syncing = timer.sync();
    await timer.start({ title: "Diseño" });
    expect(timer.run.value?.id).toBe("nueva");

    // El sync vuelve con "no hay timer": es una respuesta vieja.
    current.resolve(null);
    await syncing;

    expect(timer.run.value?.id).toBe("nueva");
  });

  it("un sync tardío no resucita un timer ya parado", async () => {
    const current = Promise.withResolvers<TimerRun | null>();
    getCurrentTimer.mockResolvedValueOnce(run({ id: "t1" }));
    stopTimer.mockResolvedValue(
      run({ id: "t1", end: new Date(), durationSeconds: 10 }),
    );

    const timer = useTimer();
    // El primer sync deja el timer corriendo.
    await timer.sync();
    expect(timer.run.value?.id).toBe("t1");

    // El segundo sync se queda en el aire y el usuario para el timer.
    getCurrentTimer.mockReturnValue(current.promise);
    const syncing = timer.sync();
    await timer.stop();
    expect(timer.run.value).toBeNull();

    // El sync vuelve con la corrida que ya estaba cerrada.
    current.resolve(run({ id: "t1" }));
    await syncing;

    expect(timer.run.value).toBeNull();
  });

  it("el error de un sync viejo no pisa el estado", async () => {
    const current = Promise.withResolvers<TimerRun | null>();
    getCurrentTimer.mockReturnValue(current.promise);
    startTimer.mockResolvedValue(run({ id: "nueva" }));

    const timer = useTimer();
    const syncing = timer.sync();
    await timer.start({ title: "Diseño" });

    current.reject(new Error("boom"));
    await syncing;

    expect(timer.error.value).toBeNull();
    expect(timer.run.value?.id).toBe("nueva");
  });
});
