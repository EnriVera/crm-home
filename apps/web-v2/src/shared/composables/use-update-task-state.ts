import {
 useMutation,
 useQueryClient,
 type UseMutationReturnType,
} from "@/shared/vendor/tanstack";
import type { Task, TaskState, TaskPage } from "@crm/contract/task";
import type { DomainError } from "@/domain/shared/errors";
import { makeReorderTaskInColumn } from "@/application/task/use-cases";
import { taskRepository } from "@/infrastructure/repositories";

export interface UpdateTaskStateInput {
 readonly id: Task["id"];
 readonly columnId: TaskState["id"];
 readonly toIndex: number;
}

/**
 * useUpdateTaskState — kanban drop. Optimistically moves the task in
 * every `["tasks","list",...]` cache (and the single-task key when
 * present), then PATCHes. Rolls back on error.
 *
 * The optimistic update is a shallow column rebuild: the previous
 * column drops the task, the new column inserts it at `toIndex`. The
 * server's `moveTask` returns the authoritative task with the
 * canonical `kanbanOrder`, so the onSuccess handler is a refetch
 * (invalidateQueries) rather than a manual patch.
 */
export function useUpdateTaskState(): UseMutationReturnType<
 Task,
 Error,
 UpdateTaskStateInput,
 { previous: Array<[readonly unknown[], unknown]> }
> {
 const reorder = makeReorderTaskInColumn(taskRepository);
 const qc = useQueryClient();

 return useMutation({
  mutationFn: async (input: UpdateTaskStateInput) => {
   const result = await reorder(input);
   if (!result.ok) throw new DomainErrorToError(result.error);
   return result.value;
  },
  onMutate: async (input) => {
   await qc.cancelQueries({ queryKey: ["tasks", "list"] });
   const previous = qc.getQueriesData<TaskPage>({
    queryKey: ["tasks", "list"],
   });
   previous.forEach(([key, page]) => {
    if (!page) return;
    const moved = applyMove(page, input);
    qc.setQueryData<TaskPage>(key, moved);
   });
   return { previous };
  },
  onError: (_err, _input, context) => {
   if (!context) return;
   context.previous.forEach(([key, value]) => {
    qc.setQueryData(key, value);
   });
  },
  onSettled: async () => {
   await qc.invalidateQueries({ queryKey: ["tasks", "list"] });
  },
 });
}

/* ============================================================== */
/*  Helpers                                                        */
/* ============================================================== */

class DomainErrorToError extends Error {
 readonly domain: DomainError;
 constructor(domain: DomainError) {
  super(domain.message);
  this.name = `DomainError[${domain.code}]`;
  this.domain = domain;
 }
}

/**
 * applyMove — returns a new TaskPage with the task moved from its
 * current column to the target column at toIndex. The TaskPage shape
 * from `@crm/contract/task` wraps a list of Task entities; the column
 * for a task is `taskStateId` (which is wire-shape `task_tast_id` on
 * the wire side, but the entity is camelCase here). The optimistic
 * patch is a best-effort visual feedback; the onSettled invalidation
 * is what actually reconciles with the server.
 */
function applyMove(
 page: TaskPage,
 input: UpdateTaskStateInput,
): TaskPage {
 const items = page.items;
 const moving = items.find((t) => t.id === input.id);
 if (!moving) return page;
 const without = items.filter((t) => t.id !== input.id);
 // Build a new task with the new state id; the entity uses
 // `taskStateId` (camelCase). The wire name is `task_tast_id`; the
 // adapter maps it on the way in.
 const moved: Task = { ...moving, taskStateId: input.columnId };
 // Re-insert at toIndex relative to the new column; the optimistic
 // patch is a best-effort, server is the source of truth.
 const insertAt = Math.min(Math.max(input.toIndex, 0), without.length);
 return {
  ...page,
  items: [
   ...without.slice(0, insertAt),
   moved,
   ...without.slice(insertAt),
  ],
 };
}
