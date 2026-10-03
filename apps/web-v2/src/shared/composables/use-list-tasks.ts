import { computed, type MaybeRefOrGetter, toValue } from "vue";
import { useQuery, type UseQueryReturnType } from "@/shared/vendor/tanstack";
import type { TaskPage, ListTasksQuery } from "@crm/contract/task";
import type { DomainError } from "@/domain/shared/errors";
import { makeListTasks } from "@/application/task/use-cases";
import { taskRepository } from "@/infrastructure/repositories";

/**
 * useListTasks — TanStack Query wrapper around makeListTasks.
 *
 * The queryKey is a stable JSON of the resolved query so the cache
 * survives filter changes without invalidating the whole `["tasks"]`
 * space. `staleTime` defaults to 30s: tasks are mutated explicitly
 * (create/update/delete) and the cache invalidation lives in the
 * mutation composables, not in a refetch-on-focus loop.
 *
 * Returns `data.value` as `TaskPage | undefined` and a `Result`-shaped
 * error (DomainError) when the use case failed.
 */
export function useListTasks(
 query: MaybeRefOrGetter<ListTasksQuery>,
 options: { enabled?: MaybeRefOrGetter<boolean> } = {},
): UseQueryReturnType<TaskPage, Error> {
 const listTasks = makeListTasks(taskRepository);

 return useQuery({
  queryKey: computed(() => ["tasks", "list", toValue(query)]),
  queryFn: async () => {
   const result = await listTasks(toValue(query));
   if (!result.ok) {
    // Surface as a thrown Error so TanStack Query tracks it under
    // `error`; the component layer can read `result.value` on success
    // and pattern-match on `error` for failure UI.
    throw new DomainErrorToError(result.error);
   }
   return result.value;
  },
  staleTime: 30_000,
  enabled: options.enabled ?? true,
 });
}

/** Adapter so the use case's `Result` error shape becomes a
 *  thrown `Error` for TanStack Query. Keeps the bridge explicit. */
class DomainErrorToError extends Error {
 readonly domain: DomainError;
 constructor(domain: DomainError) {
  super(domain.message);
  this.name = `DomainError[${domain.code}]`;
  this.domain = domain;
 }
}
