import type { Transaction } from "./transaction";

/** Cómo arrancó la corrida: a mano o reanudando una del historial. */
export type TimerOrigin = "manual" | "resumed";

/**
 * Puerto del módulo /schedules → TIMER (PRD-v4 §8.5, PRD-v2 §8.4).
 *
 * El módulo `schedule` que ya existe es otro (reglas recurrentes de cobro,
 * migración 006). Este puerto es de las CORRIDAS del timer.
 *
 * Reglas de dominio que la API garantiza:
 * - A lo sumo una corrida abierta por usuario (índice parcial en la DB).
 * - La corrida abierta puede auto-cerrarse a las 12 horas (PRD-v2 §8.4).
 */
export interface TimerRunRow {
  id: string;
  userId: string;
  title: string;
  taskId: string | null;
  clientId: string | null;
  typeId: string | null;
  categoryId: string | null;
  start: Date;
  end: Date | null;
  durationSeconds: number | null;
  origin: TimerOrigin;
  lastHeartbeat: Date | null;
}

export interface TimerRunRepository {
  /**
   * Serializa los arranques de timer de un mismo usuario.
   *
   * "A lo sumo una corrida abierta por usuario" lo garantiza el índice
   * parcial único de la base, pero un arranque necesita *cerrar* la
   * corrida anterior y *abrir* la nueva: si dos arranques se cruzan,
   * ambos cierran la misma corrida y uno choca con el índice. Tomando
   * un lock de usuario antes de leer, los arranques del mismo usuario
   * se ejecutan uno detrás del otro (mismo resultado que en serie:
   * gana el último).
   *
   * El lock tiene que vivir en la transacción que lo usa: sin
   * transacción el lock se libera al terminar la llamada y la
   * serialización se pierde. Por eso la transacción es obligatoria.
   */
  lockUserTimers(userId: string, trx: Transaction): Promise<void>;

  /** La corrida abierta del usuario (end IS NULL), si hay. */
  findOpen(userId: string, trx?: Transaction): Promise<TimerRunRow | null>;

  /** Las corridas del usuario, de la más nueva a la más vieja. */
  list(
    params: {
      userId: string;
      from?: Date;
      to?: Date;
      typeId?: string;
      categoryId?: string;
      taskId?: string;
      search?: string;
      limit: number;
    },
    trx?: Transaction,
  ): Promise<TimerRunRow[]>;

  findById(
    params: { userId: string; timerId: string },
    trx?: Transaction,
  ): Promise<TimerRunRow | null>;

  insert(
    params: {
      userId: string;
      title: string;
      taskId: string | null;
      clientId: string | null;
      typeId: string | null;
      categoryId: string | null;
      start: Date;
      origin: TimerOrigin;
    },
    trx?: Transaction,
  ): Promise<TimerRunRow>;

  /** Cierra una corrida: end + duration (calculada desde el start). */
  close(
    params: { userId: string; timerId: string; end: Date },
    trx?: Transaction,
  ): Promise<TimerRunRow>;

  /** Registra el heartbeat de una corrida abierta. */
  heartbeat(
    params: { userId: string; timerId: string; at: Date },
    trx?: Transaction,
  ): Promise<TimerRunRow>;
}
