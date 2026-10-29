import type {
  TimerRunRepository,
  TimerRunRow,
} from "../../domain/ports/timer-run-repository";
import { TimerNotFound } from "./errors";

export interface HeartbeatTimerInput {
  userId: string;
  timerId: string;
  at?: Date;
}

export interface HeartbeatTimerDependencies {
  timerRunRepository: TimerRunRepository;
}

/**
 * Caso de uso: heartbeat del timer corriendo.
 *
 * El frontend pinguea cada minuto mientras el timer corre; el `last_heartbeat`
 * sirve para saber que el timer sigue vivo (y para detectar timers
 * abandonados). PRD-v2 §8.4.
 */
export class HeartbeatTimer {
  constructor(private readonly deps: HeartbeatTimerDependencies) {}

  async execute(input: HeartbeatTimerInput): Promise<TimerRunRow> {
    const current = await this.deps.timerRunRepository.findById({
      userId: input.userId,
      timerId: input.timerId,
    });
    if (!current) {
      throw new TimerNotFound();
    }
    if (current.end !== null) {
      return current;
    }

    return this.deps.timerRunRepository.heartbeat({
      userId: input.userId,
      timerId: input.timerId,
      at: input.at ?? new Date(),
    });
  }
}
