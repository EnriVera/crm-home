import { useCallback, useEffect, useMemo, useState } from "octane";

import {
 QueryClient,
 QueryObserver,
 type QueryKey,
 type QueryObserverResult,
} from "@tanstack/query-core";

/**
 * Wrapper sobre `@tanstack/query-core` para usar queries en componentes
 * `.tsrx` de Octane sin arrastrar el scheduler de React (ver
 * `.pi/skills/tanstack/SKILL.md` — el React adapter rompe octane).
 *
 * Surface **idéntica a `useFetch`** para que la migración de las 9
 * páginas que lo usan sea 1-a-1 (ver
 * `odd/tanstack-query-migration/tasks.md`):
 *
 * ```ts
 * const { loading, error, data, refetch } = useOctaneQuery<TaskRow[]>(
 *   () => rpc.tasks.list({ search: q }),
 *   [q],
 * );
 * ```
 *
 * Diferencias semánticas con `useFetch` (ganancias de TanStack Query):
 * - **Deduplicación automática**: si dos componentes piden la misma
 *   `queryKey`, comparten el resultado y el fetch.
 * - **Cancel-on-unmount**: el observer se desuscribe al desmontar; el
 *   query queda en caché hasta el `gcTime` configurado.
 * - **`finally` invariant**: TanStack Query siempre notifica al observer
 *   al terminar el fetch (success o error), por lo que `loading`
 *   nunca queda atascado en `true`.
 *
 * Caveats:
 * - **WebSocket cache invalidation (PRD-v2.md línea 69) NO está
 *   implementado** — pendiente para otra fase.
 * - `defaultOptions.staleTime` se setea en el `QueryClient` singleton.
 */

interface OctaneQueryResult<T> {
 loading: boolean;
 error: string | null;
 data: T | null;
 refetch: () => void;
}

type Fetcher<T> = () => Promise<T>;

let _queryClient: QueryClient | null = null;

/** Singleton lazy del QueryClient. No se recrea entre mounts. */
export function getQueryClient(): QueryClient {
 if (_queryClient === null) {
  _queryClient = new QueryClient({
   defaultOptions: {
    queries: {
     staleTime: 30_000,
     gcTime: 5 * 60_000,
     retry: 1,
     refetchOnWindowFocus: false,
    },
   },
  });
 }
 return _queryClient;
}

function errorMessage(err: unknown): string | null {
 if (err === null || err === undefined) return null;
 if (err instanceof Error) return err.message;
 return String(err);
}

/**
 * Compara dos snapshots de QueryObserverResult shallowly. Usado para
 * evitar `setState` redundantes (octane ya no detecta cambios Object.is
 * sobre el mismo objeto, así que cambiamos la referencia solo cuando
 * un campo relevante cambió).
 */
function shallowChanged<T, TError>(
 a: QueryObserverResult<T, TError>,
 b: QueryObserverResult<T, TError>,
): boolean {
 return (
  a.data !== b.data ||
  a.error !== b.error ||
  a.status !== b.status ||
  a.fetchStatus !== b.fetchStatus
 );
}

/**
 * Mapear el resultado de QueryObserver al contrato estable de `useFetch`.
 * `loading` cubre los dos casos: primer fetch (`status === 'pending'`)
 * y re-fetch en background (`fetchStatus === 'fetching'`).
 */
function toContract<T>(
 snap: QueryObserverResult<T, unknown>,
): Omit<OctaneQueryResult<T>, "refetch"> {
 return {
  loading: snap.fetchStatus === "fetching" || snap.status === "pending",
  error: errorMessage(snap.error),
  data: (snap.data ?? null) as T | null,
 };
}

export function useOctaneQuery<T>(
 fetcher: Fetcher<T>,
 deps: ReadonlyArray<unknown>,
): OctaneQueryResult<T> {
 const client = getQueryClient();
 const queryKey: QueryKey = ["octane", ...deps];
 // Serializa el queryKey para que useMemo solo re-cree el observer
 // cuando el contenido lógico cambia (NO la referencia del array).
 const stableKey = queryKey.join("|");

 // El observer se crea una sola vez por (client, stableKey). Si el
 // deps array cambia lógicamente, stableKey cambia, useMemo invalida
 // la cache y se crea un observer nuevo con el nuevo queryFn. Eso es
 // exactamente lo que queremos: deps change → refetch.
 const observer = useMemo(
  () =>
   new QueryObserver<T, unknown>(client, {
    queryKey,
    queryFn: fetcher,
   }),
  // eslint-disable-next-line react-hooks/exhaustive-deps
  [client, stableKey],
 );

 const [result, setResult] = useState<QueryObserverResult<T, unknown>>(() =>
  observer.getCurrentResult(),
 );

 useEffect(() => {
  const unsubscribe = observer.subscribe((next) => {
   setResult((prev) => (shallowChanged(prev, next) ? next : prev));
  });
  return () => {
   unsubscribe();
  };
 }, [observer]);

 const refetch = useCallback(() => {
  void observer.refetch();
 }, [observer]);

 return { ...toContract(result), refetch };
}
