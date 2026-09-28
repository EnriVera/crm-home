import type { H3Event } from "h3";
import type { GetHealth } from "../application/health/get-health";
import {
  createLogoutHandler,
  createRequestOtpHandler,
  createSessionHandler,
  createUpdateThemeHandler,
  createVerifyOtpHandler,
  type AuthRouteDependencies,
} from "./auth/auth-routes";
import {
  createCreateTaskHandler,
  createCreateTaskStateHandler,
  createGetTaskHandler,
  createListCategoriesByTypeHandler,
  createListClientsSearchHandler,
  createListTaskStatesHandler,
  createListTasksHandler,
  createMoveTaskHandler,
  createRemoveTaskHandler,
  createRemoveTaskStateHandler,
  createReorderTaskStatesHandler,
  createListTypesForFormHandler,
  createUpdateTaskHandler,
  createUpdateTaskStateHandler,
  type TasksRouteDependencies,
} from "./tasks/tasks-routes";
import {
  buildH3EventFromBase,
  BridgeHttpError,
  invokeH3HandlerAndParse,
} from "./orpc-bridge";
import {
  createClientHandler,
  createGetClientHandler,
  createListClientsHandler,
  deleteClientHandler,
  updateClientHandler,
  type ClientsRouteDependencies,
} from "./clients/clients-routes";
import {
  createGetIncomeHandler,
  createIncomeHandler,
  createListIncomesHandler,
  removeIncomeHandler,
  updateIncomeHandler,
  type IncomesRouteDependencies,
} from "./incomes/incomes-routes";
import {
  createExpenseHandler,
  createGetExpenseHandler,
  createListExpensesHandler,
  removeExpenseHandler,
  updateExpenseHandler,
  type ExpensesRouteDependencies,
} from "./expenses/expenses-routes";
import {
  createGetTransferHandler,
  createListTransfersHandler,
  createTransferHandler,
  removeTransferHandler,
  updateTransferHandler,
  type TransfersRouteDependencies,
} from "./transfers/transfers-routes";
import {
  createGetScheduleHandler,
  createListSchedulesHandler,
  createScheduleHandler,
  removeScheduleHandler,
  updateScheduleHandler,
  type SchedulesRouteDependencies,
} from "./schedules/schedules-routes";

export interface RouterDependencies
  extends AuthRouteDependencies,
    TasksRouteDependencies,
    ClientsRouteDependencies,
    IncomesRouteDependencies,
    ExpensesRouteDependencies,
    TransfersRouteDependencies,
    SchedulesRouteDependencies {
  getHealth: GetHealth;
  listClientsHandler: ReturnType<typeof createListClientsHandler>;
}

/**
 * HTTP RPC handler con dispatch manual + wrap del protocolo ORPC.
 *
 * Por qué dispatch manual (en vez de `RPCHandler`):
 * Después de 7 rounds peleando con `RPCHandler` (que reportaba "could not
 * match" para paths correctos), decidimos bypasearlo y hacer dispatch
 * manual con un Map<key, procedure>. Cada procedure es una función async
 * (input, event) => output que:
 *   1. Construye un H3Event híbrido vía `buildH3EventFromBase` (reusa
 *      `node.req`/`node.res` del base para preservar cookies y headers).
 *   2. Invoca el handler H3Event existente vía `invokeH3HandlerAndParse`
 *      (que normaliza `Response | XxxOutput` al body JSON parseado).
 *
 * El wrapping de protocolo ORPC se hace en el handler público:
 *   - Request body: `{data: input, meta?, lastEventId?, signal?}` → unwrap a `input`.
 *   - Response body success: `{data: output}` (HTTP 200).
 *   - Response body error: ORPC error shape con `code` discriminado y HTTP 4xx/5xx.
 *
 * Mantenemos los handlers H3Event existentes intactos (`auth-routes.ts`,
 * `tasks-routes.ts`) — solo cambian cómo se exponen al exterior.
 */

