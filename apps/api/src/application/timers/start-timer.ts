import type {
  TimerRunRepository,
  TimerRunRow,
} from "../../domain/ports/timer-run-repository";

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
 */
export class StartTimer {
  constructor(private readonly deps: StartTimerDependencies) {}

  async execute(input: StartTimerInput): Promise<TimerRunRow> {
    const title = input.title.trim();
    if (title.length === 0 || title.length > 255) {
      throw new Error("timer title must be 1-255 chars");
    }

    const now = this.deps.now?.() ?? new Date();
    const open = await this.deps.timerRunRepository.findOpen(input.userId);
    if (open) {
      await this.deps.timerRunRepository.close({
        userId: input.userId,
        timerId: open.id,
        end: now,
      });
    }

    return this.deps.timerRunRepository.insert({
      userId: input.userId,
      title,
      taskId: input.taskId,
      clientId: input.clientId,
      typeId: input.typeId,
      categoryId: input.categoryId,
      start: now,
      origin: input.origin ?? "manual",
    });
  }
}
