/**
 * Use cases for the task bounded context. Pure functions over the
 * TaskRepository / TaskStateRepository ports — no Vue, no orpc, no
 * TanStack.
 *
 * Each use case is a factory `makeXxx(repo) => (input) => Result<T, E>`.
 * The factory shape is intentional: it keeps the repo dependency
 * explicit at the call site (the composable) and makes the use case
 * trivially testable with an in-memory fake repo.
 *
 * The `categoryRequiresType` policy lives in `domain/task/entities.ts`
 * as a pure function; this layer re-runs it before delegating to the
 * repo so the form layer (EditTaskDrawer) can rely on the use case to
 * reject bad inputs.
 */
import { z } from "zod";
import {
 Task,
 TaskState,
 TaskInput,
 TaskPatch,
 TaskPage,
 ListTasksQuery,
} from "@crm/contract/task";
import type {
 TypeForForm,
 CategoryForForm,
 ClientListItem,
} from "@crm/contract/task";
import { uuidSchema } from "@crm/contract/shared/identifiers";
import type {
 TaskRepository,
 TaskStateRepository,
 TaskFormListersRepository,
} from "@/domain/task/ports";
import { validateCategoryRequiresType } from "@/domain/task/entities";
import { err, type Result } from "@/domain/shared/result";
import { domainError, type DomainError } from "@/domain/shared/errors";

/* ============================================================== */
/*  Zod input schemas (use case boundary)                          */
/* ============================================================== */

/** A use case that takes a list query should reject unknown fields
 *  so a typo in the page code does not silently pass through. */
const listTasksQuerySchema: z.ZodType<ListTasksQuery> =
 ListTasksQuery.strict();

const taskIdSchema = uuidSchema;

const taskInputSchema: z.ZodType<TaskInput> = TaskInput;

const taskPatchSchema: z.ZodType<TaskPatch> = TaskPatch;

/* ============================================================== */
/*  List tasks                                                     */
/* ============================================================== */

export const makeListTasks =
 (repo: TaskRepository) =>
 async (
  rawQuery: unknown,
 ): Promise<Result<TaskPage, DomainError>> => {
  const parsed = listTasksQuerySchema.safeParse(rawQuery);
  if (!parsed.success) {
   return err(
    domainError("validation", "Invalid task list query.", {
     issues: parsed.error.issues,
    }),
   );
  }
  return repo.list(parsed.data);
 };

/* ============================================================== */
/*  Get one task                                                   */
/* ============================================================== */

export const makeGetTask =
 (repo: TaskRepository) =>
 async (rawId: unknown): Promise<Result<Task, DomainError>> => {
  const parsed = taskIdSchema.safeParse(rawId);
  if (!parsed.success) {
   return err(domainError("validation", "Invalid task id."));
  }
  return repo.get(parsed.data as Task["id"]);
 };

/* ============================================================== */
/*  Create task                                                    */
/* ============================================================== */

export const makeCreateTask =
 (repo: TaskRepository) =>
 async (rawInput: unknown): Promise<Result<Task, DomainError>> => {
  const parsed = taskInputSchema.safeParse(rawInput);
  if (!parsed.success) {
   return err(
    domainError("validation", "Invalid task input.", {
     issues: parsed.error.issues,
    }),
   );
  }
  // Domain policy: a category without a type is invalid (PRD-v2 §8.3).
  // The base policy only inspects typeId + categoryId, which is the
  // relevant subset of TaskInput.
  const policy = validateCategoryRequiresType({
   typeId: parsed.data.typeId,
   categoryId: parsed.data.categoryId,
  });
  if (!policy.ok) return policy;
  return repo.create(parsed.data);
 };

/* ============================================================== */
/*  Update task (partial)                                          */
/* ============================================================== */

export const makeUpdateTask =
 (repo: TaskRepository) =>
 async (
  rawId: unknown,
  rawPatch: unknown,
 ): Promise<Result<Task, DomainError>> => {
  const idParse = taskIdSchema.safeParse(rawId);
  if (!idParse.success) {
   return err(domainError("validation", "Invalid task id."));
  }
  const patchParse = taskPatchSchema.safeParse(rawPatch);
  if (!patchParse.success) {
   return err(
    domainError("validation", "Invalid task patch.", {
     issues: patchParse.error.issues,
    }),
   );
  }
  // Re-validate the policy only when the patch touches the
  // category/type pair. A title-only patch must not need to carry
  // the current type id; the backend already enforces the invariant
  // and will surface a conflict if violated.
  if (
   patchParse.data.typeId !== undefined ||
   patchParse.data.categoryId !== undefined
  ) {
   if (
    patchParse.data.categoryId !== undefined &&
    patchParse.data.typeId === undefined
   ) {
    return err(
     domainError(
      "validation",
      "A category requires a type. Include typeId or clear categoryId.",
     ),
    );
   }
  }
  return repo.patch(idParse.data as Task["id"], patchParse.data);
 };

