import type { H3Event } from "h3";
import { readValidatedBody, getQuery } from "h3";
import {
  // Wire types (snake_case) — imported from `./contracts` to avoid
  // colliding with the entity `Task` / `TaskState` of the same name
  // re-exported from the barrel `@crm/contract/task` (camelCase).
  type TaskWire,
  type TaskStateWire,
  type ClientListItem,
  type TypeForForm,
  type CategoryForForm,
  listTasksInputSchema,
  getTaskInputSchema,
  createTaskInputSchema,
  updateTaskInputSchema,
  moveTaskInputSchema,
  deleteTaskInputSchema,
  createTaskStateInputSchema,
  updateTaskStateInputSchema,
  deleteTaskStateInputSchema,
  reorderTaskStatesInputSchema,
  listClientsSearchInputSchema,
  listTypesForFormInputSchema,
  listCategoriesByTypeInputSchema,
} from "@crm/contract/task";
import type { CreateTask } from "../../application/tasks/create-task";
import type { CreateTaskState } from "../../application/tasks/create-task-state";
import type { DeleteTask } from "../../application/tasks/delete-task";
import type { DeleteTaskState } from "../../application/tasks/delete-task-state";
import type { GetTask } from "../../application/tasks/get-task";
import type { ListCategoriesByType } from "../../application/tasks/list-categories-by-type";
import type { ListClientsForSelector } from "../../application/tasks/list-clients-for-selector";
import type { ListTaskStates } from "../../application/tasks/list-task-states";
import type { ListTasks } from "../../application/tasks/list-tasks";
import type { ListTypesForForm } from "../../application/tasks/list-types-for-form";
import type { MoveTask } from "../../application/tasks/move-task";
import type { ReorderTaskStates } from "../../application/tasks/reorder-task-states";
import type { UpdateTask } from "../../application/tasks/update-task";
import type { UpdateTaskState } from "../../application/tasks/update-task-state";
import type {
  CategoryRow,
  ClientRow,
  TaskRow,
  TaskStateRow,
  TypeCategoriesClientRow,
} from "../../domain/types";
import { mapDomainErrorToStatus } from "../error-mapping";
import { readUserId } from "../request-user";

/**
 * HTTP layer del módulo tasks. Cada handler es una factory `(deps) => handler`
 * que recibe dependencias inyectadas (casos de uso) y devuelve un
 * `(event: H3Event) => Promise<Response>`.
 *
 * Contrato uniforme:
 * 1. Lee `userId` del header `X-User-Id` (provisional para esta fase SDD;
 *    production usaría session middleware que valide la cookie httpOnly).
 * 2. Valida el body con el schema zod del contract (wire shape snake_case).
 * 3. Traduce snake_case → camelCase y agrega `userId` antes de invocar el
 *    caso de uso.
 * 4. Devuelve `Response.json(result)` con status 200, o error mapeado por
 *    `mapDomainErrorToStatus`.
 */

export interface TasksRouteDependencies {
  listTasks: ListTasks;
  getTask: GetTask;
  createTask: CreateTask;
  updateTask: UpdateTask;
  moveTask: MoveTask;
  deleteTask: DeleteTask;
  listTaskStates: ListTaskStates;
  createTaskState: CreateTaskState;
  updateTaskState: UpdateTaskState;
  deleteTaskState: DeleteTaskState;
  reorderTaskStates: ReorderTaskStates;
  listClientsForSelector: ListClientsForSelector;
  listTypesForForm: ListTypesForForm;
  listCategoriesByType: ListCategoriesByType;
}

async function runOrMapError<T>(fn: () => Promise<T>): Promise<Response> {
  try {
    const result = await fn();
    // Si el handler ya construyó un Response (p. ej. validation 400), pasarlo
    // tal cual — sino, envolver el resultado en un JSON 200.
    if (result instanceof Response) return result;
    return Response.json(result);
  } catch (err) {
    const { status, body } = mapDomainErrorToStatus(err);
    return Response.json(body, { status });
  }
}

// ─── Domain → wire mappers (camelCase → snake_case) ─────────────────────────

function asTask(row: TaskRow): TaskWire {
  return {
    task_id: row.id,
    task_title: row.title,
    task_description: row.description,
    task_tast_id: row.stateId,
    task_type_id: row.typeId,
    task_cate_id: row.categoryId,
    task_clie_id: row.clientId,
    task_kanban_order: row.kanbanOrder,
    task_due_date: row.dueDate,
    task_created_at: row.createdAt,
    task_updated_at: row.updatedAt,
  };
}

