import type {
  Task,
  TaskInput,
  TaskPage,
  TaskPatch,
  TaskState,
  ListTasksQuery,
  TypeForForm,
  CategoryForForm,
  ClientListItem,
} from "@crm/contract/task";
import type { ClientId, TypeId } from "@crm/contract/shared/identifiers";
import type { Result } from "../shared/result";
import type { DomainError } from "../shared/errors";

export interface TaskRepository {
  list(query: ListTasksQuery): Promise<Result<TaskPage, DomainError>>;
  get(id: Task["id"]): Promise<Result<Task, DomainError>>;
  create(input: TaskInput): Promise<Result<Task, DomainError>>;
  patch(id: Task["id"], input: TaskPatch): Promise<Result<Task, DomainError>>;
  remove(id: Task["id"]): Promise<Result<null, DomainError>>;
  moveToColumn(
    id: Task["id"],
    columnId: TaskState["id"],
    toIndex: number,
  ): Promise<Result<Task, DomainError>>;
}

export interface TaskStateRepository {
  list(): Promise<Result<TaskState[], DomainError>>;
}

/**
 * Form listers for the EditTaskDrawer. These read-side queries are
 * scoped to a user-scoped module (e.g. `tasks`) and a client filter,
 * so the page can drive a type -> category -> client cascade without
 * hand-rolling request shapes in the form layer.
 */
export interface TaskFormListersRepository {
  listTypesForForm(input: {
    module?: string;
    clie_id?: ClientId;
  }): Promise<Result<TypeForForm[], DomainError>>;
  listCategoriesByType(input: {
    type_id: TypeId;
  }): Promise<Result<CategoryForForm[], DomainError>>;
  searchClients(input: {
    query: string;
    limit?: number;
  }): Promise<Result<ClientListItem[], DomainError>>;
}
