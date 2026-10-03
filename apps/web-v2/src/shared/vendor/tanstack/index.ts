/**
 * TanStack Query + Router wrappers.
 * The only place that imports @tanstack/vue-query and @tanstack/vue-router.
 */
import {
  QueryClient,
  VueQueryPlugin,
  type VueQueryPluginOptions,
  type UseQueryReturnType,
  type UseMutationReturnType,
} from "@tanstack/vue-query";

export { useQuery, useMutation, useQueryClient } from "@tanstack/vue-query";
export { QueryClient, VueQueryPlugin };
export type {
  VueQueryPluginOptions,
  UseQueryReturnType,
  UseMutationReturnType,
};
