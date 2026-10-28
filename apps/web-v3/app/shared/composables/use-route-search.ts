import { computed } from "vue";
import {
  searchSchemas,
  type SearchParams,
  type SearchSchemaName,
} from "~/router/search-schemas";

/**
 * Typed search params for a route (PRD-v4 §12.5). The route's zod schema is the
 * only contract: invalid params are dropped instead of reaching the screen.
 */
export function useRouteSearch<K extends SearchSchemaName>(routeName: K) {
  const route = useRoute();
  const router = useRouter();
  const schema = searchSchemas[routeName];

  const params = computed<SearchParams<K>>(() => {
    const parsed = schema.safeParse(route.query);
    // Every field of a schema is optional, so an invalid query means no params.
    return (parsed.success ? parsed.data : {}) as SearchParams<K>;
  });

  async function set(partial: Partial<SearchParams<K>>) {
    const current = params.value as Record<string, unknown>;
    const merged: Record<string, unknown> = {
      ...current,
      ...(partial as Record<string, unknown>),
    };
    const query: Record<string, string> = Object.fromEntries(
      Object.entries(merged).filter(
        (entry): entry is [string, string] =>
          typeof entry[1] === "string" && entry[1] !== "",
      ),
    );

    const parsed = schema.safeParse(query);
    if (!parsed.success) {
      return;
    }

    await router.replace({ query });
  }

  return { params, set };
}
