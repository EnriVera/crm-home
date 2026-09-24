import type { H3Event } from "h3";

/**
 * Bridge entre el protocolo ORPC (procedures con shape `({ input, context }) =>
 * Promise<output>`) y los handlers H3Event existentes en `auth-routes.ts` /
 * `tasks-routes.ts` (que reciben `H3Event` y devuelven `Response`).
 *
 * Por qué existe:
 * El router custom previo (`if (path === "/rpc/...") return handler(event)`)
 * devolvía JSON crudo, incompatible con el cliente `@orpc/client` v1.15 que
 * envía `{ data: input }` y espera `{ data: output }` o un error con `code`
 * discriminado. El bridge permite migrar el router a `RPCHandler` canónico de
 * ORPC sin tocar los handlers de dominio (que ya tienen su mapping de errores
 * y de cookies de sesión vía `setSessionCookie`).
 *
 * Funcionamiento:
 * 1. `buildH3Event` materializa un `H3Event` standalone (cuando no hay base).
 * 2. `buildH3EventFromBase` materializa un H3Event que comparte `node.req` y
 *    `node.res` con el H3Event original de nitro, de modo que los handlers que
 *    setean cookies (`setSessionCookie` en `auth-routes.ts`) escriben sobre el
 *    `node.res` real, y nitro propaga esos headers al cliente.
 * 3. `invokeH3HandlerAndParse` ejecuta el handler H3Event y devuelve el body
 *    JSON parseado si 2xx; tira `BridgeHttpError` con code discriminado si 4xx/5xx.
 */

export interface OrpcContext {
  /** H3Event original de nitro (para que los wrappers reusen `node.res`). */
  readonly h3Event: H3Event;
  /** Headers del request original (lowercase keys). */
  readonly headers: Record<string, string>;
  /** Cookies del request original parseadas (clave → valor). */
  readonly cookies: Record<string, string>;
}

export interface BuildH3EventOptions {
  method: "GET" | "POST";
  /** Path completo incluyendo prefijo `/rpc/...` (se usa solo como URL interna). */
  path: string;
  /** Body JSON (o undefined para GET / no-body). */
  body?: unknown;
  /** Query string parseada como objeto (e.g. `{ query: "acme", limit: 10 }`). */
  query?: Record<string, string | number | boolean>;
  /** Headers del context ORPC, ya saneados. */
  headers?: Record<string, string>;
  /** Cookies del context ORPC. */
  cookies?: Record<string, string>;
}

/**
 * Construye un `H3Event` standalone con un `Request` interno que los helpers
 * de h3 (`readValidatedBody`, `getHeader`, `getQuery`) pueden leer. Usado solo
 * para tests o cuando no hay un H3Event original disponible.
 */
export function buildH3Event(options: BuildH3EventOptions): H3Event {
  const queryString =
    options.query && Object.keys(options.query).length > 0
      ? `?${new URLSearchParams(
          Object.entries(options.query).map(([k, v]) => [k, String(v)]),
        ).toString()}`
      : "";
  const url = `http://internal${options.path}${queryString}`;

  const headerEntries: Record<string, string> = {
    "content-type": "application/json",
    ...(options.headers ?? {}),
  };

  const bodyString =
    options.body !== undefined && options.method === "POST"
      ? JSON.stringify(options.body)
      : null;

  // Use Blob for the body instead of a raw string. In some Node.js + undici
  // combinations, `new Request(url, { body: "string" })` doesn't expose the
  // body via `.text()` reliably — the Blob wrapper goes through the standard
  // ReadableStream path that h3 v2's `readBody` expects.
  //
  // Headers: el mismo `headersObj` (con cookie ya mergeada de `options.cookies`)
  // se usa TANTO para el Fetch Request (`event.req.headers`) como para
  // `node.req.headers`. Esto es crítico: `getCookie(event)` en h3 v2 lee de
  // `event.req.headers.get("cookie")` (no de `node.req.headers`). Si el cookie
  // vive solo en `node.req.headers`, los handlers que llaman `getCookie(event,
  // "crm_session")` siempre ven undefined → 401 en cualquier endpoint que
  // valide sesión (todas las procedures auth + tasks bajo `requireSession`).
  const headersObj = new Headers(headerEntries);
  if (options.cookies) {
    const cookieHeader = Object.entries(options.cookies)
      .map(([k, v]) => `${k}=${v}`)
      .join("; ");
    if (cookieHeader) headersObj.set("cookie", cookieHeader);
  }

  const request = new Request(url, {
    method: options.method,
    headers: headersObj,
    body:
      bodyString === null
        ? null
        : new Blob([bodyString], { type: "application/json" }),
  });

  // SAFETY: Materialización de un H3Event para invocar handlers H3Event-shaped
  // desde un procedure ORPC. Los campos poblados (`req`, `node.req.headers/url/method`,
  // `node.res` con setHeader/getHeader/end stubs, `context`) son los mínimos
  // que `readValidatedBody`, `getHeader`, `getQuery` y `setSessionCookie` leen
  // en los handlers existentes (auth-routes.ts, tasks-routes.ts). El cast
  // `as unknown as H3Event` es necesario porque `node.req/res` aceptan shapes
  // parciales que el tipo completo de H3Event no declara como opcionales.
  return {
    req: request,
    node: {
      req: {
        headers: headersObj,
        url,
        method: options.method,
      } as never,
      res: {
        setHeader: () => {},
        getHeader: () => undefined,
        end: () => {},
      } as never,
    },
    context: {},
  } as unknown as H3Event;
}

