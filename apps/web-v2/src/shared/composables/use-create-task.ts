import {
 useMutation,
 useQueryClient,
 type UseMutationReturnType,
} from "@/shared/vendor/tanstack";
import type { Task, TaskInput } from "@crm/contract/task";
import type { DomainError } from "@/domain/shared/errors";
import { makeCreateTask } from "@/application/task/use-cases";
import { taskRepository } from "@/infrastructure/repositories";

/**
 * useCreateTask — optimistic create + invalidate the tasks list keys.
 * On success, the new task is added to every `["tasks", "list", ...]`
 * cache so the Kanban and the Grid show it without an explicit refetch.
 */
export function useCreateTask(): UseMutationReturnType<
 Task,
 Error,
 TaskInput,
 { previous: Array<[readonly unknown[], unknown]> }
> {
 const createTask = makeCreateTask(taskRepository);
 const qc = useQueryClient();

 return useMutation({
  mutationFn: async (input: TaskInput) => {
   const result = await createTask(input);
   if (!result.ok) throw new DomainErrorToError(result.error);
   return result.value;
  },
  onSuccess: async () => {
   await qc.invalidateQueries({ queryKey: ["tasks", "list"] });
   await qc.invalidateQueries({ queryKey: ["tasks", "states", "list"] });
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
