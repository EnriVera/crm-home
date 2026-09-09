import { implement } from "@orpc/server";
import { RPCHandler } from "@orpc/server/fetch";
import type { H3Event } from "h3";
import { healthContract } from "@crm/types";
import type { GetHealth } from "../application/health/get-health";
import {
  createLogoutHandler,
  createRequestOtpHandler,
  createSessionHandler,
  createVerifyOtpHandler,
  type AuthRouteDependencies,
} from "./auth/auth-routes";

export interface RouterDependencies extends AuthRouteDependencies {
  getHealth: GetHealth;
}

function createHealthRpcHandler(getHealth: GetHealth) {
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

export function createRpcHandler(
  deps: RouterDependencies,
): (event: H3Event) => Promise<Response> {
  const healthHandler = createHealthRpcHandler(deps.getHealth);
  const requestOtp = createRequestOtpHandler(deps);
  const verifyOtp = createVerifyOtpHandler(deps);
  const session = createSessionHandler(deps);
  const logout = createLogoutHandler(deps);

  return async (event: H3Event) => {
    let path: string;
    try {
      path = new URL(event.req.url).pathname;
    } catch {
      return new Response("Bad Request", { status: 400 });
    }

    if (path === "/rpc/health") {
      return healthHandler(event.req);
    }

    if (path === "/rpc/auth/request-otp") {
      const result = await requestOtp(event);
      return result instanceof Response ? result : Response.json(result);
    }

    if (path === "/rpc/auth/verify-otp") {
      const result = await verifyOtp(event);
      return Response.json(result);
    }

    if (path === "/rpc/auth/session") {
      const result = await session(event);
      return result instanceof Response ? result : Response.json(result);
    }

    if (path === "/rpc/auth/logout") {
      const result = await logout(event);
      return Response.json(result);
    }

    return new Response("Not Found", { status: 404 });
  };
}
