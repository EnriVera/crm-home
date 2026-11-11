import type {
  TimerRunRepository,
  TimerRunRow,
} from "../../domain/ports/timer-run-repository";
import { TimerNotFound } from "./errors";

export interface HeartbeatTimerInput {
  userId: string;
  timerId: string;
}

export interface HeartbeatTimerDependencies {
  timerRunRepository: TimerRunRepository;
  now?: () => Date;
}

/**
 * Caso de uso: heartbeat del timer corriendo.
 *
 * El frontend pinguea cada minuto mientras el timer corre; el `last_heartbeat`
 * sirve para saber que el timer sigue vivo (y para detectar timers
 * abandonados). PRD-v2 §8.4.
 *
 * El instante del latido lo decide el servidor, nunca el cliente: un latido
 * con reloj propio podría dejar la corrida viva más allá del límite de 12 hs
 * o cerrarla con una duración inventada.
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
      at: this.deps.now?.() ?? new Date(),
    });
  }
}
