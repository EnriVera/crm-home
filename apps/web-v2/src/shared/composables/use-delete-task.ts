import {
 useMutation,
 useQueryClient,
 type UseMutationReturnType,
} from "@/shared/vendor/tanstack";
import type { Task } from "@crm/contract/task";
import type { DomainError } from "@/domain/shared/errors";
import { makeDeleteTask } from "@/application/task/use-cases";
import { taskRepository } from "@/infrastructure/repositories";

/**
 * useDeleteTask — optimistic removal. The task disappears from
 * every `["tasks","list",...]` cache immediately, then the server
 * confirms. On error, the previous cache entries are restored.
 */
export function useDeleteTask(): UseMutationReturnType<
 null,
 Error,
 Task["id"],
 { previous: Array<[readonly unknown[], unknown]> }
> {
 const deleteTask = makeDeleteTask(taskRepository);
 const qc = useQueryClient();

 return useMutation({
  mutationFn: async (id: Task["id"]) => {
   const result = await deleteTask(id);
   if (!result.ok) throw new DomainErrorToError(result.error);
   return result.value;
  },
  onMutate: async (id) => {
   await qc.cancelQueries({ queryKey: ["tasks", "list"] });
   const previous = qc.getQueriesData({
    queryKey: ["tasks", "list"],
   });
   previous.forEach(([key, page]) => {
    if (!page || typeof page !== "object") return;
    const items = (page as { items?: Task[] }).items;
    if (!items) return;
    const filtered = items.filter((t) => t.id !== id);
    qc.setQueryData(key, { ...page, items: filtered });
   });
   return { previous };
  },
  onError: (_err, _id, context) => {
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

class DomainErrorToError extends Error {
 readonly domain: DomainError;
 constructor(domain: DomainError) {
  super(domain.message);
  this.name = `DomainError[${domain.code}]`;
  this.domain = domain;
 }
}
