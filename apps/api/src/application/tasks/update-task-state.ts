import type { TaskStateRepository } from "../../domain/ports/task-state-repository";
import type { TaskStatePatch, TaskStateRow } from "../../domain/tasks/types";
import { TaskStateNotFound } from "./errors";

export interface UpdateTaskStateInput {
  userId: string;
  stateId: string;
  patch: TaskStatePatch;
}

export interface UpdateTaskStateDependencies {
  taskStateRepository: TaskStateRepository;
}

/**
 * Caso de uso: actualizar nombre y/o orden de una columna.
 * Valida ownership por userId.
 */
export class UpdateTaskState {
  constructor(private readonly deps: UpdateTaskStateDependencies) {}

  async execute(input: UpdateTaskStateInput): Promise<TaskStateRow> {
    const current = await this.deps.taskStateRepository.findById(input.stateId);
    if (!current || current.userId !== input.userId) {
      throw new TaskStateNotFound();
    }
    await this.deps.taskStateRepository.update(input.stateId, input.patch);
    const updated = await this.deps.taskStateRepository.findById(input.stateId);
    return updated!;
  }
}
