import type { TaskStateRepository } from "../../domain/ports/task-state-repository";
import { TaskStateNotFound } from "./errors";

export interface DeleteTaskStateInput {
  userId: string;
  stateId: string;
}

export interface DeleteTaskStateDependencies {
  taskStateRepository: TaskStateRepository;
}

/**
 * Caso de uso: soft-delete de una columna (set tast_deleted_at).
 * Valida ownership por userId.
 */
export class DeleteTaskState {
  constructor(private readonly deps: DeleteTaskStateDependencies) {}

  async execute(input: DeleteTaskStateInput): Promise<void> {
    const current = await this.deps.taskStateRepository.findById(input.stateId);
    if (!current || current.userId !== input.userId) {
      throw new TaskStateNotFound();
    }
    await this.deps.taskStateRepository.softDelete(input.stateId);
  }
}
