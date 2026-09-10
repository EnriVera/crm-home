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

 const link = new RPCLink({
  url: baseURL,
  fetch: (request, init) => fetch(request, { ...init, credentials: "include" }),
 });

 return {
  auth: createORPCClient(link),
  tasks: createORPCClient(link),
 };
}
