import type { Transaction } from "./transaction";

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
  origin: "manual" | "resumed";
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
   * El lock debe vivir en la transacción que lo usa: si la operación
   * falla, el lock se libera solo.
   */
  lockUserTimers(userId: string, trx?: Transaction): Promise<void>;

  /** The open run of the user (end IS NULL), if any. */
  findOpen(userId: string, trx?: Transaction): Promise<TimerRunRow | null>;

  /** The runs of the user, newest first, with the optional filters. */
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
      origin: "manual" | "resumed";
    },
    trx?: Transaction,
  ): Promise<TimerRunRow>;

  /** Closes a run: end + duration (computed from the start). */
  close(
    params: { userId: string; timerId: string; end: Date },
    trx?: Transaction,
  ): Promise<TimerRunRow>;

  /** Registers the heartbeat of a running timer. */
  heartbeat(
    params: { userId: string; timerId: string; at: Date },
    trx?: Transaction,
  ): Promise<TimerRunRow>;
}
