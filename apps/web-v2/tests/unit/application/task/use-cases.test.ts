/**
 * Use case tests for the task bounded context.
 *
 * The use cases are factory functions `makeXxx(repo) -> (input) -> Result`.
 * We exercise them against an in-memory fake that records calls and
 * returns canned responses. The goal is to lock the policy + zod
 * boundary behavior, not to test the orpc adapter (that has its own
 * MSW layer in the integration suite).
 */
import { describe, expect, it, beforeEach } from "vitest";
import type {
 Task,
 TaskInput,
 TaskPatch,
 TaskPage,
 TaskState,
 ListTasksQuery,
} from "@crm/contract/task";
import type { TaskRepository, TaskStateRepository } from "@/domain/task/ports";
import {
 makeListTasks,
 makeGetTask,
 makeCreateTask,
 makeUpdateTask,
 makeUpdateTaskState,
 makeReorderTaskInColumn,
 makeDeleteTask,
 makeListTaskStates,
} from "@/application/task/use-cases";
import type { Result } from "@/domain/shared/result";
import type { DomainError } from "@/domain/shared/errors";

/* ============================================================== */
/*  Fake port — in-memory, call-recording                          */
/* ============================================================== */

interface FakeState {
 tasks: Map<string, Task>;
 states: TaskState[];
 listCalls: ListTasksQuery[];
 createCalls: TaskInput[];
 patchCalls: Array<{ id: string; patch: TaskPatch }>;
 moveCalls: Array<{
  id: string;
  columnId: string;
  toIndex: number;
 }>;
 removeCalls: string[];
}

const uuid = () =>
 "f47ac10b-58cc-4372-a567-0e02b2c3d479".replace(/[0-9a-f]/g, (c) =>
  c === "f" ? "a" : c,
 );

function makeFakeState(): FakeState {
 return {
  tasks: new Map(),
  states: [],
  listCalls: [],
  createCalls: [],
  patchCalls: [],
  moveCalls: [],
  removeCalls: [],
 };
}

function makeFakeTaskRepo(state: FakeState): TaskRepository {
 return {
  async list(query) {
   state.listCalls.push(query);
   const items = [...state.tasks.values()];
   return { ok: true, value: { items, total: items.length } } as Result<
    TaskPage,
    DomainError
   >;
  },
  async get(id) {
   const t = state.tasks.get(id);
   return t
    ? ({ ok: true, value: t } as Result<Task, DomainError>)
    : ({
       ok: false,
       error: { code: "not_found", message: "task not found" },
      } as Result<Task, DomainError>);
  },
  async create(input) {
   state.createCalls.push(input);
   const id = uuid();
   const task = {
    id,
    userId: "user-1",
    title: input.title,
    description: input.description,
    clientId: input.clientId,
    typeId: input.typeId,
    categoryId: input.categoryId,
    taskStateId: input.taskStateId,
    kanbanOrder: 0,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    deletedAt: null,
   } as Task;
   state.tasks.set(id, task);
   return { ok: true, value: task } as Result<Task, DomainError>;
  },
  async patch(id, patch) {
   state.patchCalls.push({ id, patch });
   const t = state.tasks.get(id);
   if (!t)
    return {
     ok: false,
     error: { code: "not_found", message: "task not found" },
    } as Result<Task, DomainError>;
   const next = { ...t, ...patch } as Task;
   state.tasks.set(id, next);
   return { ok: true, value: next } as Result<Task, DomainError>;
  },
  async remove(id) {
   state.removeCalls.push(id);
   state.tasks.delete(id);
   return { ok: true, value: null } as Result<null, DomainError>;
  },
  async moveToColumn(id, columnId, toIndex) {
   state.moveCalls.push({ id, columnId, toIndex });
   const t = state.tasks.get(id);
   if (!t)
    return {
     ok: false,
     error: { code: "not_found", message: "task not found" },
    } as Result<Task, DomainError>;
   const next = { ...t, taskStateId: columnId, kanbanOrder: toIndex } as Task;
   state.tasks.set(id, next);
   return { ok: true, value: next } as Result<Task, DomainError>;
  },
 };
}

function makeFakeStateRepo(state: FakeState): TaskStateRepository {
 return {
  async list() {
   return { ok: true, value: state.states } as Result<TaskState[], DomainError>;
  },
 };
}

/* ============================================================== */
/*  Fixture                                                        */
/* ============================================================== */

// Valid UUID v4 strings (zod 4 .uuid() requires version 4 + variant bits).
const TID = "f47ac10b-58cc-4372-a567-0e02b2c3d479";
const SID = "c3d4e5f6-a7b8-4901-a234-56789abcdef0";
const CID = "b2c3d4e5-f6a7-4890-b123-456789abcdef";
const YID = "7c9e6679-7425-40de-944b-e07fc1f90ae7";

