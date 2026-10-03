import type {
  Task,
  TaskInput,
  TaskPage,
  TaskPatch,
  TaskState,
  ListTasksQuery,
} from "@crm/contract/task";
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