type H3Handler = (event: H3Event) => Promise<Response | unknown>;
function asBridgeHandler<R>(
  handler: (event: H3Event) => Promise<R>,
): H3Handler {
  // SAFETY: los handlers H3Event retornan `Promise<Response | XxxOutput>`
  // (union) porque el happy path devuelve a veces el objeto directo y otras
  // un `Response` envuelto. El bridge normaliza ambos casos. El cast a
  // `H3Handler` (Promise<Response | unknown>) es safe.
  return handler as unknown as H3Handler;
}

interface ProcedureEntry {
  method: "POST" | "GET";
  path: string; // Ej. "/auth/requestOtp"
  /**
   * El tercer argumento `userIdFromSession` lo inyecta el router después
   * de resolver la sesión desde el cookie `crm_session` (ver dispatch
   * handler). Los handlers que lo esperan como header `X-User-Id`
   * (e.g. `tasks-routes.ts`) lo leen vía `getHeader(event, "x-user-id")`,
   * así que wrapPost envuelve el `event.req` con ese header ANTES de
   * invocar el handler. Si es `null`, los wrappers no inyectan nada
   * (útil para endpoints públicos como `requestOtp` que aún no tienen
   * sesión).
   */
  run: (
    event: H3Event,
    input: unknown,
    userIdFromSession?: string | null,
  ) => Promise<unknown>;
}