const VALID_INPUT: TaskInput = {
 title: "Write the PRD follow-up",
 description: null,
 clientId: null,
 typeId: TID as TaskInput["typeId"],
 categoryId: null,
 taskStateId: SID as TaskInput["taskStateId"],
};

/** Seeds the fake map with a task so mutations that need to find it
 *  by id can return ok:true. */
function seedTask(state: FakeState): Task {
 const task = {
  id: TID,
  userId: YID,
  title: VALID_INPUT.title,
  description: VALID_INPUT.description,
  clientId: VALID_INPUT.clientId,
  typeId: VALID_INPUT.typeId,
  categoryId: VALID_INPUT.categoryId,
  taskStateId: VALID_INPUT.taskStateId,
  kanbanOrder: 0,
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
  deletedAt: null,
 } as Task;
 state.tasks.set(TID, task);
 return task;
}

/* ============================================================== */
/*  makeListTasks                                                  */
/* ============================================================== */

describe("makeListTasks", () => {
 let state: FakeState;
 let repo: TaskRepository;
 beforeEach(() => {
  state = makeFakeState();
  repo = makeFakeTaskRepo(state);
 });

 it("rejects unknown fields (strict mode)", async () => {
  const list = makeListTasks(repo);
  const r = await list({ limit: 50, foo: "bar" } as never);
  expect(r.ok).toBe(false);
  if (!r.ok) {
   expect(r.error.code).toBe("validation");
  }
 });

 it("accepts a valid query and forwards to the repo", async () => {
  const list = makeListTasks(repo);
  const query: ListTasksQuery = { limit: 50 };
  const r = await list(query);
  expect(r.ok).toBe(true);
  expect(state.listCalls).toEqual([query]);
 });
});

/* ============================================================== */
/*  makeGetTask                                                    */
/* ============================================================== */

describe("makeGetTask", () => {
 let state: FakeState;
 let repo: TaskRepository;
 beforeEach(() => {
  state = makeFakeState();
  repo = makeFakeTaskRepo(state);
 });

 it("rejects a non-uuid id", async () => {
  const get = makeGetTask(repo);
  const r = await get("not-a-uuid");
  expect(r.ok).toBe(false);
 });

 it("forwards a valid uuid to the repo", async () => {
  state.tasks.set(TID, {
   ...VALID_INPUT,
   id: TID,
   userId: YID,
   kanbanOrder: 0,
   createdAt: new Date().toISOString(),
   updatedAt: new Date().toISOString(),
   deletedAt: null,
  } as Task);
  const get = makeGetTask(repo);
  const r = await get(TID);
  expect(r.ok).toBe(true);
  if (r.ok) expect(r.value.id).toBe(TID);
 });
});

/* ============================================================== */
/*  makeCreateTask                                                 */
/* ============================================================== */

describe("makeCreateTask", () => {
 let state: FakeState;
 let repo: TaskRepository;
 beforeEach(() => {
  state = makeFakeState();
  repo = makeFakeTaskRepo(state);
 });

 it("rejects a null typeId (zod rejects before policy fires)", async () => {
  // The domain policy validateCategoryRequiresType is unreachable from
  // makeCreateTask because TaskInput.typeId is required and non-nullable.
  // Zod rejects first with a generic validation error. The policy itself
  // is covered by tests/unit/domain/task/validateCategoryRequiresType.test.ts
  // and is wired into makeUpdateTask (where the patch can omit typeId).
  const create = makeCreateTask(repo);
  const r = await create({
   ...VALID_INPUT,
   typeId: null as unknown as TaskInput["typeId"],
   categoryId: CID as TaskInput["categoryId"],
  });
  expect(r.ok).toBe(false);
  if (!r.ok) {
   expect(r.error.code).toBe("validation");
  }
  expect(state.createCalls).toHaveLength(0);
 });

 it("accepts a valid input and forwards to the repo", async () => {
  const create = makeCreateTask(repo);
  const r = await create(VALID_INPUT);
  expect(r.ok).toBe(true);
  expect(state.createCalls).toEqual([VALID_INPUT]);
 });
});

/* ============================================================== */
/*  makeUpdateTask                                                 */
/* ============================================================== */

