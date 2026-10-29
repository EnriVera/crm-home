import type {
  TimerRunRepository,
  TimerRunRow,
} from "../../domain/ports/timer-run-repository";

export interface ListTimerRunsInput {
  userId: string;
  from?: Date;
  to?: Date;
  typeId?: string;
  categoryId?: string;
  taskId?: string;
  search?: string;
  limit?: number;
}

export interface ListTimerRunsDependencies {
  timerRunRepository: TimerRunRepository;
}

/**
 * Caso de uso: el historial de timers (PRD-v4 §8.5).
 *
 * Filtros: rango de fechas, tipo, categoría, task y búsqueda por título.
 * Los timers sin tipo ni categoría se filtran sólo por los demás campos
 * (un timer libre tiene que poder filtrarse igual).
 */
export class ListTimerRuns {
  constructor(private readonly deps: ListTimerRunsDependencies) {}

  async execute(input: ListTimerRunsInput): Promise<TimerRunRow[]> {
    return this.deps.timerRunRepository.list({
      userId: input.userId,
      ...(input.from ? { from: input.from } : {}),
      ...(input.to ? { to: input.to } : {}),
      ...(input.typeId ? { typeId: input.typeId } : {}),
      ...(input.categoryId ? { categoryId: input.categoryId } : {}),
      ...(input.taskId ? { taskId: input.taskId } : {}),
      ...(input.search ? { search: input.search } : {}),
      limit: input.limit ?? 100,
    });
  }
}