function asTaskState(row: TaskStateRow): TaskStateWire {
  return {
    tast_id: row.id,
    tast_name: row.name,
    tast_order: row.order,
    tast_color: row.color,
  };
}

function asClientListItem(row: ClientRow): ClientListItem {
  return {
    clie_id: row.id,
    clie_name: row.name,
  };
}

function asTypeForForm(row: TypeCategoriesClientRow): TypeForForm {
  // The row type from the application layer does not yet carry
  // `typeName` / `typeModules` (those columns land in a follow-up change
  // that touches the SELECT for `listTypesForForm`). Until then, we
  // satisfy the wire schema with the safe defaults: typeName reuses
  // typeId, typeModules is empty. The result is type-safe at the wire
  // boundary even if it is lossy at the domain boundary.
  return {
    type_id: row.typeId,
    // SAFETY: TypeCategoriesClientRow does not declare typeName at
    // the type level; the runtime row may carry it once the
    // application-layer SELECT is widened. The cast is a no-op at
    // runtime when the field is missing.
    type_name: (row as unknown as { typeName?: string }).typeName ?? row.typeId,
    // SAFETY: same as above for typeModules; the array defaults to
    // empty when the row doesn't carry it. The wire contract requires
    // a non-nullable string[].
    type_modules:
      (row as unknown as { typeModules?: string[] }).typeModules ?? [],
  };
}

function asCategoryForForm(row: CategoryRow): CategoryForForm {
  return {
    cate_id: row.id,
    cate_name: row.name,
    // The wire schema requires `cate_type_id`; the row carries it as
    // `typeId` (the category's parent type in the cascade).
    cate_type_id: row.typeId,
  };
}

// ──────────────────────────────────────────────────────────────────────────
// Handlers
// ──────────────────────────────────────────────────────────────────────────

export function createListTasksHandler(deps: TasksRouteDependencies) {
  return async (event: H3Event): Promise<Response> =>
    runOrMapError(async () => {
      const userId = readUserId(event);
      const body = await readValidatedBody(event, listTasksInputSchema.parse);
      const rows = await deps.listTasks.execute({
        userId,
        search: body.search,
      });
      return rows.map(asTask);
    });
}

export function createGetTaskHandler(deps: TasksRouteDependencies) {
  return async (event: H3Event): Promise<Response> =>
    runOrMapError(async () => {
      const userId = readUserId(event);
      const body = await readValidatedBody(event, getTaskInputSchema.parse);
      return asTask(
        await deps.getTask.execute({
          userId,
          taskId: body.task_id,
        }),
      );
    });
}

export function createCreateTaskHandler(deps: TasksRouteDependencies) {
  return async (event: H3Event): Promise<Response> =>
    runOrMapError(async () => {
      const userId = readUserId(event);
      const body = await readValidatedBody(event, createTaskInputSchema.parse);
      if (!body.task_type_id) {
        return Response.json(
          { error: "task_type_id is required", code: "INVALID_INPUT" },
          { status: 400 },
        );
      }
      if (!body.task_tast_id) {
        return Response.json(
          { error: "task_tast_id is required", code: "INVALID_INPUT" },
          { status: 400 },
        );
      }
      return asTask(
        await deps.createTask.execute({
          userId,
          title: body.task_title,
          description: body.task_description ?? null,
          typeId: body.task_type_id,
          categoryId: body.task_cate_id ?? null,
          clientId: body.task_clie_id ?? null,
          stateId: body.task_tast_id,
          dueDate: body.task_due_date ?? null,
        }),
      );
    });
}

export function createUpdateTaskHandler(deps: TasksRouteDependencies) {
  return async (event: H3Event): Promise<Response> =>
    runOrMapError(async () => {
      const userId = readUserId(event);
      const body = await readValidatedBody(event, updateTaskInputSchema.parse);
      return asTask(
        await deps.updateTask.execute({
          userId,
          taskId: body.task_id,
          patch: {
            title: body.task_title,
            description: body.task_description,
            typeId: body.task_type_id ?? undefined,
            categoryId: body.task_cate_id ?? undefined,
            clientId: body.task_clie_id ?? undefined,
            dueDate: body.task_due_date,
          },
        }),
      );
    });
}

