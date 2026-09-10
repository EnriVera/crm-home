import type { Clock } from "../../domain/ports/clock";
import type { IdGenerator } from "../../domain/ports/id-generator";
import type { TaskStateRepository } from "../../domain/ports/task-state-repository";
import type { TaskStateRow } from "../../domain/tasks/types";

export interface CreateTaskStateInput {
  userId: string;
  name: string;
}

export interface CreateTaskStateDependencies {
  taskStateRepository: TaskStateRepository;
  idGenerator: IdGenerator;
  clock: Clock;
}

/**
 * Caso de uso: crear una columna nueva al final del kanban del usuario.
 * `order` se asigna como max + 1 (no múltiplos de KANBAN_DEFAULT_STEP — la
 * escala kanban no aplica a columnas).
 */
export class CreateTaskState {
  constructor(private readonly deps: CreateTaskStateDependencies) {}

  async execute(input: CreateTaskStateInput): Promise<TaskStateRow> {
    const existing = await this.deps.taskStateRepository.findByUser(input.userId);
    const maxOrder = existing.reduce((acc, row) => Math.max(acc, row.order), -1);

    const now = this.deps.clock.now();
    const row: TaskStateRow = {
      id: this.deps.idGenerator.generate(),
      userId: input.userId,
      name: input.name,
      order: maxOrder + 1,
      createdAt: now,
      deletedAt: null,
    };

    await this.deps.taskStateRepository.insert(row);
    return row;
  }
}