/* ============================================================== */
/*  Update task state (state-only shortcut)                        */
/* ============================================================== */

export const makeUpdateTaskState =
 (repo: TaskRepository) =>
 async (
  rawId: unknown,
  rawStateId: unknown,
 ): Promise<Result<Task, DomainError>> => {
  const idParse = taskIdSchema.safeParse(rawId);
  if (!idParse.success) {
   return err(domainError("validation", "Invalid task id."));
  }
  const stateParse = uuidSchema.safeParse(rawStateId);
  if (!stateParse.success) {
   return err(domainError("validation", "Invalid task state id."));
  }
  return repo.patch(idParse.data as Task["id"], {
   taskStateId: stateParse.data as Task["taskStateId"],
  } as TaskPatch);
 };

/* ============================================================== */
/*  Reorder task inside a column (kanban drag)                     */
/* ============================================================== */

export const reorderTaskInputSchema = z.object({
 id: uuidSchema,
 columnId: uuidSchema,
 toIndex: z.number().int().nonnegative(),
});

export type ReorderTaskInput = z.infer<typeof reorderTaskInputSchema>;

export const makeReorderTaskInColumn =
 (repo: TaskRepository) =>
 async (rawInput: unknown): Promise<Result<Task, DomainError>> => {
  const parsed = reorderTaskInputSchema.safeParse(rawInput);
  if (!parsed.success) {
   return err(
    domainError("validation", "Invalid reorder input.", {
     issues: parsed.error.issues,
    }),
   );
  }
  return repo.moveToColumn(
   parsed.data.id as Task["id"],
   parsed.data.columnId as TaskState["id"],
   parsed.data.toIndex,
  );
 };

/* ============================================================== */
/*  Delete task                                                    */
/* ============================================================== */

export const makeDeleteTask =
 (repo: TaskRepository) =>
 async (rawId: unknown): Promise<Result<null, DomainError>> => {
  const parsed = taskIdSchema.safeParse(rawId);
  if (!parsed.success) {
   return err(domainError("validation", "Invalid task id."));
  }
  return repo.remove(parsed.data as Task["id"]);
 };

/* ============================================================== */
/*  List task states                                               */
/* ============================================================== */

export const makeListTaskStates =
 (repo: TaskStateRepository) =>
 (): Promise<Result<TaskState[], DomainError>> => repo.list();

/* ============================================================== */
/*  Form listers (EditTaskDrawer cascade)                          */
/* ============================================================== */

const listTypesForFormInputSchema = z
 .object({
  module: z.string().min(1).optional(),
  clie_id: uuidSchema.optional(),
 })
 .strict();

const listCategoriesByTypeInputSchema = z
 .object({
  type_id: uuidSchema,
 })
 .strict();

const searchClientsInputSchema = z
 .object({
  query: z.string().min(1, { message: "search query is required" }),
  limit: z.number().int().min(1).max(50).default(20),
 })
 .strict();

export const makeListTypesForForm =
 (repo: TaskFormListersRepository) =>
 async (rawInput: unknown): Promise<Result<TypeForForm[], DomainError>> => {
  const parsed = listTypesForFormInputSchema.safeParse(rawInput);
  if (!parsed.success) {
   return err(
    domainError("validation", "Invalid types-for-form input.", {
     issues: parsed.error.issues,
    }),
   );
  }
  // Branded id cast: parsed.data.clie_id is a plain uuid string at
  // runtime; the brand is a type-level operation only.
  return repo.listTypesForForm(
   parsed.data as Parameters<TaskFormListersRepository["listTypesForForm"]>[0],
  );
 };

export const makeListCategoriesByType =
 (repo: TaskFormListersRepository) =>
 async (rawInput: unknown): Promise<Result<CategoryForForm[], DomainError>> => {
  const parsed = listCategoriesByTypeInputSchema.safeParse(rawInput);
  if (!parsed.success) {
   return err(
    domainError("validation", "Invalid categories-by-type input.", {
     issues: parsed.error.issues,
    }),
   );
  }
  return repo.listCategoriesByType(
   parsed.data as Parameters<
    TaskFormListersRepository["listCategoriesByType"]
   >[0],
  );
 };

export const makeSearchClients =
 (repo: TaskFormListersRepository) =>
 async (rawInput: unknown): Promise<Result<ClientListItem[], DomainError>> => {
  const parsed = searchClientsInputSchema.safeParse(rawInput);
  if (!parsed.success) {
   return err(
    domainError("validation", "Invalid client search input.", {
     issues: parsed.error.issues,
    }),
   );
  }
  return repo.searchClients(parsed.data);
 };
