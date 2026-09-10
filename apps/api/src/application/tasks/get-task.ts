import type { TaskRepository } from "../../domain/ports/task-repository";
import type { TaskRow } from "../../domain/tasks/types";
import { TaskNotFound } from "./errors";

export interface GetTaskInput {
  userId: string;
  taskId: string;
}

export interface GetTaskDependencies {
  taskRepository: TaskRepository;
}

/**
 * Caso de uso: obtener una task por id, validando ownership por userId.
 * Lanza `TaskNotFound` si no existe o pertenece a otro usuario.
 */
export class GetTask {
  constructor(private readonly deps: GetTaskDependencies) {}

  async execute(input: GetTaskInput): Promise<TaskRow> {
    const task = await this.deps.taskRepository.findById(input.taskId);
    if (!task || task.userId !== input.userId) {
      throw new TaskNotFound();
    }
    return task;
  }
}
