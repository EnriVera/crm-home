import { beforeEach, describe, expect, test } from "bun:test";
import type { H3Event } from "h3";

// UUIDs válidos para el schema zod `uuidSchema` (formato RFC 4122 v1-8).
const T1 = "01943f20-7c73-7d20-9471-0e4b5f0d3a01";
const T2 = "01943f20-7c73-7d20-9471-0e4b5f0d3a02";
const S1 = "01943f20-7c73-7d20-9471-0e4b5f0d3a11";
const S2 = "01943f20-7c73-7d20-9471-0e4b5f0d3a12";
const TYPE_1 = "01943f20-7c73-7d20-9471-0e4b5f0d3a21";
const MISSING = "01943f20-7c73-7d20-9471-0e4b5f0d3aff";
import {
  InvalidKanbanOrder,
  TaskNotFound,
  TaskStateNotFound,
  Unauthorized,
} from "../../application/tasks/errors";
import type { CreateTask } from "../../application/tasks/create-task";
import type { GetTask } from "../../application/tasks/get-task";
import type { ListTasks } from "../../application/tasks/list-tasks";
import type { MoveTask } from "../../application/tasks/move-task";
import { mapTaskErrorToStatus } from "./error-mapping";
import {
  createCreateTaskHandler,
  createGetTaskHandler,
  createMoveTaskHandler,
  type TasksRouteDependencies,
} from "./tasks-routes";

// ─── Mocks ──────────────────────────────────────────────────────────────────

interface MockUseCases {
  listTasks: { execute: ReturnType<typeof mockFn> };
  getTask: { execute: ReturnType<typeof mockFn> };
  createTask: { execute: ReturnType<typeof mockFn> };
  moveTask: { execute: ReturnType<typeof mockFn> };
}

function mockFn() {
  const calls: unknown[][] = [];
  const fn = (...args: unknown[]) => {
    calls.push(args);
    return undefined;
  };
  (fn as unknown as { calls: unknown[][] }).calls = calls;
  return fn;
}

function buildDeps(): { deps: TasksRouteDependencies; mocks: MockUseCases } {
  // IMPORTANTE: deps.* y mocks.* deben compartir la MISMA referencia al objeto
  // mock, para que mutar `mocks.x.execute = newFn` realmente afecte lo que el
  // handler invoca.
  const listTasksMock = { execute: mockFn() };
  const getTaskMock = { execute: mockFn() };
  const createTaskMock = { execute: mockFn() };
  const moveTaskMock = { execute: mockFn() };
  const updateTaskMock = { execute: mockFn() };
  const deleteTaskMock = { execute: mockFn() };
  const listTaskStatesMock = { execute: mockFn() };
  const createTaskStateMock = { execute: mockFn() };
  const updateTaskStateMock = { execute: mockFn() };
  const deleteTaskStateMock = { execute: mockFn() };
  const reorderTaskStatesMock = { execute: mockFn() };
  const listClientsMock = { execute: mockFn() };
  const listTypesMock = { execute: mockFn() };
  const listCategoriesMock = { execute: mockFn() };

  const deps: TasksRouteDependencies = {
    listTasks: listTasksMock as unknown as ListTasks,
    getTask: getTaskMock as unknown as GetTask,
    createTask: createTaskMock as unknown as CreateTask,
    updateTask:
      updateTaskMock as unknown as TasksRouteDependencies["updateTask"],
    moveTask: moveTaskMock as unknown as MoveTask,
    deleteTask:
      deleteTaskMock as unknown as TasksRouteDependencies["deleteTask"],
    listTaskStates:
      listTaskStatesMock as unknown as TasksRouteDependencies["listTaskStates"],
    createTaskState:
      createTaskStateMock as unknown as TasksRouteDependencies["createTaskState"],
    updateTaskState:
      updateTaskStateMock as unknown as TasksRouteDependencies["updateTaskState"],
    deleteTaskState:
      deleteTaskStateMock as unknown as TasksRouteDependencies["deleteTaskState"],
    reorderTaskStates:
      reorderTaskStatesMock as unknown as TasksRouteDependencies["reorderTaskStates"],
    listClientsForSelector:
      listClientsMock as unknown as TasksRouteDependencies["listClientsForSelector"],
    listTypesForForm:
      listTypesMock as unknown as TasksRouteDependencies["listTypesForForm"],
    listCategoriesByType:
      listCategoriesMock as unknown as TasksRouteDependencies["listCategoriesByType"],
  };

  const mocks: MockUseCases = {
    listTasks: listTasksMock,
    getTask: getTaskMock,
    createTask: createTaskMock,
    moveTask: moveTaskMock,
  };

  return { deps, mocks };
}

function makeEvent(
  body: unknown,
  headers: Record<string, string> = {},
): H3Event {
  // h3 v2 lee el body vía Fetch API (event.req.text()), no del legacy node.req.body.
  const request = new Request("http://localhost/rpc/tasks/test", {
    method: "POST",
    headers: new Headers(headers),
    body: JSON.stringify(body),
  });
  return {
    req: request,
    node: {
      req: { headers: new Headers(headers) } as never,
      res: {} as never,
    },
  } as unknown as H3Event;
}

// ─── Tests ──────────────────────────────────────────────────────────────────

