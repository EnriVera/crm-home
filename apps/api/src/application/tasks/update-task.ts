import type { TaskRepository } from "../../domain/ports/task-repository";
import type { TaskPatch, TaskRow } from "../../domain/tasks/types";
import { TaskNotFound } from "./errors";

export interface UpdateTaskInput {
  userId: string;
  taskId: string;
  patch: TaskPatch;
}

export interface UpdateTaskDependencies {
  taskRepository: TaskRepository;
}

/**
 * Caso de uso: actualizar campos provistos en `patch` sobre una task existente.
 * Valida ownership por userId.
 */
export class UpdateTask {
  constructor(private readonly deps: UpdateTaskDependencies) {}

  async execute(input: UpdateTaskInput): Promise<TaskRow> {
    const current = await this.deps.taskRepository.findById(input.taskId);
    if (!current || current.userId !== input.userId) {
      throw new TaskNotFound();
    }
    await this.deps.taskRepository.update(input.taskId, input.patch);
    const updated = await this.deps.taskRepository.findById(input.taskId);
    return updated!;
  }
}
