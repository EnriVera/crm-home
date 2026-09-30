import { useEffect, useRef } from "octane";
import { useQueryState } from "@octanejs/nuqs";

/**
 * usePersistedQueryState — URL state con mirror a localStorage.
 *
 * Wrapper sobre `useQueryState` de `@octanejs/nuqs` que persiste el valor
 * a `localStorage` en cada cambio y lo hidrata desde `localStorage` en el
 * mount si la URL no trae valor.
 *
 * Reglas de oro (patrón del proyecto, replicable en otras páginas):
 *   - **URL es la fuente de verdad.** El deep-link siempre gana: si la URL
 *     tiene `?search=foo`, ese es el valor, sin importar localStorage.
 *   - **localStorage es solo caché para reload sin query params.** Si la
 *     URL está vacía, leemos de localStorage y populeamos la URL con
 *     `setValue` para que el deep-link funcione en el siguiente reload.
 *   - **Una sola key por filtro.** El storage key es `crm-${storageKey ?? key}`,
 *     namespaceada con prefijo `crm-` para no chocar con otras apps del
 *     mismo origin.
 *   - **SSR-safe**: todos los accesos a `localStorage` están guarded
 *     con `typeof window === "undefined"`. En SSR el hook se comporta
 *     como `useQueryState` pelado (devuelve el default, sync es no-op).
 *
 * Hidratación en mount:
 *   1. `useQueryState` devuelve el default si la URL no tiene el key.
 *   2. Effect 1 (one-shot) lee localStorage. Si hay valor Y la URL está
 *      en default, llama `setValue(stored)` para poblar la URL.
 *   3. Effect 2 (en cada cambio) escribe a localStorage, pero se salta
 *      el primer render via `hydratedRef` para no pisar el valor
 *      almacenado antes de que la hidratación corra.
 *
 * Por qué dos effects en vez de uno:
 *   - El effect de hidratación necesita correr UNA vez y leer localStorage
 *     antes de cualquier escritura.
 *   - El effect de sync necesita correr en cada cambio de `value`, pero
 *     nunca antes de que la hidratación haya tenido oportunidad de
 *     ejecutarse.
 *   - Un solo effect con `if (firstRender) {...} else {...}` es más
 *     compacto pero mezcla responsabilidades; dos effects hacen el flujo
 *     explícito.
 *
 * Uso típico (replica este patrón en cualquier filtro de página):
 * ```ts
 * const [search, setSearch] = usePersistedQueryState({
 *   key: "search",
 *   parser: parseAsString,
 *   defaultValue: "",
 *   storageKey: "config-types-tab", // namespace por BaseView
 * });
 * ```
 */
export interface UsePersistedQueryStateOptions<T> {
 /** Key de la URL (lo que aparece como `?key=value`). */
 key: string;
 /** Parser de nuqs SIN default aplicado. El hook le aplica `defaultValue`. */
 parser: {
  withDefault: (defaultValue: T) => unknown;
 };
 /** Valor inicial cuando ni URL ni localStorage tienen valor. */
 defaultValue: T;
 /** Override del localStorage key. Default: `crm-${key}`. */
 storageKey?: string;
}

export function usePersistedQueryState<T>(
 opts: UsePersistedQueryStateOptions<T>,
): ReturnType<typeof useQueryState<T>> {
 // El cast a `Parameters<typeof useQueryState<T>>[1]` es necesario porque
 // el `parser.withDefault()` retorna `ParserWithDefault<T>` (un tipo más
 // narrow que el `Parser<T>` que acepta useQueryState) y TS no propaga la
 // inferencia por el wrapper. El runtime es correcto: nuqs hace narrowing
 // del tipo en compile time cuando ve `withDefault`.
 const [value, setValue] = useQueryState(
  opts.key,
  opts.parser.withDefault(opts.defaultValue) as Parameters<
   typeof useQueryState<T>
  >[1],
 );

 const storageKey = `crm-${opts.storageKey ?? opts.key}`;
 const hydratedRef = useRef(false);

 // Effect 1: hidratación one-shot desde localStorage en el mount.
 // Corre UNA vez (deps: []). Si la URL ya tiene un valor, el `if` lo
 // detecta comparando con el default y sale. Si no, lee localStorage y
 // popula la URL via `setValue` (que dispara una re-render y el
 // Effect 2 se ocupa de persistir el nuevo valor de vuelta).
 useEffect(() => {
  if (typeof window === "undefined") return;
  if (hydratedRef.current === true) return;
  hydratedRef.current = true;

  if (value !== opts.defaultValue) {
   // URL ya trae un valor (deep-link). No pisamos; el sync effect
   // lo va a persistir como nueva "preferencia" la próxima vez que
   // el user edite el filtro.
   return;
  }

  try {
   const stored = window.localStorage.getItem(storageKey);
   if (stored === null) return;
   const parsed = JSON.parse(stored) as T;
   // SAFETY: `setValue` rechaza `null | undefined` cuando `T` los
   // incluye en la unión (la firma del setter de nuqs usa `T & {}`
   // para distinguir valores reales de "clear"). El valor que
   // viene de localStorage fue escrito por este mismo hook
   // (effect 2 más abajo), por lo que NO es nullish en runtime —
   // el cast es seguro y no se necesita validación extra.
   setValue(parsed as T & {});
  } catch {
   // localStorage deshabilitado, JSON inválido, o cualquier otro error:
   // caemos al default y no rompemos la página.
  }
  // deps intencionalmente vacías: la hidratación es one-shot.
  // eslint-disable-next-line react-hooks/exhaustive-deps
 }, []);

 // Effect 2: persistencia en cada cambio de `value`. Skip el primer
 // render via `hydratedRef` (que el Effect 1 setea en true antes de
 // que este corra) para no pisar el valor almacenado antes de que la
 // hidratación haya tenido oportunidad de ejecutarse.
 useEffect(() => {
  if (hydratedRef.current === false) return;
  if (typeof window === "undefined") return;

  try {
   window.localStorage.setItem(storageKey, JSON.stringify(value));
  } catch {
   // QuotaExceededError, Safari private mode, etc. — la app sigue
   // funcionando; solo perdemos la persistencia hasta que se libere
   // espacio o el user salga de private mode.
  }
 }, [storageKey, value]);

 return [value, setValue] as ReturnType<typeof useQueryState<T>>;
}
