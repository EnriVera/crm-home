import { HTTPError } from "h3";
import {
  InvalidKanbanOrder,
  InvalidStateTransition,
  TaskDomainError,
  TaskNotFound,
  TaskStateNotFound,
  Unauthorized,
} from "../../application/tasks/errors";

/**
 * Mapea errores del dominio `tasks` a status HTTP. El handler HTTP usa este
 * helper para decidir el código de respuesta sin filtrar la instancia del
 * error al cliente — solo el `code` y un mensaje genérico.
 *
 * Status codes:
 * - 400: input malformado. `readValidatedBody` de h3 lanza un `HTTPError`
 *   con status 400 cuando el schema de zod falla; sin esta rama caía en el
 *   500 de abajo y el cliente no podía distinguir "escribiste mal un valor"
 *   de "el server está roto".
 * - 401: Unauthorized.
 * - 404: TaskNotFound, TaskStateNotFound.
 * - 409: InvalidKanbanOrder, InvalidStateTransition (conflictos de estado).
 * - 500: error desconocido (no es TaskDomainError).
 */

export interface TaskErrorResponse {
  status: number;
  body: { error: string; code: string };
}

export function mapTaskErrorToStatus(error: unknown): TaskErrorResponse {
  // Validación de zod (h3): el status ya viene bien calculado por h3.
  if (HTTPError.isError(error) && error.status === 400) {
    return {
      status: 400,
      body: { error: "Validation failed", code: "VALIDATION_ERROR" },
    };
  }
  if (error instanceof TaskNotFound) {
    return {
      status: 404,
      body: { error: "Task not found", code: error.code },
    };
  }
  if (error instanceof TaskStateNotFound) {
    return {
      status: 404,
      body: { error: "Task state not found", code: error.code },
    };
  }
  if (error instanceof InvalidKanbanOrder) {
    return {
      status: 409,
      body: { error: "Invalid kanban order", code: error.code },
    };
  }
  if (error instanceof InvalidStateTransition) {
    return {
      status: 409,
      body: { error: "Invalid state transition", code: error.code },
    };
  }
  if (error instanceof Unauthorized) {
    return {
      status: 401,
      body: { error: "Unauthorized", code: error.code },
    };
  }
  if (error instanceof TaskDomainError) {
    return {
      status: 400,
      body: { error: error.message, code: error.code },
    };
  }
  return {
    status: 500,
    body: { error: "Internal Server Error", code: "INTERNAL_ERROR" },
  };
}