export function createRpcHandler(
  deps: RouterDependencies,
): (event: H3Event) => Promise<Response> {
  // ─── Pre-instanciar handlers H3Event ────────────────────────────────────
  const requestOtpH3 = asBridgeHandler(createRequestOtpHandler(deps));
  const verifyOtpH3 = asBridgeHandler(createVerifyOtpHandler(deps));
  const logoutH3 = asBridgeHandler(createLogoutHandler(deps));
  const sessionH3 = asBridgeHandler(createSessionHandler(deps));
  const updateThemeH3 = asBridgeHandler(createUpdateThemeHandler(deps));

  const listTasksH3 = asBridgeHandler(createListTasksHandler(deps));
  const getTaskH3 = asBridgeHandler(createGetTaskHandler(deps));
  const createTaskH3 = asBridgeHandler(createCreateTaskHandler(deps));
  const updateTaskH3 = asBridgeHandler(createUpdateTaskHandler(deps));
  const moveTaskH3 = asBridgeHandler(createMoveTaskHandler(deps));
  const removeTaskH3 = asBridgeHandler(createRemoveTaskHandler(deps));
  const listTaskStatesH3 = asBridgeHandler(createListTaskStatesHandler(deps));
  const createTaskStateH3 = asBridgeHandler(createCreateTaskStateHandler(deps));
  const updateTaskStateH3 = asBridgeHandler(createUpdateTaskStateHandler(deps));
  const removeTaskStateH3 = asBridgeHandler(createRemoveTaskStateHandler(deps));
  const reorderTaskStatesH3 = asBridgeHandler(
    createReorderTaskStatesHandler(deps),
  );
  const clientsSearchH3 = asBridgeHandler(createListClientsSearchHandler(deps));
  const listClientsH3 = asBridgeHandler(createListClientsHandler(deps));
  const getClientH3 = asBridgeHandler(createGetClientHandler(deps));
  const createClientH3 = asBridgeHandler(createClientHandler(deps));
  const updateClientH3 = asBridgeHandler(updateClientHandler(deps));
  const deleteClientH3 = asBridgeHandler(deleteClientHandler(deps));

  const listIncomesH3 = asBridgeHandler(createListIncomesHandler(deps));
  const getIncomeH3 = asBridgeHandler(createGetIncomeHandler(deps));
  const createIncomeH3 = asBridgeHandler(createIncomeHandler(deps));
  const updateIncomeH3 = asBridgeHandler(updateIncomeHandler(deps));
  const removeIncomeH3 = asBridgeHandler(removeIncomeHandler(deps));

  const listExpensesH3 = asBridgeHandler(createListExpensesHandler(deps));
  const getExpenseH3 = asBridgeHandler(createGetExpenseHandler(deps));
  const createExpenseH3 = asBridgeHandler(createExpenseHandler(deps));
  const updateExpenseH3 = asBridgeHandler(updateExpenseHandler(deps));
  const removeExpenseH3 = asBridgeHandler(removeExpenseHandler(deps));

  const listTransfersH3 = asBridgeHandler(createListTransfersHandler(deps));
  const getTransferH3 = asBridgeHandler(createGetTransferHandler(deps));
  const createTransferH3 = asBridgeHandler(createTransferHandler(deps));
  const updateTransferH3 = asBridgeHandler(updateTransferHandler(deps));
  const removeTransferH3 = asBridgeHandler(removeTransferHandler(deps));

  const listSchedulesH3 = asBridgeHandler(createListSchedulesHandler(deps));
  const getScheduleH3 = asBridgeHandler(createGetScheduleHandler(deps));
  const createScheduleH3 = asBridgeHandler(createScheduleHandler(deps));
  const updateScheduleH3 = asBridgeHandler(updateScheduleHandler(deps));
  const removeScheduleH3 = asBridgeHandler(removeScheduleHandler(deps));

  const typesForFormH3 = createListTypesForFormHandler(deps);
  const categoriesByTypeH3 = createListCategoriesByTypeHandler(deps);

  // ─── Tabla de dispatch (METHOD + PATH → procedure) ─────────────────────
  // Helper: wrap del handler H3Event en un procedure-shape ORPC.
  // Si `userIdFromSession` está provisto, clona el `event.req` agregando
  // `x-user-id` como header — `tasks-routes.ts` lee el userId de ese header
  // (`getHeader(event, "x-user-id")`) y rechaza con `Missing X-User-Id
  // header` si no está. El lookup de sesión lo hace el dispatch handler
  // una vez por request, antes de delegar al wrapper.
  const wrapPost = (h3: H3Handler, path: string): ProcedureEntry["run"] => {
    return async (
      event: H3Event,
      input: unknown,
      userIdFromSession?: string | null,
    ) => {
      const hybrid = buildH3EventFromBase(event, {
        method: "POST",
        path: `/rpc${path}`,
        body: input,
      });
      const finalHybrid = userIdFromSession
        ? withRequestHeader(hybrid, "x-user-id", userIdFromSession)
        : hybrid;
      return invokeH3HandlerAndParse(h3, finalHybrid);
    };
  };
  const wrapGet = (h3: H3Handler, path: string): ProcedureEntry["run"] => {
    return async (
      event: H3Event,
      _input: unknown,
      userIdFromSession?: string | null,
    ) => {
      const hybrid = buildH3EventFromBase(event, {
        method: "GET",
        path: `/rpc${path}`,
      });
      const finalHybrid = userIdFromSession
        ? withRequestHeader(hybrid, "x-user-id", userIdFromSession)
        : hybrid;
      return invokeH3HandlerAndParse(h3, finalHybrid);
    };
  };

  const procedures: ProcedureEntry[] = [
    // Auth
    {
      method: "POST",
      path: "/auth/requestOtp",
      run: wrapPost(requestOtpH3, "/auth/requestOtp"),
    },
    {
      method: "POST",
      path: "/auth/verifyOtp",
      run: wrapPost(verifyOtpH3, "/auth/verifyOtp"),
    },
    {
      method: "POST",
      path: "/auth/logout",
      run: wrapPost(logoutH3, "/auth/logout"),
    },
    {
      method: "GET",
      path: "/auth/session",
      run: wrapGet(sessionH3, "/auth/session"),
    },
    {
      // Aceptamos POST también: el cliente ORPC v1.15 sin contract binding usa
      // POST por default, y `getSession()` del session-guard se llama en SSR
      // sin acceso al contract, por lo que termina enviando POST. Sin esta
      // entry, `requireSession` ve 404 → null → redirect a /login → loop.
      method: "POST",
      path: "/auth/session",
      run: wrapGet(sessionH3, "/auth/session"),
    },
    {
      method: "POST",
      path: "/auth/updateTheme",
      run: wrapPost(updateThemeH3, "/auth/updateTheme"),
    },
    // Tasks (procedimientos con input)
    {
      method: "POST",
      path: "/tasks/list",
      run: wrapPost(listTasksH3, "/tasks/list"),
    },
    {
      method: "POST",
      path: "/tasks/get",
      run: wrapPost(getTaskH3, "/tasks/get"),
    },
    {
      method: "POST",
      path: "/tasks/create",
      run: wrapPost(createTaskH3, "/tasks/create"),
    },
    {
      method: "POST",
      path: "/tasks/update",
      run: wrapPost(updateTaskH3, "/tasks/update"),
    },
    {
      method: "POST",
      path: "/tasks/move",
      run: wrapPost(moveTaskH3, "/tasks/move"),
    },
    {
      method: "POST",
      path: "/tasks/remove",
      run: wrapPost(removeTaskH3, "/tasks/remove"),
    },
    {
      method: "POST",
      path: "/tasks/states/list",
      run: wrapPost(listTaskStatesH3, "/tasks/states/list"),
    },
    {
      method: "POST",
      path: "/tasks/states/create",
      run: wrapPost(createTaskStateH3, "/tasks/states/create"),
    },
    {
      method: "POST",
      path: "/tasks/states/update",
      run: wrapPost(updateTaskStateH3, "/tasks/states/update"),
    },
    {
      method: "POST",
      path: "/tasks/states/remove",
      run: wrapPost(removeTaskStateH3, "/tasks/states/remove"),
    },
    {
      method: "POST",
      path: "/tasks/states/reorder",
      run: wrapPost(reorderTaskStatesH3, "/tasks/states/reorder"),
    },
    {
      method: "POST",
      path: "/tasks/clients/search",
      run: wrapPost(clientsSearchH3, "/tasks/clients/search"),
    },
    {
      method: "POST",
      path: "/clients/list",
      // Usamos wrapPost para que el body se inyecte como query string
      // (los handlers leen via `getQuery(event)` consistentemente con tasks).
      run: wrapPost(listClientsH3, "/clients/list"),
    },
    {
      method: "POST",
      path: "/clients/get",
      run: wrapPost(getClientH3, "/clients/get"),
    },
    {
      method: "POST",
      path: "/clients/create",
      run: wrapPost(createClientH3, "/clients/create"),
    },
    {
      method: "POST",
      path: "/clients/update",
      run: wrapPost(updateClientH3, "/clients/update"),
    },
    {
      method: "POST",
      path: "/clients/remove",
      run: wrapPost(deleteClientH3, "/clients/remove"),
    },
    {
      method: "POST",
      path: "/incomes/list",
      run: wrapPost(listIncomesH3, "/incomes/list"),
    },
    {
      method: "POST",
      path: "/incomes/get",
      run: wrapPost(getIncomeH3, "/incomes/get"),
    },
    {
      method: "POST",
      path: "/incomes/create",
      run: wrapPost(createIncomeH3, "/incomes/create"),
    },
    {
      method: "POST",
      path: "/incomes/update",
      run: wrapPost(updateIncomeH3, "/incomes/update"),
    },
    {
      method: "POST",
      path: "/incomes/remove",
      run: wrapPost(removeIncomeH3, "/incomes/remove"),
    },
    {
      method: "POST",
      path: "/expenses/list",
      run: wrapPost(listExpensesH3, "/expenses/list"),
    },
    {
      method: "POST",
      path: "/expenses/get",
      run: wrapPost(getExpenseH3, "/expenses/get"),
    },
    {
      method: "POST",
      path: "/expenses/create",
      run: wrapPost(createExpenseH3, "/expenses/create"),
    },
    {
      method: "POST",
      path: "/expenses/update",
      run: wrapPost(updateExpenseH3, "/expenses/update"),
    },
    {
      method: "POST",
      path: "/expenses/remove",
      run: wrapPost(removeExpenseH3, "/expenses/remove"),
    },
    {
      method: "POST",
      path: "/transfers/list",
      run: wrapPost(listTransfersH3, "/transfers/list"),
    },
    {
      method: "POST",
      path: "/transfers/get",
      run: wrapPost(getTransferH3, "/transfers/get"),
    },
    {
      method: "POST",
      path: "/transfers/create",
      run: wrapPost(createTransferH3, "/transfers/create"),
    },
    {
      method: "POST",
      path: "/transfers/update",
      run: wrapPost(updateTransferH3, "/transfers/update"),
    },
    {
      method: "POST",
      path: "/transfers/remove",
      run: wrapPost(removeTransferH3, "/transfers/remove"),
    },
    {
      method: "POST",
      path: "/schedules/list",
      run: wrapPost(listSchedulesH3, "/schedules/list"),
    },
    {
      method: "POST",
      path: "/schedules/get",
      run: wrapPost(getScheduleH3, "/schedules/get"),
    },
    {
      method: "POST",
      path: "/schedules/create",
      run: wrapPost(createScheduleH3, "/schedules/create"),
    },
    {
      method: "POST",
      path: "/schedules/update",
      run: wrapPost(updateScheduleH3, "/schedules/update"),
    },
    {
      method: "POST",
      path: "/schedules/remove",
      run: wrapPost(removeScheduleH3, "/schedules/remove"),
    },
  ];

  const dispatch = new Map<string, ProcedureEntry>();
  for (const proc of procedures) {
    dispatch.set(`${proc.method} ${proc.path}`, proc);
  }

  // ─── Legacy endpoints (no contrato): ruta explícita ────────────────────
  // `tasks.types-for-form` y `tasks.categories-by-type` existen como handlers
  // H3Event pero NO en `tasksContract`. Se sirven manualmente hasta que se
  // agreguen al contrato en un PR aparte.
  // ──────────────────────────────────────────────────────────────────────

  // ─── Handler público (H3Event) ────────────────────────────────────────
  return async (event: H3Event): Promise<Response> => {
    // SAFETY: `new URL(...)` puede tirar si la URL es malformada; en la
    // práctica nitro garantiza URLs bien-formadas, pero el try/catch es
    // defensivo para tests que pasen un mock event con URL vacía.
    let path: string;
    try {
      path = new URL(event.req.url).pathname;
    } catch {
      return new Response("Bad Request", { status: 400 });
    }

    // Resolver userId desde session cookie una sola vez por request (los
    // handlers lo leen como header `X-User-Id`). Se aplica tanto al
    // dispatcher ORPC como a los legacy endpoints (que no pasan por
    // wrapPost/wrapGet y por eso no recibían el header antes).
    const userIdFromSession = await resolveUserIdFromSession(
      event,
      deps.getSession,
    );
    const eventWithUserId =
      userIdFromSession === null
        ? event
        : withRequestHeader(event, "x-user-id", userIdFromSession);

    // Legacy endpoints sin contrato (siguen funcionando con la API vieja).
    // Necesitan el x-user-id header en `event.req.headers` porque sus
    // handlers usan `getHeader(event, "x-user-id")` (vía `readUserId`).
    // Aceptamos kebab y camelCase porque el cliente ORPC preserva el
    // property name del procedure como segment del path (no kebab-translate).
    if (
      path === "/rpc/tasks/types-for-form" ||
      path === "/rpc/tasks/typesForForm"
    ) {
      return typesForFormH3(eventWithUserId);
    }
    if (
      path === "/rpc/tasks/categories-by-type" ||
      path === "/rpc/tasks/categoriesByType"
    ) {
      return categoriesByTypeH3(eventWithUserId);
    }

    // Health: ruta simple sin wrap ORPC (mantenemos el comportamiento h3 nativo)
    if (path === "/rpc/health") {
      return Response.json(deps.getHealth.execute());
    }

    // Strip /rpc prefix para matchear contra la tabla
    const procedurePath = path.startsWith("/rpc/")
      ? path.slice("/rpc".length)
      : path;
    const method = event.req.method as "POST" | "GET";
    const entry = dispatch.get(`${method} ${procedurePath}`);

    if (!entry) {
      console.warn(`[rpc] no procedure found for ${method} ${procedurePath}`);
      return new Response("Not Found", { status: 404 });
    }

    // Parse body para extraer `input` del wrap. El cliente ORPC v1.15 envía
    // `{json: input}` en el REQUEST y espera `{json: <output>}` en la
    // RESPONSE (mismo envelope del lado cliente vía
    // `StandardRPCSerializer`). Para errores sí wrappeamos con
    // `{defined: <bool>, code, status, message, data?}` (shape estricto
    // reconocido por `isORPCErrorJson`).
    let input: unknown;
    if (method === "POST") {
      try {
        const rawBody = await eventWithUserId.req.json();
        input = (rawBody as { json?: unknown; data?: unknown })?.json;
      } catch (parseError) {
        console.error("[rpc] body parse failed:", parseError);
      }
    }

    // Ejecutar la procedure con el userId resuelto desde session
    let output: unknown;
    try {
      output = await entry.run(eventWithUserId, input, userIdFromSession);
    } catch (err) {
      // Wrap del error en formato ORPC. BridgeHttpError se traduce a un
      // error HTTP con code discriminado; cualquier otro error cae a 500.
      // IMPORTANTE: `defined: true` es la señal que el codec ORPC v1.15 usa
      // para distinguir errores de success. Sin esto, el codec parsea el
      // body como success (con shape `{data: ...}`), la validación contra
      // el output schema falla silenciosamente, y el client recibe
      // `undefined` en vez de un ORPCError.
      if (err instanceof BridgeHttpError) {
        return new Response(
          JSON.stringify({
            defined: true,
            code: err.orpcCode,
            data: err.data,
            message: err.message,
            status: err.status,
          }),
          {
            status: err.status,
            headers: { "content-type": "application/json" },
          },
        );
      }
      console.error("[rpc] unexpected error:", err);
      return new Response(
        JSON.stringify({
          defined: true,
          code: "INTERNAL_SERVER_ERROR",
          message: err instanceof Error ? err.message : "Internal Server Error",
        }),
        {
          status: 500,
          headers: { "content-type": "application/json" },
        },
      );
    }

    // Respuesta exitosa: wrap con `{json: output}` matching el envelope
    // simétrico del cliente. `output` viene del bridge como el body
    // JSON ya parseado del handler H3Event (lo armó un `Response.json(...)`
    // o un `return result` directo, ambos normalizados por
    // `invokeH3HandlerAndParse`).
    return new Response(JSON.stringify({ json: output }), {
      status: 200,
      headers: { "content-type": "application/json" },
    });
  };
}

