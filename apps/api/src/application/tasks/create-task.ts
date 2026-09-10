import type { Clock } from "../../domain/ports/clock";
import type { IdGenerator } from "../../domain/ports/id-generator";
import type { TaskRepository } from "../../domain/ports/task-repository";
import type { TaskStateRepository } from "../../domain/ports/task-state-repository";
import type { TaskRow } from "../../domain/tasks/types";
import { KANBAN_DEFAULT_STEP } from "./constants";
import { TaskStateNotFound } from "./errors";

export interface CreateTaskInput {
  userId: string;
  title: string;
  description?: string | null;
  clientId?: string | null;
  typeId: string;
  categoryId?: string | null;
  stateId: string;
}

export interface CreateTaskDependencies {
  taskRepository: TaskRepository;
  taskStateRepository: TaskStateRepository;
  idGenerator: IdGenerator;
  clock: Clock;
}

/**
 * Caso de uso: crear una task al FINAL de la columna destino.
 *
 * Pasos:
 * 1. Validar que `stateId` existe.
 * 2. Calcular `kanbanOrder` = appendOrder(columna) (max + KANBAN_DEFAULT_STEP).
 * 3. Construir `TaskRow` con id (idGenerator) y timestamps (clock).
 * 4. Insertar.
 *
 * Si la columna está vacía, el orden inicial = `KANBAN_DEFAULT_STEP` (1024).
 */
export class CreateTask {
  constructor(private readonly deps: CreateTaskDependencies) {}

  async execute(input: CreateTaskInput): Promise<TaskRow> {
    const state = await this.deps.taskStateRepository.findById(input.stateId);
    if (!state || state.userId !== input.userId) {
      throw new TaskStateNotFound();
    }

    const column = await this.deps.taskRepository.listByColumn(
      input.userId,
      input.stateId,
    );
    const maxOrder = column.reduce(
      (acc, row) => Math.max(acc, row.kanbanOrder),
      0,
    );
    const order =
      column.length === 0
        ? KANBAN_DEFAULT_STEP
        : maxOrder + KANBAN_DEFAULT_STEP;

    const now = this.deps.clock.now();
    const row: TaskRow = {
      id: this.deps.idGenerator.generate(),
      userId: input.userId,
      title: input.title,
      description: input.description ?? null,
      clientId: input.clientId ?? null,
      typeId: input.typeId,
      categoryId: input.categoryId ?? null,
      stateId: input.stateId,
      kanbanOrder: order,
      createdAt: now,
      updatedAt: now,
      deletedAt: null,
    };

    await this.deps.taskRepository.insert(row);
    return row;
  }
}
