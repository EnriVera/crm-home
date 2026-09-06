import { implement } from "@orpc/server";
import { RPCHandler } from "@orpc/server/fetch";
import { healthContract } from "@crm/types";
import type { GetHealth } from "../application/health/get-health";

// Router orpc (D5): procedimiento `health` sobre el contrato compartido de
// @crm/types, montado en /rpc/* por el composition root. Delega en el mismo
// caso de uso GetHealth que la ruta h3.
export function createRpcFetchHandler(
  getHealth: GetHealth,
): (request: Request) => Promise<Response> {
  const pub = implement({ health: healthContract });
  const router = pub.router({
    health: pub.health.handler(() => getHealth.execute()),
  });
  const rpcHandler = new RPCHandler(router);

  return async (request: Request) => {
    const { response, matched } = await rpcHandler.handle(request, {
      prefix: "/rpc",
      context: {},
    });
    if (!matched) {
      return new Response("Not Found", { status: 404 });
    }
    return response;
  };
}
