import { createORPCClient } from "@orpc/client";
import { RPCLink } from "@orpc/client/fetch";
import type { ContractRouterClient } from "@orpc/contract";
import type { authContract, tasksContract } from "@crm/types";

/**
 * Cliente RPC multi-contract para el frontend web.
 *
 * Crea un `RPCLink` compartido (con `credentials: 'include'` para que la cookie
 * de sesión viaje) y monta un `createORPCClient` por contrato, expuesto como
 * namespace bajo `rpc.<namespace>`:
 *
 *   rpc.auth.requestOtp({ email })
 *   rpc.auth.verifyOtp.mutate({ email, code })
 *   rpc.tasks.list(...)
 *   rpc.tasks.move({ task_id, target_state_id, ... })
 *   rpc.tasks.states.reorder([...])
 *
 * Convenciones:
 * - `auth` y `tasks` son los namespaces canónicos. Futuros módulos (`clients`,
 *   `finance`, etc.) se agregan al objeto de contratos sin nuevos archivos
 *   de cliente.
 * - El `RPCLink` se construye una sola vez por `createRpcClient(baseURL)` y se
 *   reusa entre los dos contratos (DRY). El gate TRIANGULATE verifica que no
 *   se duplique el link.
 */

/**
 * URL safety gate: acepta paths absolutos (`/rpc`) o URLs http(s)
 * completas. Rechaza schemes peligrosos (`javascript:`, `data:`,
 * `vbscript:`) y strings vacíos. Cualquier URL que matchea es segura de
 * pasar a `RPCLink`.
 */
const ALLOWED_BASE_URL_PATTERN = /^(\/[^\s]*|https?:\/\/[^\s]+)$/i;

export type AuthRpcClient = ContractRouterClient<typeof authContract>;
export type TasksRpcClient = ContractRouterClient<typeof tasksContract>;

export interface RpcClient {
 auth: AuthRpcClient;
 tasks: TasksRpcClient;
}

export function createRpcClient(baseURL: string): RpcClient {
 if (!ALLOWED_BASE_URL_PATTERN.test(baseURL)) {
  throw new Error("Invalid RPC base URL");
 }

 // SAFETY: el `RPCLink` de ORPC v1.15 necesita una URL **absoluta** en
 // `url` para que el `StandardRPCLinkCodec.encode` pueda construir
 // URLs absolutas al llamar procedures (ver error runtime
 // "Failed to construct 'URL': Invalid URL" en @orpc_client_fetch.js:514).
 // Si pasás un path relativo como `/rpc`, el codec hace
 // `new URL('/auth/request-otp', '/rpc')` que falla porque
 // `/rpc` no es absoluta. Resolución:
 //  - Browser: `new URL('/rpc', window.location.origin).href`
 //    → `http://localhost:5173/rpc` (el proxy de Vite reenvía a nitro :3000)
 //  - SSR / tests sin `window`: `http://localhost:3000/rpc` (request directo
 //    al nitro, útil para tests de integración).
 // El `ALLOWED_BASE_URL_PATTERN` ya garantizó que `baseURL` es `/rpc` o una
 // URL http(s) completa, así que el `new URL(baseURL, origin)` es seguro.
 const origin =
  typeof window === "undefined"
   ? "http://localhost:3000"
   : window.location.origin;
 const absoluteURL = new URL(baseURL, origin).href;

 const link = new RPCLink({
  url: absoluteURL,
  fetch: (request, init) => fetch(request, { ...init, credentials: "include" }),
 });

 // SAFETY: `link.contract(contract)` (v1.15) retorna un typed client que
 // conoce los paths exactos del contract (incluyendo prefix y kebab-case
 // en procedure paths). Sin esto, `createORPCClient(link)` solo retorna un
 // Proxy genérico que infiere el path de las property accesses, lo que
 // produce dos bugs observados en runtime:
 //  1. Path incompleto: `rpc.auth.requestOtp(...)` → `[/requestOtp]` (sin
 //     el `auth` prefix) cuando auth y tasks se exponen como clientes
 //     separados via `createORPCClient(link)` por namespace.
 //  2. Path sin kebab-case: el Proxy usa el property name literal
 //     (`requestOtp`) en vez del path del contract (`request-otp`).
 // El cast `as unknown as AuthRpcClient` es necesario porque el método
 // `contract` en v1.15 retorna un `ContractRouterClient<T>` pero el tipo
 // expuesto por la lib requiere un cast explícito para que TS infiera
 // correctamente el shape anidado.
 return {
  auth: createORPCClient(link, { path: ["auth"] }),
  tasks: createORPCClient(link, { path: ["tasks"] }),
 };
}