// SAFETY: helpers de soporte abajo son internos al módulo (no exportados)
// porque solo el `createRpcHandler` los usa.

/**
 * Extrae el token de sesión del cookie `crm_session` del incoming request
 * y lo valida con el `GetSession` use case. Devuelve `user.id` si la sesión
 * es válida, `null` si no hay cookie / es inválida / expirada. La idea es
 * NO romper las procedures públicas (sin sesión) que reciben `null` y
 * siguen su flow normal; los handlers autenticados (tasks.*, logout)
 * reciben el userId y lo inyectan como header `X-User-Id`.
 */
async function resolveUserIdFromSession(
  event: H3Event,
  getSession: RouterDependencies["getSession"],
): Promise<string | null> {
  const cookieHeader = event.req?.headers?.get("cookie");
  if (!cookieHeader) return null;
  const match = /(?:^|;\s*)crm_session=([^;]+)/.exec(cookieHeader);
  const token = match?.[1]?.trim();
  if (!token) return null;
  try {
    const result = await getSession.execute({ token });
    return result?.user.id ?? null;
  } catch {
    return null;
  }
}

/**
 * Clona el `event.req` (Fetch Request) agregando un header extra. Los
 * Fetch Request headers son inmutables, así que tenemos que construir un
 * Request nuevo preservando method/url/body/headers originales.
 *
 * El body Blob se pasa como stream (no se consume en la clonación) para
 * no romper la lectura posterior del body por `readValidatedBody` en el
 * handler. El cast `as never` es necesario porque `event.node`/`res` no
 * son shapes oficialmente opcionales en `H3Event`.
 */
function withRequestHeader(
  event: H3Event,
  key: string,
  value: string,
): H3Event {
  const req = event.req;
  const newHeaders = new Headers(req.headers);
  newHeaders.set(key, value);
  const clonedReq = new Request(req.url, {
    method: req.method,
    headers: newHeaders,
    body: req.body,
    // signal/duplex: no se propaga porque nunca se setean en este bridge.
  });
  return {
    ...event,
    req: clonedReq,
  } as H3Event;
}
