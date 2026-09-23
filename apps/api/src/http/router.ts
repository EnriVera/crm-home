import type { H3Event } from "h3";
import type { GetHealth } from "../application/health/get-health";
import {
  createLogoutHandler,
  createRequestOtpHandler,
  createSessionHandler,
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

export interface RouterDependencies
  extends AuthRouteDependencies,
    TasksRouteDependencies {
  getHealth: GetHealth;
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
  run: (event: H3Event, input: unknown) => Promise<unknown>;
}

export function createRpcHandler(
  deps: RouterDependencies,
): (event: H3Event) => Promise<Response> {
  // ─── Pre-instanciar handlers H3Event ────────────────────────────────────
  const requestOtpH3 = asBridgeHandler(createRequestOtpHandler(deps));
  const verifyOtpH3 = asBridgeHandler(createVerifyOtpHandler(deps));
  const logoutH3 = asBridgeHandler(createLogoutHandler(deps));
  const sessionH3 = asBridgeHandler(createSessionHandler(deps));

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

  const typesForFormH3 = createListTypesForFormHandler(deps);
  const categoriesByTypeH3 = createListCategoriesByTypeHandler(deps);

  // ─── Tabla de dispatch (METHOD + PATH → procedure) ─────────────────────
  // Helper: wrap del handler H3Event en un procedure-shape ORPC.
  const wrapPost = (h3: H3Handler, path: string): ProcedureEntry["run"] => {
    return async (event: H3Event, input: unknown) => {
      // SAFETY: el cast `event as H3Event` es porque nitro garantiza H3Event;
      // el base pasado al bridge es el H3Event real (no un wrapper).
      const hybrid = buildH3EventFromBase(event, {
        method: "POST",
        path: `/rpc${path}`,
        body: input,
      });
      return invokeH3HandlerAndParse(h3, hybrid);
    };
  };
  const wrapGet = (h3: H3Handler, path: string): ProcedureEntry["run"] => {
    return async (event: H3Event, _input: unknown) => {
      const hybrid = buildH3EventFromBase(event, {
        method: "GET",
        path: `/rpc${path}`,
      });
      return invokeH3HandlerAndParse(h3, hybrid);
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

    // Legacy endpoints sin contrato (siguen funcionando con la API vieja)
    if (path === "/rpc/tasks/types-for-form") {
      return typesForFormH3(event);
    }
    if (path === "/rpc/tasks/categories-by-type") {
      return categoriesByTypeH3(event);
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
        const rawBody = await event.req.json();
        input = (rawBody as { json?: unknown; data?: unknown })?.json;
      } catch (parseError) {
        console.error("[rpc] body parse failed:", parseError);
      }
    }

    // Ejecutar la procedure
    let output: unknown;
    try {
      output = await entry.run(event, input);
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
