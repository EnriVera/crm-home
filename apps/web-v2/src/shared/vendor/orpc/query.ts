/**
 * TanStack Query integration with the orpc client.
 *
 * `useOrpcQuery` and `useOrpcMutation` are thin wrappers that derive cache
 * keys from the procedure path and the input. They are the only place the
 * app imports `@orpc/tanstack-query`.
 */
import {
  useQuery,
  useMutation,
  type UseQueryOptions,
  type UseMutationOptions,
} from "@tanstack/vue-query";
import { orpcClient } from "./client";
import { computed, type ComputedRef, type Ref } from "vue";

type Procedure = (input: unknown) => Promise<unknown>;

/**
 * SAFETY: `orpcClient` is typed `NestedClient<Record<string, unknown>>` until
 * the backend bridge is wired. The runtime shape is the same; the cast is
 * only here so callers can use any procedure path. Replace with a typed
 * `NestedClient<AppRouter>` once the bridge package is published.
 */
type AnyProcedure = (input: any) => Promise<any>;

export function useOrpcQuery<TInput, TOutput>(options: {
  procedure: string;
  input: Ref<TInput> | ComputedRef<TInput>;
  queryOptions?: Omit<UseQueryOptions<TOutput, Error, TOutput>, "queryKey" | "queryFn">;
}) {
  const queryKey = computed(() => [options.procedure, options.input.value] as const);
  return useQuery<TOutput, Error>({
    queryKey,
    queryFn: () => {
      // SAFETY: orpcClient is typed generically until the bridge is wired;
      // the runtime shape is a record of procedures keyed by path.
      const map = orpcClient as unknown as Record<string, AnyProcedure>;
      return (map[options.procedure]?.(options.input.value) ??
        Promise.reject(new Error(`orpc procedure ${options.procedure} not found`))) as Promise<TOutput>;
    },
    ...(options.queryOptions ?? {}),
  });
}

export function useOrpcMutation<TInput, TOutput>(options: {
  procedure: string;
  mutationOptions?: Omit<UseMutationOptions<TOutput, Error, TInput, unknown>, "mutationFn">;
}) {
  return useMutation<TOutput, Error, TInput>({
    mutationFn: (input: TInput) => {
      // SAFETY: orpcClient is typed generically until the bridge is wired;
      // the runtime shape is a record of procedures keyed by path.
      const map = orpcClient as unknown as Record<string, AnyProcedure>;
      return (map[options.procedure]?.(input) ??
        Promise.reject(new Error(`orpc procedure ${options.procedure} not found`))) as Promise<TOutput>;
    },
    ...(options.mutationOptions ?? {}),
  });
}

/** Unused re-export retained for symmetry; see ./client.ts. */
export type { Procedure };
