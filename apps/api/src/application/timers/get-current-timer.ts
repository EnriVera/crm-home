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
 * Auto-cierre de 12 horas (PRD-v2 §8.4): si la corrida abierta quedó
 * abandonada (su último latido tiene más de 12 horas) se cierra EN SU
 * ÚLTIMO LATIDO, no en start + 12h: el tiempo que el usuario estuvo
 * realmente con la pantalla abierta es el que se factura, y el resto se
 * ajusta a mano en la próxima sesión.
 *
 * Si nunca hubo latido (el browser se cerró al arrancar), se cierra en
 * start + 12h.
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
    const limit = MAX_TIMER_MS;

    if (open.lastHeartbeat) {
      const sinceHeartbeat = now.getTime() - open.lastHeartbeat.getTime();
      if (sinceHeartbeat <= limit) {
        return open;
      }
      // Abandonada: se cierra en el último latido.
      return this.deps.timerRunRepository.close({
        userId: input.userId,
        timerId: open.id,
        end: open.lastHeartbeat,
      });
    }

    const elapsed = now.getTime() - open.start.getTime();
    if (elapsed <= limit) {
      return open;
    }
    // Sin latidos: se cierra en el límite (12h desde el arranque).
    return this.deps.timerRunRepository.close({
      userId: input.userId,
      timerId: open.id,
      end: new Date(open.start.getTime() + limit),
    });
  }
}
