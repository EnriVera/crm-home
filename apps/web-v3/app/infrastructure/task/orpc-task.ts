/**
 * Task adapter: the only place that talks to the API about tasks (and
 * the task-adjacent lookups the task screens need: columns, clients,
 * types, category cascade).
 *
 * The API speaks snake_case on the wire and the domain speaks camelCase,
 * so the mapping lives here and nowhere else (PRD-v4 §11.4).
 */
import type { Task, TaskColumn } from "~/domain/task/entities";
import {
  callCategoriesByType,
  callConfig,
  callTasks,
  type TaskStateWire,
  type TaskWire,
} from "~/shared/vendor/orpc";

/** A client as the task screens use it (id + name for the selects). */
export interface ClientOption {
  id: string;
  name: string;
}

/** A task type as the task screens use it. */
export interface TypeOption {
  id: string;
  name: string;
}

/** A category as the task screens use it. */
export interface CategoryOption {
  id: string;
  name: string;
  typeId: string;
}

function toTask(wire: TaskWire): Task {
  return {
    id: wire.task_id,
    title: wire.task_title,
    description: wire.task_description,
    stateId: wire.task_tast_id,
    typeId: wire.task_type_id,
    categoryId: wire.task_cate_id,
    clientId: wire.task_clie_id,
    kanbanOrder: wire.task_kanban_order,
    createdAt: new Date(wire.task_created_at),
    updatedAt: new Date(wire.task_updated_at),
  };
}

function toColumn(wire: TaskStateWire): TaskColumn {
  return { id: wire.tast_id, name: wire.tast_name, order: wire.tast_order };
}

/** Every task of the user, optionally filtered server-side by title. */
export async function listTasks(search = ""): Promise<Task[]> {
  const wire = await callTasks("list", search ? { search } : {});
  return wire.map(toTask);
}

/** The kanban columns (task states) in the order the board shows them. */
export async function listTaskColumns(): Promise<TaskColumn[]> {
  const wire = await callTasks("states.list", undefined);
  return wire.map(toColumn);
}

export interface TaskInput {
  title: string;
  description: string | null;
  /**
   * The column the task is born in. The API requires it (the contract
   * marks it optional, but the use case rejects a task without a state);
   * the caller defaults it to the user's first column (PRD-v2 §8.3:
   * a new task is born in Pendiente).
   */
  stateId: string;
  typeId: string;
  categoryId: string | null;
  clientId: string | null;
}

export async function createTask(input: TaskInput): Promise<Task> {
  const wire = await callTasks("create", {
    task_title: input.title,
    task_description: input.description,
    task_tast_id: input.stateId,
    task_type_id: input.typeId,
    task_cate_id: input.categoryId,
    task_clie_id: input.clientId,
  });
  return toTask(wire);
}

/**
 * The fields an edit can change. `null` clears a reference (the API
 * accepts null for type/category/client).
 */
export interface TaskUpdateInput {
  id: string;
  title?: string;
  description?: string | null;
  typeId?: string | null;
  categoryId?: string | null;
  clientId?: string | null;
}

export async function updateTask(input: TaskUpdateInput): Promise<Task> {
  const wire = await callTasks("update", {
    task_id: input.id,
    ...(input.title !== undefined ? { task_title: input.title } : {}),
    ...(input.description !== undefined
      ? { task_description: input.description }
      : {}),
    ...(input.typeId !== undefined ? { task_type_id: input.typeId } : {}),
    ...(input.categoryId !== undefined ? { task_cate_id: input.categoryId } : {}),
    ...(input.clientId !== undefined ? { task_clie_id: input.clientId } : {}),
  });
  return toTask(wire);
}

/**
 * Moves a task to a column position. Neighbors are optional: without
 * them the API appends to the end of the target column.
 */
export async function moveTask(input: {
  id: string;
  targetStateId: string;
  prevTaskId?: string;
  nextTaskId?: string;
}): Promise<Task> {
  const wire = await callTasks("move", {
    task_id: input.id,
    target_state_id: input.targetStateId,
    ...(input.prevTaskId ? { prev_task_id: input.prevTaskId } : {}),
    ...(input.nextTaskId ? { next_task_id: input.nextTaskId } : {}),
  });
  return toTask(wire);
}

export async function removeTask(id: string): Promise<void> {
  await callTasks("remove", { task_id: id });
}

/**
 * The task types (the drawer select).
 *
 * The legacy `tasks/types-for-form` endpoint would filter by client, but
 * its wire is lossy: it returns the type id as the name (see
 * `asTypeForForm` in the API). The types endpoint has real names, so the
 * drawer uses it.
 */
export async function listTaskTypes(): Promise<TypeOption[]> {
  const wire = await callConfig("types.list", {
    search: "",
    modules: [],
    limit: 100,
  });
  return wire.map((type) => ({ id: type.type_id, name: type.type_name }));
}

/** The categories of a type (the cascade of the task drawer). */
export async function listCategoriesForType(
  typeId: string,
): Promise<CategoryOption[]> {
  const wire = await callCategoriesByType(typeId);
  return wire.map((category) => ({
    id: category.cate_id,
    name: category.cate_name,
    typeId: category.cate_type_id,
  }));
}

/** Every category of the user, for the card chip lookup (id → name). */
export async function listAllCategories(): Promise<CategoryOption[]> {
  const wire = await callConfig("categories.list", {
    search: "",
    typeId: null,
    limit: 100,
  });
  return wire.map((category) => ({
    id: category.cate_id,
    name: category.cate_name,
    typeId: category.cate_type_id,
  }));
}
