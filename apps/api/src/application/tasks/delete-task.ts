import type { TaskRepository } from "../../domain/ports/task-repository";
import { TaskNotFound } from "./errors";

export interface DeleteTaskInput {
  userId: string;
  taskId: string;
}

export interface DeleteTaskDependencies {
  taskRepository: TaskRepository;
}

/**
 * Caso de uso: soft-delete de una task (set task_deleted_at).
 * Valida ownership por userId.
 */
export class DeleteTask {
  constructor(private readonly deps: DeleteTaskDependencies) {}

  async execute(input: DeleteTaskInput): Promise<void> {
    const current = await this.deps.taskRepository.findById(input.taskId);
    if (!current || current.userId !== input.userId) {
      throw new TaskNotFound();
    }
    await this.deps.taskRepository.softDelete(input.taskId);
  }
}
