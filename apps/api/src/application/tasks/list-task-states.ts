import type { TaskStateRepository } from "../../domain/ports/task-state-repository";
import type { TaskStateRow } from "../../domain/tasks/types";

export interface ListTaskStatesInput {
 userId: string;
}

export interface ListTaskStatesDependencies {
 taskStateRepository: TaskStateRepository;
}

/**
 * Caso de uso: listar las columnas del kanban del usuario, ordenadas por
 * `order` ascendente (el adapter se encarga del orden; aquí no re-ordenamos).
 */
export class ListTaskStates {
 constructor(private readonly deps: ListTaskStatesDependencies) {}

 async execute(input: ListTaskStatesInput): Promise<TaskStateRow[]> {
  return this.deps.taskStateRepository.findByUser(input.userId);
 }
}
