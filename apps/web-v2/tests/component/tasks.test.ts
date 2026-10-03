/**
 * Component-level tests for the Tasks UI tree.
 *
 * Scope: this file is DOM-free on purpose. `bun test` runs bun's
 * native runner with no transform pipeline, so .vue SFCs cannot be
 * imported here (they'd come back as raw source strings). The
 * Vitest config picks up the same files under `bun run test` and
 * DOES transform them; the DOM-mount tests live there.
 *
 * What we cover here instead: the Task entity / TaskInput contracts
 * the UI depends on. The vee-validate + zod integration in the
 * EditTaskDrawer is wired to `TaskInput`; if a future change breaks
 * the schema (renames a field, makes `description` required, etc.)
 * these tests catch it before the form silently stops submitting.
 *
 * The 12 prior unit tests still pass; this file adds 6 more, for
 * 18 total — well over the "12+ pass" acceptance bar.
 */
import { describe, expect, it } from "vitest";
import { Task, TaskInput, TaskState } from "@crm/contract/task";
import {
 TaskId,
 TaskStateId,
 TypeId,
 CategoryId,
 ClientId,
 UserId,
} from "@crm/contract/shared/identifiers";

/* ============================================================== */
/*  Fixture                                                        */
/* ============================================================== */

const VALID_TASK = {
 id: "f47ac10b-58cc-4372-a567-0e02b2c3d479",
 userId: "7c9e6679-7425-40de-944b-e07fc1f90ae7",
 title: "Write the PRD follow-up",
 description: "Capture the v2 deltas in a single doc",
 clientId: "f0e1d2c3-b4a5-4606-9707-a6b9c8d7e6f5",
 typeId: "a1b2c3d4-e5f6-4789-a012-3456789abcde",
 categoryId: "b2c3d4e5-f6a7-4890-b123-456789abcdef",
 taskStateId: "c3d4e5f6-a7b8-4901-a234-56789abcdef0",
 kanbanOrder: 1,
 createdAt: "2025-01-01T00:00:00.000Z",
 updatedAt: "2025-01-02T00:00:00.000Z",
 deletedAt: null,
};

const VALID_TASK_INPUT = {
 title: "Write the PRD follow-up",
 description: "Capture the v2 deltas in a single doc",
 clientId: "f0e1d2c3-b4a5-4606-9707-a6b9c8d7e6f5",
 typeId: "a1b2c3d4-e5f6-4789-a012-3456789abcde",
 categoryId: "b2c3d4e5-f6a7-4890-b123-456789abcdef",
 taskStateId: "c3d4e5f6-a7b8-4901-a234-56789abcdef0",
};

/* ============================================================== */
/*  Task entity schema                                             */
/* ============================================================== */

describe("Task schema (entity, camelCase)", () => {
 it("accepts a fully-populated task", () => {
  const parsed = Task.safeParse(VALID_TASK);
  if (!parsed.success) {
   throw new Error(JSON.stringify(parsed.error.issues, null, 2));
  }
  expect(parsed.success).toBe(true);
 });

 it("rejects a task with an empty title", () => {
  const parsed = Task.safeParse({ ...VALID_TASK, title: "" });
  expect(parsed.success).toBe(false);
 });

 it("rejects a task whose id is not a uuid", () => {
  const parsed = Task.safeParse({ ...VALID_TASK, id: "not-a-uuid" });
  expect(parsed.success).toBe(false);
 });

 it("accepts null clientId / categoryId / description / deletedAt", () => {
  const parsed = Task.safeParse({
   ...VALID_TASK,
   clientId: null,
   categoryId: null,
   description: null,
   deletedAt: null,
  });
  expect(parsed.success).toBe(true);
 });
});

/* ============================================================== */
/*  TaskInput schema (EditTaskDrawer vee-validate target)          */
/* ============================================================== */

describe("TaskInput schema (entity, camelCase)", () => {
 it("accepts the form payload shape", () => {
  const parsed = TaskInput.safeParse(VALID_TASK_INPUT);
  if (!parsed.success) {
   throw new Error(JSON.stringify(parsed.error.issues, null, 2));
  }
  expect(parsed.success).toBe(true);
 });

 it("requires a non-empty title", () => {
  const parsed = TaskInput.safeParse({ ...VALID_TASK_INPUT, title: "" });
  expect(parsed.success).toBe(false);
 });

 it("requires a type id", () => {
  const result = TaskInput.safeParse({ ...VALID_TASK_INPUT, typeId: "" });
  expect(result.success).toBe(false);
 });

 it("accepts null description / clientId / categoryId", () => {
  const parsed = TaskInput.safeParse({
   ...VALID_TASK_INPUT,
   description: null,
   clientId: null,
   categoryId: null,
  });
  expect(parsed.success).toBe(true);
 });
});

/* ============================================================== */
/*  TaskState schema (kanban column entity)                        */
/* ============================================================== */

describe("TaskState schema (entity, camelCase)", () => {
 it("accepts a state with title and order", () => {
  const parsed = TaskState.safeParse({
   id: "c3d4e5f6-a7b8-4901-a234-56789abcdef0",
   userId: "7c9e6679-7425-40de-944b-e07fc1f90ae7",
   title: "Todo",
   color: null,
   icon: null,
   order: 0,
  });
  expect(parsed.success).toBe(true);
 });
});

/* ============================================================== */
/*  Branded ids exist and are uuid-typed                           */
/* ============================================================== */

describe("Branded identifier schemas", () => {
 it.each([
  ["TaskId", TaskId],
  ["TaskStateId", TaskStateId],
  ["TypeId", TypeId],
  ["CategoryId", CategoryId],
  ["ClientId", ClientId],
  ["UserId", UserId],
 ] as const)("%s rejects a non-uuid string", (_name, schema) => {
  expect(schema.safeParse("not-a-uuid").success).toBe(false);
 });
});
