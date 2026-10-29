import type {
  TimerRunRepository,
  TimerRunRow,
} from "../../domain/ports/timer-run-repository";
import { TimerNotFound } from "./errors";

export interface StopTimerInput {
  userId: string;
  timerId: string;
}

export interface StopTimerDependencies {
  timerRunRepository: TimerRunRepository;
  now?: () => Date;
}

/**
 * Caso de uso: parar el timer.
 *
 * Cierra la corrida con la duración calculada desde el `start` (el reloj es
 * del servidor: si el browser se cerró, el tiempo no se pierde).
 */
export class StopTimer {
  constructor(private readonly deps: StopTimerDependencies) {}

  async execute(input: StopTimerInput): Promise<TimerRunRow> {
    const current = await this.deps.timerRunRepository.findById({
      userId: input.userId,
      timerId: input.timerId,
    });
    if (!current) {
      throw new TimerNotFound();
    }
    if (current.end !== null) {
      // Ya estaba cerrado: devolverla sin tocar (idempotente).
      return current;
    }

    const end = this.deps.now?.() ?? new Date();
    return this.deps.timerRunRepository.close({
      userId: input.userId,
      timerId: input.timerId,
      end,
    });
  }
}