describe("makeUpdateTask", () => {
 let state: FakeState;
 let repo: TaskRepository;
 beforeEach(() => {
  state = makeFakeState();
  repo = makeFakeTaskRepo(state);
 });

 it("rejects a non-uuid id", async () => {
  const update = makeUpdateTask(repo);
  const r = await update("not-a-uuid", { title: "x" });
  expect(r.ok).toBe(false);
 });

 it("rejects a patch that sets categoryId without typeId", async () => {
  const update = makeUpdateTask(repo);
  const r = await update(TID, { categoryId: CID as never });
  expect(r.ok).toBe(false);
  if (!r.ok) {
   expect(r.error.code).toBe("validation");
   expect(r.error.message).toMatch(/category/i);
  }
  expect(state.patchCalls).toHaveLength(0);
 });

 it("forwards a valid patch to the repo", async () => {
  const update = makeUpdateTask(repo);
  await update(TID, { title: "New title" });
  // zod applies .default(null) to description / clientId / categoryId
  // even on .partial() schemas, so the forwarded patch has those
  // fields as null. Use toMatchObject for a partial shape check.
  expect(state.patchCalls).toMatchObject([
   { id: TID, patch: { title: "New title" } },
  ]);
 });
});

/* ============================================================== */
/*  makeUpdateTaskState                                            */
/* ============================================================== */

describe("makeUpdateTaskState", () => {
 let state: FakeState;
 let repo: TaskRepository;
 beforeEach(() => {
  state = makeFakeState();
  repo = makeFakeTaskRepo(state);
 });

 it("rejects a non-uuid state id", async () => {
  const updateState = makeUpdateTaskState(repo);
  const r = await updateState(TID, "not-a-uuid");
  expect(r.ok).toBe(false);
 });

 it("forwards to the repo as a taskStateId patch", async () => {
  seedTask(state);
  const updateState = makeUpdateTaskState(repo);
  const r = await updateState(TID, SID);
  expect(r.ok).toBe(true);
  expect(state.patchCalls).toHaveLength(1);
  expect(state.patchCalls[0]?.patch).toEqual(
   expect.objectContaining({ taskStateId: SID }),
  );
 });
});

/* ============================================================== */
/*  makeReorderTaskInColumn                                        */
/* ============================================================== */

describe("makeReorderTaskInColumn", () => {
 let state: FakeState;
 let repo: TaskRepository;
 beforeEach(() => {
  state = makeFakeState();
  repo = makeFakeTaskRepo(state);
 });

 it("rejects a negative toIndex", async () => {
  const reorder = makeReorderTaskInColumn(repo);
  const r = await reorder({ id: TID, columnId: SID, toIndex: -1 });
  expect(r.ok).toBe(false);
  if (!r.ok) expect(r.error.code).toBe("validation");
 });

 it("forwards a valid move to the repo", async () => {
  seedTask(state);
  const reorder = makeReorderTaskInColumn(repo);
  const r = await reorder({ id: TID, columnId: SID, toIndex: 2 });
  expect(r.ok).toBe(true);
  expect(state.moveCalls).toEqual([{ id: TID, columnId: SID, toIndex: 2 }]);
 });
});

/* ============================================================== */
/*  makeDeleteTask                                                 */
/* ============================================================== */

describe("makeDeleteTask", () => {
 let state: FakeState;
 let repo: TaskRepository;
 beforeEach(() => {
  state = makeFakeState();
  repo = makeFakeTaskRepo(state);
 });

 it("rejects a non-uuid id", async () => {
  const del = makeDeleteTask(repo);
  const r = await del("not-a-uuid");
  expect(r.ok).toBe(false);
 });

 it("forwards a valid id to the repo", async () => {
  const del = makeDeleteTask(repo);
  const r = await del(TID);
  expect(r.ok).toBe(true);
  expect(state.removeCalls).toEqual([TID]);
 });
});

/* ============================================================== */
/*  makeListTaskStates                                             */
/* ============================================================== */

describe("makeListTaskStates", () => {
 let state: FakeState;
 let repo: TaskStateRepository;
 beforeEach(() => {
  state = makeFakeState();
  repo = makeFakeStateRepo(state);
 });

 it("returns the states from the repo", async () => {
  const todoId = "00000000-0000-0000-0000-000000000001";
  state.states.push({
   id: todoId,
   userId: YID,
   title: "Todo",
   color: null,
   icon: null,
   order: 0,
  } as TaskState);
  const list = makeListTaskStates(repo);
  const r = await list();
  expect(r.ok).toBe(true);
  if (r.ok) expect(r.value).toHaveLength(1);
 });
});

/* ============================================================== */
/*  Edge case — branded id boundary                                */
/* ============================================================== */

describe("branded id boundary", () => {
 it("reorder input with non-uuid ids is rejected", async () => {
  const state = makeFakeState();
  const repo = makeFakeTaskRepo(state);
  const reorder = makeReorderTaskInColumn(repo);
  const r = await reorder({
   id: "garbage",
   columnId: "garbage",
   toIndex: 0,
  });
  expect(r.ok).toBe(false);
  expect(state.moveCalls).toHaveLength(0);
 });
});
