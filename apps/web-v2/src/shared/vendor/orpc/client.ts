/**
 * orpc client — the only place in the app that imports @orpc/client.
 *
 * Uses the `RPCLink` transport from `@orpc/client/fetch`. The orpc
 * router type comes from the backend bridge; for now the client is typed
 * as a generic `NestedClient<any>` and gets full type safety once the
 * backend exports its router type into @crm/api-bridge.
 */
import { createORPCClient, type NestedClient } from "@orpc/client";
import { RPCLink } from "@orpc/client/fetch";

const baseURL = (import.meta.env.VITE_API_URL ?? "http://localhost:3000").replace(/\/$/, "");

const link = new RPCLink({
  url: `${baseURL}/rpc`,
  headers: () => ({
    "Content-Type": "application/json",
  }),
  fetch: (input, init) =>
    fetch(input, {
      ...init,
      credentials: "include",
    }),
});

/** Generic until the backend bridge is wired in @crm/api-bridge. */
export const orpcClient: NestedClient<Record<string, unknown>> = createORPCClient(link);

export type AppOrpcClient = typeof orpcClient;
