import { useQuery, type UseQueryReturnType } from "@/shared/vendor/tanstack";
import type { TaskState } from "@crm/contract/task";
import type { DomainError } from "@/domain/shared/errors";
import { makeListTaskStates } from "@/application/task/use-cases";
import { taskStateRepository } from "@/infrastructure/repositories";

/**
 * useListTaskStates — the kanban columns. Cached aggressively
 * (5 min) because states change rarely; the page that mutates a
 * state (TasksConfig) is responsible for invalidating this key.
 */
export function useListTaskStates(): UseQueryReturnType<TaskState[], Error> {
 const listTaskStates = makeListTaskStates(taskStateRepository);

 return useQuery({
  queryKey: ["tasks", "states", "list"] as const,
  queryFn: async () => {
   const result = await listTaskStates();
   if (!result.ok) {
    throw new DomainErrorToError(result.error);
   }
   return result.value;
  },
  staleTime: 5 * 60_000,
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
