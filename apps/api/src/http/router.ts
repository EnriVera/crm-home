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
import {
  createListCategoriesByTypeHandler,
  createListClientsSearchHandler as createClientsSearchHandler,
  createCreateTaskHandler,
  createCreateTaskStateHandler,
  createGetTaskHandler,
  createListTaskStatesHandler,
  createListTasksHandler,
  createMoveTaskHandler,
  createRemoveTaskHandler,
  createRemoveTaskStateHandler,
  createReorderTaskStatesHandler,
  createListTypesForFormHandler as createTypesForFormHandler,
  createUpdateTaskHandler,
  createUpdateTaskStateHandler,
  type TasksRouteDependencies,
} from "./tasks/tasks-routes";

export interface RouterDependencies
  extends AuthRouteDependencies,
    TasksRouteDependencies {
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

  // Tasks handlers
  const listTasks = createListTasksHandler(deps);
  const getTask = createGetTaskHandler(deps);
  const createTask = createCreateTaskHandler(deps);
  const updateTask = createUpdateTaskHandler(deps);
  const moveTask = createMoveTaskHandler(deps);
  const removeTask = createRemoveTaskHandler(deps);
  const listTaskStates = createListTaskStatesHandler(deps);
  const createTaskState = createCreateTaskStateHandler(deps);
  const updateTaskState = createUpdateTaskStateHandler(deps);
  const removeTaskState = createRemoveTaskStateHandler(deps);
  const reorderTaskStates = createReorderTaskStatesHandler(deps);
  const clientsSearch = createClientsSearchHandler(deps);
  const typesForForm = createTypesForFormHandler(deps);
  const categoriesByType = createListCategoriesByTypeHandler(deps);

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

    // Tasks — patrón preservado: if (path === "/rpc/...") sin RPCHandler wrapper.
    if (path === "/rpc/tasks/list") return listTasks(event);
    if (path === "/rpc/tasks/get") return getTask(event);
    if (path === "/rpc/tasks/create") return createTask(event);
    if (path === "/rpc/tasks/update") return updateTask(event);
    if (path === "/rpc/tasks/move") return moveTask(event);
    if (path === "/rpc/tasks/remove") return removeTask(event);
    if (path === "/rpc/tasks/states/list") return listTaskStates(event);
    if (path === "/rpc/tasks/states/create") return createTaskState(event);
    if (path === "/rpc/tasks/states/update") return updateTaskState(event);
    if (path === "/rpc/tasks/states/remove") return removeTaskState(event);
    if (path === "/rpc/tasks/states/reorder") return reorderTaskStates(event);
    if (path === "/rpc/tasks/clients/search") return clientsSearch(event);
    if (path === "/rpc/tasks/types-for-form") return typesForForm(event);
    if (path === "/rpc/tasks/categories-by-type") return categoriesByType(event);

    return new Response("Not Found", { status: 404 });
  };
}