export function createMoveTaskHandler(deps: TasksRouteDependencies) {
  return async (event: H3Event): Promise<Response> =>
    runOrMapError(async () => {
      const userId = readUserId(event);
      const body = await readValidatedBody(event, moveTaskInputSchema.parse);
      await deps.moveTask.execute({
        userId,
        taskId: body.task_id,
        targetStateId: body.target_state_id,
        prevTaskId: body.prev_task_id,
        nextTaskId: body.next_task_id,
      });
      return { ok: true as const };
    });
}

export function createRemoveTaskHandler(deps: TasksRouteDependencies) {
  return async (event: H3Event): Promise<Response> =>
    runOrMapError(async () => {
      const userId = readUserId(event);
      const body = await readValidatedBody(event, deleteTaskInputSchema.parse);
      await deps.deleteTask.execute({
        userId,
        taskId: body.task_id,
      });
      return { ok: true as const };
    });
}

export function createListTaskStatesHandler(deps: TasksRouteDependencies) {
  return async (event: H3Event): Promise<Response> =>
    runOrMapError(async () => {
      const userId = readUserId(event);
      const rows = await deps.listTaskStates.execute({ userId });
      return rows.map(asTaskState);
    });
}

export function createCreateTaskStateHandler(deps: TasksRouteDependencies) {
  return async (event: H3Event): Promise<Response> =>
    runOrMapError(async () => {
      const userId = readUserId(event);
      const body = await readValidatedBody(
        event,
        createTaskStateInputSchema.parse,
      );
      const row = await deps.createTaskState.execute({
        userId,
        name: body.tast_name,
        color: body.tast_color ?? null,
      });
      return asTaskState(row);
    });
}

export function createUpdateTaskStateHandler(deps: TasksRouteDependencies) {
  return async (event: H3Event): Promise<Response> =>
    runOrMapError(async () => {
      const userId = readUserId(event);
      const body = await readValidatedBody(
        event,
        updateTaskStateInputSchema.parse,
      );
      return asTaskState(
        await deps.updateTaskState.execute({
          userId,
          stateId: body.tast_id,
          patch: {
            name: body.tast_name,
            order: body.tast_order,
            color: body.tast_color,
          },
        }),
      );
    });
}

export function createRemoveTaskStateHandler(deps: TasksRouteDependencies) {
  return async (event: H3Event): Promise<Response> =>
    runOrMapError(async () => {
      const userId = readUserId(event);
      const body = await readValidatedBody(
        event,
        deleteTaskStateInputSchema.parse,
      );
      await deps.deleteTaskState.execute({
        userId,
        stateId: body.tast_id,
      });
      return { ok: true as const };
    });
}

export function createReorderTaskStatesHandler(deps: TasksRouteDependencies) {
  return async (event: H3Event): Promise<Response> =>
    runOrMapError(async () => {
      const userId = readUserId(event);
      const body = await readValidatedBody(
        event,
        reorderTaskStatesInputSchema.parse,
      );
      await deps.reorderTaskStates.execute({
        userId,
        stateOrders: body.map((s: { tast_id: string; tast_order: number }) => ({
          id: s.tast_id,
          order: s.tast_order,
        })),
      });
      return { ok: true as const };
    });
}

export function createListClientsSearchHandler(deps: TasksRouteDependencies) {
  return async (event: H3Event): Promise<Response> =>
    runOrMapError(async () => {
      const userId = readUserId(event);
      const query = getQuery(event);
      const body = listClientsSearchInputSchema.parse(query);
      const rows = await deps.listClientsForSelector.execute({
        userId,
        query: body.query,
        limit: body.limit,
      });
      return rows.map(asClientListItem);
    });
}

export function createListTypesForFormHandler(deps: TasksRouteDependencies) {
  return async (event: H3Event): Promise<Response> =>
    runOrMapError(async () => {
      const userId = readUserId(event);
      const query = getQuery(event);
      const body = listTypesForFormInputSchema.parse(query);
      const rows = await deps.listTypesForForm.execute({
        userId,
        clieId: body.clie_id,
      });
      return rows.map(asTypeForForm);
    });
}

export function createListCategoriesByTypeHandler(
  deps: TasksRouteDependencies,
) {
  return async (event: H3Event): Promise<Response> =>
    runOrMapError(async () => {
      const userId = readUserId(event);
      const query = getQuery(event);
      const body = listCategoriesByTypeInputSchema.parse(query);
      const rows = await deps.listCategoriesByType.execute({
        userId,
        typeId: body.type_id,
      });
      return rows.map(asCategoryForForm);
    });
}