/**
 * Construye un H3Event que comparte `node.req.headers` y `node.res` con el
 * H3Event base (el que nitro entregó). Esto es crítico para los handlers que
 * setean cookies (e.g. `setSessionCookie` en `auth.verifyOtp`): al escribir
 * sobre `event.node.res.setHeader`, escriben al `node.res` del base, y nitro
 * propaga esos headers al cliente en la Response final.
 *
 * El `req` (Fetch Request) es NUEVO con body = `JSON.stringify(options.body)`,
 * porque el cliente ORPC envía `{data: ...}` wrap que los handlers H3Event no
 * esperan; el bridge "destraba" ese wrap entregándoles el input ORPC validado
 * directamente como body.
 */
export function buildH3EventFromBase(
  base: H3Event,
  options: BuildH3EventOptions,
): H3Event {
  // Extraemos el header `cookie` del base para propagarlo al Fetch Request
  // standalone via `options.cookies`. Sin esto, `getCookie(event)` retorna
  // undefined en cualquier procedure autenticada (el browser sí envía cookie
  // en el request al api, pero el bridge solo lo preserva en `node.req.headers`
  // y `h3 v2` lee de `event.req.headers`). El caller (router.ts) sigue
  // proveyendo el body ORPC destrabado en `options.body`.
  const baseCookieHeader = base.req?.headers?.get("cookie") ?? "";
  const forwardedCookies = baseCookieHeader
    ? Object.fromEntries(
        baseCookieHeader
          .split(";")
          .map((pair): [string, string] => {
            const eqIdx = pair.indexOf("=");
            if (eqIdx === -1) return ["", ""];
            return [pair.slice(0, eqIdx).trim(), pair.slice(eqIdx + 1).trim()];
          })
          .filter(([k]: [string, string]) => k.length > 0),
      )
    : undefined;

  const standalone = buildH3Event({
    ...options,
    ...(forwardedCookies ? { cookies: forwardedCookies } : {}),
  });
  // SAFETY: Reuso del `node.req` (headers/URL/method) y `node.res` del base.
  // Los handlers que llaman `getHeader(event, "x-user-id")` o
  // `getCookie(event, "crm_session")` leen del `event.req.headers` del hybrid
  // (h3 v2 contract), que ahora combina el body ORPC destrabado + el cookie
  // del request original. Los handlers que llaman `setCookie(event, name,
  // value, opts)` siguen escribiendo al `node.res.setHeader` del base, que es
  // el que nitro lee para construir la Response final.
  // El cast `as NonNullable<H3Event["node"]>` es necesario porque la rama
  // `?? {}` del fallback infiere `{}` sin `req/res`; sabemos que `base.node`
  // siempre está poblado en h3 v2 (los eventos entregados por nitro garantizan
  // su existencia), por lo que el fallback es solo defensivo para tests.
  const baseNode = (base.node ?? {}) as NonNullable<H3Event["node"]>;
  // SAFETY: `event.res` es la Response de nitro (writable target). h3 v2 lo usa
  // directamente para escribir headers (e.g. `setCookie` hace
  // `event.res.headers.append('set-cookie', ...)`). Sin propagar `base.res`
  // al hybrid, el cookie no llega al cliente. `event.req` se mantiene del
  // standalone (new Request con body ORPC destrabado y cookie del base) para
  // que `readValidatedBody` lea el input correcto y `getCookie`/`getHeader`
  // lean del Fetch Request. `event.node.req/res` del base mantiene la
  // referencia para que `setHeader/setCookie` propaguen al response real.
  const baseRes = (base as { res?: unknown }).res;
  // SAFETY: el cast `as unknown as H3Event` es necesario porque
  // `node.req/res` aceptan shapes parciales que el tipo completo de
  // H3Event no declara como opcionales; el spread `...standalone`
  // preserva `req` (Fetch Request nuevo con body ORPC destrabado y cookie
  // heredado del base) y `context`, `res` se propaga del base para que
  // setCookie escriba al response real de nitro, y `node` se reemplaza con
  // las referencias del base para que getHeader/getCookie/setHeader/setCookie
  // funcionen en el hybrid.
  return {
    ...standalone,
    res: baseRes,
    node: {
      req: baseNode.req,
      res: baseNode.res,
    },
  } as unknown as H3Event;
}