describe("mapTaskErrorToStatus", () => {
  test("TaskNotFound → 404 con code TASK_NOT_FOUND", () => {
    const r = mapTaskErrorToStatus(new TaskNotFound());
    expect(r.status).toBe(404);
    expect(r.body.code).toBe("TASK_NOT_FOUND");
  });

  test("TaskStateNotFound → 404", () => {
    const r = mapTaskErrorToStatus(new TaskStateNotFound());
    expect(r.status).toBe(404);
    expect(r.body.code).toBe("TASK_STATE_NOT_FOUND");
  });

  test("InvalidKanbanOrder → 409", () => {
    const r = mapTaskErrorToStatus(new InvalidKanbanOrder());
    expect(r.status).toBe(409);
    expect(r.body.code).toBe("INVALID_KANBAN_ORDER");
  });

  test("Unauthorized → 401", () => {
    const r = mapTaskErrorToStatus(new Unauthorized());
    expect(r.status).toBe(401);
    expect(r.body.code).toBe("UNAUTHORIZED");
  });

  test("Unknown error → 500 INTERNAL_ERROR", () => {
    const r = mapTaskErrorToStatus(new Error("boom"));
    expect(r.status).toBe(500);
    expect(r.body.code).toBe("INTERNAL_ERROR");
  });
});

describe("createMoveTaskHandler — wrapping + error mapping", () => {
  let deps: TasksRouteDependencies;
  let mocks: MockUseCases;

  beforeEach(() => {
    ({ deps, mocks } = buildDeps());
  });

  test("happy path: pasa userId (header) + body al caso de uso; responde 200 con {ok:true}", async () => {
    const handler = createMoveTaskHandler(deps);
    const event = makeEvent(
      {
        task_id: T1,
        target_state_id: S2,
        prev_task_id: T2,
        next_task_id: S2,
      },
      { "x-user-id": "u1" },
    );

    const res = await handler(event);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toEqual({ ok: true });
    expect(
      (mocks.moveTask.execute as unknown as { calls: unknown[][] }).calls
        .length,
    ).toBe(1);
    const [input] = (
      mocks.moveTask.execute as unknown as { calls: unknown[][] }
    ).calls[0]!;
    expect(input).toEqual({
      userId: "u1",
      taskId: T1,
      targetStateId: S2,
      prevTaskId: T2,
      nextTaskId: S2,
    });
  });

  test("InvalidKanbanOrder del use case → 409 con code", async () => {
    (mocks.moveTask.execute as unknown as () => Promise<void>) = () => {
      throw new InvalidKanbanOrder();
    };
    const handler = createMoveTaskHandler(deps);
    const event = makeEvent(
      { task_id: T1, target_state_id: S2 },
      { "x-user-id": "u1" },
    );

    const res = await handler(event);
    expect(res.status).toBe(409);
    const body = await res.json();
    expect(body.code).toBe("INVALID_KANBAN_ORDER");
  });

  test("falta X-User-Id header → 401 UNAUTHORIZED", async () => {
    const handler = createMoveTaskHandler(deps);
    const event = makeEvent({ task_id: T1, target_state_id: S2 });

    const res = await handler(event);
    expect(res.status).toBe(401);
    const body = await res.json();
    expect(body.code).toBe("UNAUTHORIZED");
  });
});

describe("createGetTaskHandler — translate snake_case → camelCase domain", () => {
  let deps: TasksRouteDependencies;
  let mocks: MockUseCases;

  beforeEach(() => {
    ({ deps, mocks } = buildDeps());
  });

  test("happy path: mapea TaskRow a wire Task (snake_case)", async () => {
    (mocks.getTask.execute as unknown as () => Promise<unknown>) = () =>
      Promise.resolve({
        id: T1,
        userId: "u1",
        title: "Mi task",
        description: null,
        clientId: null,
        typeId: TYPE_1,
        categoryId: null,
        stateId: S1,
        kanbanOrder: 1024,
        createdAt: new Date("2026-01-01T00:00:00.000Z"),
        updatedAt: new Date("2026-01-01T00:00:00.000Z"),
        deletedAt: null,
      });
    const handler = createGetTaskHandler(deps);
    const event = makeEvent({ task_id: T1 }, { "x-user-id": "u1" });

    const res = await handler(event);
    const body = await res.json();
    expect(body.task_id).toBe(T1);
    expect(body.task_title).toBe("Mi task");
    expect(body.task_tast_id).toBe(S1);
    expect(body.task_kanban_order).toBe(1024);
  });

  test("TaskNotFound → 404", async () => {
    (mocks.getTask.execute as unknown as () => Promise<unknown>) = () => {
      throw new TaskNotFound();
    };
    const handler = createGetTaskHandler(deps);
    const event = makeEvent({ task_id: MISSING }, { "x-user-id": "u1" });

    const res = await handler(event);
    expect(res.status).toBe(404);
  });
});

describe("createCreateTaskHandler — required field validation", () => {
  let deps: TasksRouteDependencies;

  beforeEach(() => {
    ({ deps } = buildDeps());
  });

  test("falta task_type_id → 400 INVALID_INPUT", async () => {
    const handler = createCreateTaskHandler(deps);
    const event = makeEvent(
      {
        task_title: "X",
        task_tast_id: S1,
        task_type_id: null,
      },
      { "x-user-id": "u1" },
    );

    const res = await handler(event);
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.code).toBe("INVALID_INPUT");
  });

  test("falta task_tast_id → 400 INVALID_INPUT", async () => {
    const handler = createCreateTaskHandler(deps);
    const event = makeEvent(
      {
        task_title: "X",
        task_type_id: TYPE_1,
        // task_tast_id faltante
      },
      { "x-user-id": "u1" },
    );

    const res = await handler(event);
    expect(res.status).toBe(400);
  });
});
