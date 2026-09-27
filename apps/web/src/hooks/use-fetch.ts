import { useCallback, useEffect, useState } from "octane";

/**
 * Hook genérico para fetch con loading/error/data + cancel-on-unmount.
 *
 * Centraliza el patrón repetido en `tasks-page`, `clients-page`,
 * `incomes-page`, `expenses-page`, `transfers-page`, `schedules-page`,
 * `tasks-config-page`, `task-detail-page`, `client-detail-page` y
 * `config-page` (10 archivos). Antes de este hook, cada uno tenía su
 * propio `useEffect` con `cancelled` + `setLoading(false)` inline —
 * tres de ellos ni siquiera tenían `finally`, lo que dejaba el loading
 * state atascado en `true` si la RPC se colgaba.
 *
 * Garantías:
 * - `loading` empieza en `true` (primer render) y SIEMPRE vuelve a
 *   `false` vía el bloque `finally` — nunca queda atascado.
 * - Si el componente se desmonta antes de que la promesa resuelva, el
 *   setState interno se descarta (no warning, no leak de UI).
 * - `error` es `null` o un `string` con el mensaje de la RPC. Vacío
 *   si la promesa resolvió.
 * - `data` es `null` mientras loading o si error; el valor tipado `T`
 *   cuando la promesa resolvió OK.
 * - `refetch` re-ejecuta el fetcher. Útil para `pull-to-refresh` o
 *   reintento manual desde el empty state.
 *
 * Decisión de diseño: el `fetcher` se llama DENTRO de un `useEffect`.
 * Las dependencias se infieren por el compilador de Octane cuando se
 * omite el array; pasamos el array explícito porque el fetcher es
 * plain `.ts` (no `.tsrx`) y el compilador no infiere a través de
 * wrappers.
 *
 * Uso:
 * ```ts
 * const { loading, error, data, refetch } = useFetch<TaskRow[]>(
 *   () => rpc.tasks.list({ search: q }),
 *   [q],
 * );
 * ```
 */

export interface UseFetchResult<T> {
  loading: boolean;
  error: string | null;
  data: T | null;
  refetch: () => void;
}

export function useFetch<T>(
  fetcher: () => Promise<T>,
  deps: ReadonlyArray<unknown>,
): UseFetchResult<T> {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<T | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      setLoading(true);
      setError(null);
      try {
        const result = await fetcher();
        if (!cancelled) {
          setData(result);
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : String(err));
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    void load();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [...deps, refreshKey]);

  const refetch = useCallback(() => {
    setRefreshKey((k) => k + 1);
  }, []);

  return { loading, error, data, refetch };
}
