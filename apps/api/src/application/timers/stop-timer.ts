import type {
  TimerRunRepository,
  TimerRunRow,
} from "../../domain/ports/timer-run-repository";
import { MAX_TIMER_MS } from "../../domain/timers/limits";
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
 * Cierra la duración calculada desde el `start` (el reloj es del servidor: si
 * el browser se cerró, el tiempo no se pierde).
 *
 * La corrida que se cierra es la ABIERTA del usuario, no la que nombra el
 * `timer_id` recibido: el navegador puede estar desfasado (otra pestaña, otro
 * cliente o dos arranques solapados) y parar tiene que parar el timer que está
 * corriendo de verdad. El `timer_id` es sólo informativo: si no hay corrida
 * abierta, se devuelve la corrida direccionada tal cual (idempotente).
 */
export class StopTimer {
  constructor(private readonly deps: StopTimerDependencies) {}

  async execute(input: StopTimerInput): Promise<TimerRunRow> {
    const open = await this.deps.timerRunRepository.findOpen(input.userId);
    if (open) {
      const now = this.deps.now?.() ?? new Date();
      // El fin no pasa de las 12 hs desde el arranque: una corrida abandonada
      // factura como máximo el límite (mismo criterio que el auto-cierre y
      // que el cierre de la corrida anterior al arrancar otra).
      const end = new Date(
        Math.min(now.getTime(), open.start.getTime() + MAX_TIMER_MS),
      );
      return this.deps.timerRunRepository.close({
        userId: input.userId,
        timerId: open.id,
        end,
      });
    }

    const current = await this.deps.timerRunRepository.findById({
      userId: input.userId,
      timerId: input.timerId,
    });
    if (!current) {
      throw new TimerNotFound();
    }
    return current;
  }
}
