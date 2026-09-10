/**
 * Base común para errores del módulo tasks. El handler HTTP (WU6) mapea
 * `code` → status HTTP; nunca se filtra la instancia al cliente — solo el `code`
 * y un mensaje genérico cuando aplique.
 */
export abstract class TaskDomainError extends Error {
  abstract readonly code: string;
}

export class TaskNotFound extends TaskDomainError {
  readonly code = "TASK_NOT_FOUND";

  constructor(message = "Task not found") {
    super(message);
    this.name = "TaskNotFound";
  }
}

export class TaskStateNotFound extends TaskDomainError {
  readonly code = "TASK_STATE_NOT_FOUND";

  constructor(message = "Task state not found") {
    super(message);
    this.name = "TaskStateNotFound";
  }
}

export class InvalidKanbanOrder extends TaskDomainError {
  readonly code = "INVALID_KANBAN_ORDER";

  constructor(message = "Invalid kanban order") {
    super(message);
    this.name = "InvalidKanbanOrder";
  }
}

export class InvalidStateTransition extends TaskDomainError {
  readonly code = "INVALID_STATE_TRANSITION";

  constructor(message = "Invalid state transition") {
    super(message);
    this.name = "InvalidStateTransition";
  }
}

export class Unauthorized extends TaskDomainError {
  readonly code = "UNAUTHORIZED";

  constructor(message = "Unauthorized") {
    super(message);
    this.name = "Unauthorized";
  }
}
