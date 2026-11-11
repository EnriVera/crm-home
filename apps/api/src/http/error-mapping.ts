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

/**
 * `code` del error de dominio → status HTTP.
 *
 * Esta tabla es además la allow-list de códigos de dominio: un error cuyo
 * `code` no está acá no es un error de esta API (por ejemplo, el SQLSTATE
 * de Postgres) y se responde como 500 genérico.
 */
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

/**
 * Status de un error de dominio, o `undefined` si el error no es de
 * dominio.
 *
 * La tabla `STATUS_BY_CODE` es la allow-list: un `code` que esta API no
 * reconoce no es un error de dominio (por ejemplo, el SQLSTATE y el texto
 * que devuelve el driver de Postgres, que traen nombre de relación y de
 * constraint). Esos se tratan como falla del server, no como error del
 * cliente.
 */
function toDomainError(
  error: unknown,
): { code: string; message: string; status: number } | undefined {
  if (typeof error !== "object" || error === null) return undefined;
  if (!("code" in error) || typeof error.code !== "string") return undefined;
  if (!("message" in error) || typeof error.message !== "string") return undefined;
  if (!Object.hasOwn(STATUS_BY_CODE, error.code)) return undefined;
  return {
    code: error.code,
    message: error.message,
    status: STATUS_BY_CODE[error.code] ?? 500,
  };
}

/**
 * Traduce una excepción a la respuesta HTTP que el cliente recibe.
 *
 * - Los `HTTPError` de h3 (validación de zod, método no permitido)
 *   conservan su status: el status ya viene bien calculado por h3.
 * - 401/404/409/429: el `code` del error de dominio, según la tabla.
 * - 500: cualquier otra cosa, incluido un error cuyo `code` la tabla no
 *   conoce (por ejemplo, un error crudo del driver de Postgres). No se
 *   filtra su mensaje al cliente: puede traer SQLSTATE, nombres de
 *   relación y de constraint.
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

  const domainError = toDomainError(error);
  if (domainError !== undefined) {
    return {
      status: domainError.status,
      body: {
        defined: true,
        code: domainError.code,
        message: domainError.message,
      },
    };
  }

  // El mensaje del error interno no se filtra al cliente: puede traer
  // detalle de SQL, SQLSTATE o nombres de relación y de constraint.
  console.error("[http] unexpected error:", error);

  return {
    status: 500,
    body: {
      defined: true,
      code: "INTERNAL_SERVER_ERROR",
      message: "Internal Server Error",
    },
  };
}
