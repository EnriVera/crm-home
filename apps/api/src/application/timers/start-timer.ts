import type {
  TimerRunRepository,
  TimerRunRow,
} from "../../domain/ports/timer-run-repository";
import type { TransactionManager } from "../../domain/ports/transaction-manager";
import { TimerAlreadyRunningError } from "../../domain/timers/errors";
import { InvalidTimerInput } from "./errors";

/** El timer se auto-cierra a las 12 horas (PRD-v2 §8.4). */
export const MAX_TIMER_MS = 12 * 60 * 60 * 1000;

export interface StartTimerInput {
  userId: string;
  title: string;
  taskId: string | null;
  clientId: string | null;
  typeId: string | null;
  categoryId: string | null;
  /** Reanuda una corrida del historial (origin 'resumed'). */
  origin?: "manual" | "resumed";
}

export interface StartTimerDependencies {
  timerRunRepository: TimerRunRepository;
  transactionManager: TransactionManager;
  now?: () => Date;
}

/**
 * Caso de uso: arrancar el timer.
 *
 * Reglas (PRD-v2 §8.4):
 * - Un timer libre se guarda sin tarea, cliente, tipo ni categoría.
 * - Solo hay UN timer abierto: si había uno corriendo, se cierra (con su
 *   duración) antes de abrir el nuevo.
 * - El título es obligatorio (el de la task, o uno libre).
 *
 * El "cerrar el anterior y abrir el nuevo" corre dentro de una transacción:
 * sin ella, dos arranques concurrentes (doble click, dos tabs) podían
 * dejar dos corridas abiertas. El índice parcial único de la migración 009
 * es la garantía final de "una sola corrida abierta por usuario".
 *
 * Cuando la base rechaza el insert por ese índice, el arranque
 * reintenta: en el reintento ya ve la corrida que ganó la carrera y la
 * cierra antes de abrir la suya. El resultado es el mismo que con
 * arranques secuenciales (gana el último) y el usuario no ve un 500 por
 * un doble click.
 */
export class StartTimer {
  constructor(private readonly deps: StartTimerDependencies) {}

  async execute(input: StartTimerInput): Promise<TimerRunRow> {
    const title = input.title.trim();
    if (title.length === 0 || title.length > 255) {
      throw new InvalidTimerInput("timer title must be 1-255 chars");
    }

    const now = this.deps.now?.() ?? new Date();
    let lastError: unknown = null;
    // 3 intentos cubren la carrera de un doble click (2 requests) con
    // margen: cada reintento cierra la corrida que quedó abierta.
    for (let attempt = 0; attempt < 3; attempt += 1) {
      try {
        return await this.deps.transactionManager.run(async (trx) => {
          // Serializa los arranques del mismo usuario: el que entra
          // segundo ve la corrida que abrió el primero y la cierra
          // antes de abrir la suya (igual que en serie).
          await this.deps.timerRunRepository.lockUserTimers(
            input.userId,
            trx,
          );
          const open = await this.deps.timerRunRepository.findOpen(
            input.userId,
            trx,
          );
          if (open) {
            await this.deps.timerRunRepository.close(
              {
                userId: input.userId,
                timerId: open.id,
                end: now,
              },
              trx,
            );
          }

          return this.deps.timerRunRepository.insert(
            {
              userId: input.userId,
              title,
              taskId: input.taskId,
              clientId: input.clientId,
              typeId: input.typeId,
              categoryId: input.categoryId,
              start: now,
              origin: input.origin ?? "manual",
            },
            trx,
          );
        });
      } catch (err) {
        if (!(err instanceof TimerAlreadyRunningError)) throw err;
        lastError = err;
      }
    }
    throw lastError instanceof Error
      ? lastError
      : new TimerAlreadyRunningError();
  }
}
