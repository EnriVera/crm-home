import type { TaskRepository } from "../../domain/ports/task-repository";
import type { TaskRow } from "../../domain/tasks/types";

export interface ListTasksInput {
  userId: string;
  search?: string;
}

export interface ListTasksDependencies {
  taskRepository: TaskRepository;
}

/**
 * Caso de uso: listar las tasks del usuario, opcionalmente filtradas por un
 * término de búsqueda. El adapter aplica `ILIKE` sobre el título (case-insensitive).
 *
 * Devuelve `TaskRow[]` (shape de dominio). Soft-deleted se excluyen en el adapter.
 */
export class ListTasks {
  constructor(private readonly deps: ListTasksDependencies) {}

  async execute(input: ListTasksInput): Promise<TaskRow[]> {
    const rows = await this.deps.taskRepository.listByUser(input.userId);

    if (!input.search) return rows;

    const needle = input.search.toLowerCase();
    return rows.filter((row) => row.title.toLowerCase().includes(needle));
  }
}
