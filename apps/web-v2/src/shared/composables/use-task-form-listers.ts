import {
 computed,
 watch,
 type MaybeRefOrGetter,
 type Ref,
 toValue,
} from "vue";
import {
 useQuery,
 type UseQueryReturnType,
} from "@/shared/vendor/tanstack";
import type {
 TypeForForm,
 CategoryForForm,
 ClientListItem,
} from "@crm/contract/task";
import { uuidSchema } from "@crm/contract/shared/identifiers";
import type { DomainError } from "@/domain/shared/errors";
import {
 makeListTypesForForm,
 makeListCategoriesByType,
 makeSearchClients,
} from "@/application/task/use-cases";
import { taskFormListersRepository } from "@/infrastructure/repositories";

/* ============================================================== */
/*  Types for form listers                                         */
/* ============================================================== */

export interface TypesForFormParams {
 readonly module?: string;
 readonly clie_id?: string;
}

export interface CategoriesByTypeParams {
 readonly type_id: string;
}

export interface SearchClientsParams {
 readonly query: string;
 readonly limit?: number;
}

/* ============================================================== */
/*  useTypesForForm                                                */
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
 * useTypesForForm — fetches the type options for the task form.
 * Disabled when params are not set; refetches on param change.
 */
export function useTypesForForm(
 params: MaybeRefOrGetter<TypesForFormParams | null>,
): UseQueryReturnType<TypeForForm[], Error> {
 const listTypes = makeListTypesForForm(taskFormListersRepository);
 const resolved = computed(() => toValue(params));

 return useQuery({
  queryKey: computed(() => ["tasks", "form", "types", resolved.value]),
  queryFn: async () => {
   const p = resolved.value;
   if (!p) return [] as TypeForForm[];
   const result = await listTypes(p);
   if (!result.ok) throw new DomainErrorToError(result.error);
   return result.value;
  },
  enabled: computed(() => resolved.value !== null),
  staleTime: 60_000,
 });
}

/* ============================================================== */
/*  useCategoriesByType                                            */
/* ============================================================== */

/**
 * useCategoriesByType — cascade dep of the type select. Disabled
 * until a type is selected; refetches when type changes.
 */
export function useCategoriesByType(
 params: MaybeRefOrGetter<CategoriesByTypeParams | null>,
): UseQueryReturnType<CategoryForForm[], Error> {
 const listCategories = makeListCategoriesByType(taskFormListersRepository);
 const resolved = computed(() => toValue(params));

 return useQuery({
  queryKey: computed(() => [
   "tasks",
   "form",
   "categories",
   resolved.value,
  ]),
  queryFn: async () => {
   const p = resolved.value;
   if (!p) return [] as CategoryForForm[];
   // Validate the uuid at the composable boundary so the form layer
   // never has to deal with a bad type_id; the server still rejects
   // a non-uuid too, but we can disable the query earlier.
   const idParse = uuidSchema.safeParse(p.type_id);
   if (!idParse.success) return [] as CategoryForForm[];
   const result = await listCategories({ type_id: idParse.data });
   if (!result.ok) throw new DomainErrorToError(result.error);
   return result.value;
  },
  enabled: computed(
   () => resolved.value !== null && uuidSchema.safeParse(resolved.value.type_id).success,
  ),
  staleTime: 60_000,
 });
}

/* ============================================================== */
/*  useSearchClients                                               */
/* ============================================================== */

/**
 * useSearchClients — debounced search-as-you-type for the client
 * combobox. Returns a ref<query> + ref<limit> that the form binds.
 * The query runs on a 250 ms debounce; the cache is short (15 s)
 * because the user is actively typing.
 */
export function useSearchClients(
 query: Ref<string>,
 limit: Ref<number> = ref(20),
): UseQueryReturnType<ClientListItem[], Error> {
 const search = makeSearchClients(taskFormListersRepository);
 const debounced = refDebounced(query, 250);

 return useQuery({
  queryKey: computed(() => [
   "tasks",
   "form",
   "clients",
   "search",
   debounced.value,
   limit.value,
  ]),
  queryFn: async () => {
   const q = debounced.value.trim();
   if (q.length < 1) return [] as ClientListItem[];
   const result = await search({ query: q, limit: limit.value });
   if (!result.ok) throw new DomainErrorToError(result.error);
   return result.value;
  },
  enabled: computed(() => debounced.value.trim().length >= 1),
  staleTime: 15_000,
 });
}

/* ============================================================== */
/*  Local helpers — keep them inside this module so consumers      */
/*  only import the composables.                                   */
/* ============================================================== */

import { ref } from "vue";

/** Simple debounced ref; tracks `source` with a `delayMs` settle. */
function refDebounced<T>(source: Ref<T>, delayMs: number): Ref<T> {
 const debouncedRef = ref(source.value) as Ref<T>;
 let timer: ReturnType<typeof setTimeout> | undefined;
 watch(source, (next) => {
  if (timer) clearTimeout(timer);
  timer = setTimeout(() => {
   debouncedRef.value = next;
  }, delayMs);
 });
 return debouncedRef;
}
