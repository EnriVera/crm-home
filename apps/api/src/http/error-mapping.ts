import { HTTPError } from "h3";

/**
 * Mapeo compartido de errores de dominio a status HTTP.
 *
 * Vive acá y no en `http/tasks/` porque lo usan todos los módulos de la
 * API: cada handler HTTP decide su status con este helper y nunca filtra
 * la instancia del error al cliente — solo el `code` y un mensaje.
 *
 * El status sale de una tabla explícita de `code` → status: los errores de
 * dominio exponen un `code` estable (el mismo que ve el cliente) y la
 * tabla dice qué significa cada uno.
 */
export interface DomainErrorResponse {
  status: number;
  body: { defined: true; code: string; message: string };
}

/** `code` del error de dominio → status HTTP. */
const STATUS_BY_CODE: Record<string, number> = {
  // 401: no hay sesión o la sesión no habilita la operación.
  UNAUTHORIZED: 401,
  // 404: la fila que se pide no existe (o no es del usuario).
  TASK_NOT_FOUND: 404,
  TASK_STATE_NOT_FOUND: 404,
  CLIENT_NOT_FOUND: 404,
  CATEGORY_NOT_FOUND: 404,
  TYPE_NOT_FOUND: 404,
  INCOME_NOT_FOUND: 404,
  EXPENSE_NOT_FOUND: 404,
  TRANSFER_NOT_FOUND: 404,
  SCHEDULE_NOT_FOUND: 404,
  TIMER_NOT_FOUND: 404,
  ACCOUNT_NOT_FOUND: 404,
  // 400: la entrada no es válida.
  INVALID_CLIENT_INPUT: 400,
  INVALID_CATEGORY_INPUT: 400,
  INVALID_TYPE_INPUT: 400,
  INVALID_CURRENCY_INPUT: 400,
  INVALID_INCOME_INPUT: 400,
  INVALID_EXPENSE_INPUT: 400,
  INVALID_TRANSFER_INPUT: 400,
  INVALID_SCHEDULE_INPUT: 400,
  INVALID_TIMER_INPUT: 400,
  INVALID_ACCOUNT_INPUT: 400,
  // 409: el pedido choca con el estado actual.
  INVALID_KANBAN_ORDER: 409,
  INVALID_STATE_TRANSITION: 409,
  TIMER_ALREADY_RUNNING: 409,
  // 429: demasiados intentos.
  RATE_LIMITED: 429,
};

function isDomainError(
  error: unknown,
): error is { code: string; message: string } {
  if (typeof error !== "object" || error === null) return false;
  if (!("code" in error) || typeof error.code !== "string") return false;
  if (!("message" in error) || typeof error.message !== "string") return false;
  return true;
}

/**
 * Traduce una excepción a la respuesta HTTP que el cliente recibe.
 *
 * - Los `HTTPError` de h3 (validación de zod, método no permitido)
 *   conservan su status: el status ya viene bien calculado por h3.
 * - 401/404/409/429: el `code` del error de dominio, según la tabla.
 * - 400: un error de dominio con un `code` que la tabla no conoce (un
 *   error de dominio es un problema del pedido, no del server).
 * - 500: cualquier otra cosa (no es un error de dominio).
 */
export function mapDomainErrorToStatus(error: unknown): DomainErrorResponse {
  // Errores de h3 (validación de zod, método no permitido): el status ya
  // viene bien calculado por h3.
  if (HTTPError.isError(error)) {
    return {
      status: error.status,
      body: {
        defined: true,
        code: error.status === 400 ? "VALIDATION_ERROR" : "HTTP_ERROR",
        message: error.status === 400 ? "Validation failed" : error.message,
      },
    };
  }

  if (isDomainError(error)) {
    const status = STATUS_BY_CODE[error.code] ?? 400;
    return {
      status,
      body: { defined: true, code: error.code, message: error.message },
    };
  }

  return {
    status: 500,
    body: {
      defined: true,
      code: "INTERNAL_ERROR",
      message: "Internal Server Error",
    },
  };
}
