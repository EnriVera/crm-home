import type { TaskRepository } from "../../domain/ports/task-repository";

export interface ListClientDependenciesInput {
  userId: string;
  clientId: string;
}

export interface ListClientDependenciesDependencies {
  taskRepository: TaskRepository;
}

export interface ClientDependency {
  taskId: string;
  taskTitle: string;
}

/**
 * Caso de uso: qué tiene enganchado un cliente (PRD-v2 §8.5).
 *
 * El criterio de aceptación pide que borrar un cliente con tareas o
 * movimientos activos pida una confirmación explícita que LISTE las
 * dependencias. En la DB el único link a `client` es `task_clie_id`
 * (income/expense/transfer no tienen columna de cliente), así que las
 * dependencias son las tareas del usuario que apuntan a ese cliente.
 */
export class ListClientDependencies {
  constructor(private readonly deps: ListClientDependenciesDependencies) {}

  async execute(input: ListClientDependenciesInput): Promise<{
    dependencies: ClientDependency[];
    total: number;
  }> {
    const tasks = await this.deps.taskRepository.listByUser(input.userId);
    const attached = tasks.filter((task) => task.clientId === input.clientId);
    return {
      dependencies: attached.map((task) => ({
        taskId: task.id,
        taskTitle: task.title,
      })),
      total: attached.length,
    };
  }
}
