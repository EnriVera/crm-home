import type {
  TimerRunRepository,
  TimerRunRow,
} from "../../domain/ports/timer-run-repository";
import { MAX_TIMER_MS } from "./start-timer";

export interface GetCurrentTimerInput {
  userId: string;
}

export interface GetCurrentTimerDependencies {
  timerRunRepository: TimerRunRepository;
  now?: () => Date;
}

/**
 * Caso de uso: el timer que está corriendo ahora (o null).
 *
 * Auto-cierre de 12 horas (PRD-v2 §8.4): si la corrida abierta empezó hace
 * más de 12 horas, se cierra acá (con la duración hasta ese límite) y se
 * devuelve null — el timer no puede quedar abierto para siempre.
 *
 * También resuelve el criterio "cerrar el browser con timer corriendo y
 * volver: el tiempo no se pierde": el `start` es del servidor, así que el
 * tiempo transcurrido se recalcula desde ahí.
 */
export class GetCurrentTimer {
  constructor(private readonly deps: GetCurrentTimerDependencies) {}

  async execute(input: GetCurrentTimerInput): Promise<TimerRunRow | null> {
    const open = await this.deps.timerRunRepository.findOpen(input.userId);
    if (!open) return null;

    const now = this.deps.now?.() ?? new Date();
    const elapsed = now.getTime() - open.start.getTime();
    if (elapsed < MAX_TIMER_MS) {
      return open;
    }

    // Pasó el límite: se cierra en el límite (12h exactas).
    const end = new Date(open.start.getTime() + MAX_TIMER_MS);
    return this.deps.timerRunRepository.close({
      userId: input.userId,
      timerId: open.id,
      end,
    });
  }
}
