import { createORPCClient } from "@orpc/client";
import { RPCLink } from "@orpc/client/fetch";
import type { ContractRouterClient } from "@orpc/contract";
import type { authContract } from "@crm/types";

const ALLOWED_BASE_URL_PATTERN =
  /^(\/|[a-zA-Z][a-zA-Z0-9+.-]*:\/\/[^\s/$.?#].[^\s]*)$/;

export type RpcClient = ContractRouterClient<typeof authContract>;

export function createRpcClient(baseURL: string): RpcClient {
  if (!ALLOWED_BASE_URL_PATTERN.test(baseURL)) {
    throw new Error("Invalid RPC base URL");
  }

  return createORPCClient(
    new RPCLink({
      url: baseURL,
      fetch: (request, init) =>
        fetch(request, { ...init, credentials: "include" }),
    }),
  );
}
