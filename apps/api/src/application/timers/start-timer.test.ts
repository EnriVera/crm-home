import { describe, expect, it } from "bun:test";
import { StartTimer } from "./start-timer";
import { InvalidTimerInput } from "./errors";
import { TimerAlreadyRunningError } from "../../domain/timers/errors";
import type {
  TimerRunRepository,
  TimerRunRow,
} from "../../domain/ports/timer-run-repository";
import type { TransactionManager } from "../../domain/ports/transaction-manager";

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
 * Repo en memoria con un contador de inserts: los primeros `failInserts`
 * launches fallan con el error que la base devolvería cuando el índice
 * parcial único rechaza la corrida (otro arranque simultáneo ganó).
 */
function repo(options: {
  open: TimerRunRow | null;
  failInserts?: number;
}): {
  repository: TimerRunRepository;
  closed: string[];
  state: { inserts: number };
} {
  const closed: string[] = [];
  const state = { inserts: 0 };
  let remainingFailures = options.failInserts ?? 0;

  const repository: TimerRunRepository = {
    async lockUserTimers() {
      // El lock real serializa los arranques; el fake no lo necesita.
    },
    async findOpen() {
      return options.open;
    },
    async list() {
      return [];
    },
    async findById() {
      return null;
    },
    async insert() {
      state.inserts += 1;
      if (remainingFailures > 0) {
        remainingFailures -= 1;
        throw new TimerAlreadyRunningError();
      }
      return run({ id: `timer-${state.inserts}` });
    },
    async close(params) {
      closed.push(params.timerId);
      return run({ id: params.timerId, end: params.end });
    },
    async heartbeat() {
      return run();
    },
  };

  return { repository, closed, state };
}

const transactionManager: TransactionManager = {
  async run<T>(work: (trx: Record<string, never>) => Promise<T>): Promise<T> {
    return work({});
  },
};

describe("StartTimer", () => {
  it("rechaza un título vacío o de espacios", async () => {
    const { repository } = repo({ open: null });
    const useCase = new StartTimer({ timerRunRepository: repository, transactionManager });

    await expect(
      useCase.execute({
        userId: "user-1",
        title: "   ",
        taskId: null,
        clientId: null,
        typeId: null,
        categoryId: null,
      }),
    ).rejects.toBeInstanceOf(InvalidTimerInput);
  });

  it("cierra la corrida abierta antes de abrir la nueva", async () => {
    const { repository, closed } = repo({ open: run({ id: "vieja" }) });
    const useCase = new StartTimer({ timerRunRepository: repository, transactionManager });

    await useCase.execute({
      userId: "user-1",
      title: "Nueva",
      taskId: null,
      clientId: null,
      typeId: null,
      categoryId: null,
    });

    expect(closed).toEqual(["vieja"]);
  });

  it("reintenta cuando la base rechaza el insert por la carrera", async () => {
    // Otro arranque simultáneo ganó: el primer insert choca con el
    // índice único y el caso de uso reintenta hasta poder abrir la suya.
    const { repository, state } = repo({ open: null, failInserts: 1 });
    const useCase = new StartTimer({ timerRunRepository: repository, transactionManager });

    const started = await useCase.execute({
      userId: "user-1",
      title: "Carrera",
      taskId: null,
      clientId: null,
      typeId: null,
      categoryId: null,
    });

    expect(state.inserts).toBe(2);
    expect(started.id).toBe("timer-2");
  });

  it("propaga el conflicto si la carrera persiste", async () => {
    const { repository } = repo({ open: null, failInserts: 99 });
    const useCase = new StartTimer({ timerRunRepository: repository, transactionManager });

    await expect(
      useCase.execute({
        userId: "user-1",
        title: "Carrera",
        taskId: null,
        clientId: null,
        typeId: null,
        categoryId: null,
      }),
    ).rejects.toBeInstanceOf(TimerAlreadyRunningError);
  });
});