/**
 * Mapea status HTTP + body JSON a un `BridgeHttpError` con code discriminado.
 * Los codes coinciden con los que el cliente espera via `error.code` en el
 * frontend (ver `apps/web/src/components/organisms/login-form/login-form.logic.ts`
 * para los cases manejados en el switch).
 */

const STATUS_TO_ORPC_CODE: Record<number, string> = {
  400: "BAD_REQUEST",
  401: "UNAUTHORIZED",
  403: "FORBIDDEN",
  404: "NOT_FOUND",
  409: "CONFLICT",
  429: "RATE_LIMITED",
  500: "INTERNAL_SERVER_ERROR",
};

export class BridgeHttpError extends Error {
  readonly orpcCode: string;
  readonly status: number;
  readonly data: unknown;

  constructor(
    orpcCode: string,
    status: number,
    data: unknown,
    message?: string,
  ) {
    super(message ?? `${orpcCode} (HTTP ${status})`);
    this.name = "BridgeHttpError";
    this.orpcCode = orpcCode;
    this.status = status;
    this.data = data;
  }
}

export async function bridgeHttpErrorFromResponse(
  response: Response,
): Promise<BridgeHttpError> {
  let body: unknown = null;
  try {
    body = await response.clone().json();
  } catch {
    body = null;
  }

  // Preservar el code discriminado que vino del handler (e.g. TASK_NOT_FOUND,
  // INVALID_KANBAN_ORDER) — el switch del cliente matchea por code exacto.
  const codeFromBody =
    typeof body === "object" &&
    body !== null &&
    "code" in body &&
    typeof (body as { code: unknown }).code === "string"
      ? (body as { code: string }).code
      : undefined;

  const orpcCode =
    codeFromBody ??
    STATUS_TO_ORPC_CODE[response.status] ??
    "INTERNAL_SERVER_ERROR";

  const message =
    typeof body === "object" &&
    body !== null &&
    "message" in body &&
    typeof (body as { message: unknown }).message === "string"
      ? (body as { message: string }).message
      : response.statusText;

  return new BridgeHttpError(orpcCode, response.status, body, message);
}

/**
 * Helper de composición: ejecuta el handler H3Event sobre un `H3Event`
 * materializado a partir del input ORPC, y devuelve el body JSON si 2xx.
 * Si 4xx/5xx, tira `BridgeHttpError` con code discriminado.
 *
 * El handler puede devolver `Response` (e.g. `Response.json(result)`) o un
 * objeto plano (e.g. `{ ok: true }` cuando el handler hace `return result`
 * directamente, como en `createRequestOtpHandler` happy path). El bridge
 * normaliza ambos casos a un body JSON.
 */
export async function invokeH3HandlerAndParse<T>(
  handler: (event: H3Event) => Promise<Response | unknown>,
  event: H3Event,
): Promise<T> {
  const result = await handler(event);
  // El handler devolvió un objeto plano (no Response): parseamos como JSON.
  if (!(result instanceof Response)) {
    return result as T;
  }
  // Es un Response — manejamos status code + body.
  if (result.status >= 400) {
    throw await bridgeHttpErrorFromResponse(result);
  }
  // Algunos handlers devuelven 204 No Content o body vacío.
  const text = await result.text();
  if (!text) return undefined as T;
  try {
    return JSON.parse(text) as T;
  } catch (parseError) {
    throw new BridgeHttpError(
      "INTERNAL_SERVER_ERROR",
      500,
      { rawBody: text },
      `Handler returned non-JSON response: ${parseError instanceof Error ? parseError.message : String(parseError)}`,
    );
  }
}

/**
 * Extrae los headers del H3Event base en un objeto lowercase-keyed. Útil
 * para construir el context ORPC al inicio del `RPCHandler.handle()`.
 */
export function extractHeadersFromH3Event(
  event: H3Event,
): Record<string, string> {
  const headers: Record<string, string> = {};
  // h3 v2 expone headers en `event.req.headers` (Fetch API Headers).
  const fetchHeaders = event.req?.headers;
  if (fetchHeaders) {
    fetchHeaders.forEach((value, key) => {
      headers[key.toLowerCase()] = value;
    });
  }
  return headers;
}

/**
 * Parsea el header `cookie` del H3Event base en un objeto clave→valor.
 */
export function extractCookiesFromH3Event(
  event: H3Event,
): Record<string, string> {
  const cookieHeader = event.req?.headers.get("cookie");
  if (!cookieHeader) return {};
  const cookies: Record<string, string> = {};
  for (const pair of cookieHeader.split(";")) {
    const trimmed = pair.trim();
    if (!trimmed) continue;
    const eqIdx = trimmed.indexOf("=");
    if (eqIdx === -1) continue;
    const name = trimmed.slice(0, eqIdx).trim();
    const value = trimmed.slice(eqIdx + 1).trim();
    if (name) cookies[name] = value;
  }
  return cookies;
}
