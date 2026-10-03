import {
 useMutation,
 useQueryClient,
 type UseMutationReturnType,
} from "@/shared/vendor/tanstack";
import type { Task, TaskPatch } from "@crm/contract/task";
import type { DomainError } from "@/domain/shared/errors";
import { makeUpdateTask } from "@/application/task/use-cases";
import { taskRepository } from "@/infrastructure/repositories";

/**
 * useUpdateTask — partial update of one task. Invalidates the list
 * keys (so filters refresh) and the single-task key when present.
 * Use the focused `useUpdateTaskState` for kanban drags; that one
 * has the optimistic update path that this one does not need.
 */
export function useUpdateTask(): UseMutationReturnType<
 Task,
 Error,
 { id: Task["id"]; patch: TaskPatch },
 void
> {
 const updateTask = makeUpdateTask(taskRepository);
 const qc = useQueryClient();

 return useMutation({
  mutationFn: async ({ id, patch }) => {
   const result = await updateTask(id, patch);
   if (!result.ok) throw new DomainErrorToError(result.error);
   return result.value;
  },
  onSuccess: async (_data, { id }) => {
   await qc.invalidateQueries({ queryKey: ["tasks", "list"] });
   await qc.invalidateQueries({ queryKey: ["tasks", "task", id] });
  },
 });
}

class DomainErrorToError extends Error {
 readonly domain: DomainError;
 constructor(domain: DomainError) {
  super(domain.message);
  this.name = `DomainError[${domain.code}]`;
  this.domain = domain;
 }
}
