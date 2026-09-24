import type { OctaneNode } from "octane";
import { StatusMessage } from "../atoms/status-message.tsrx";

/**
 * Molecule wrapper presentacional para listas con 4 estados: loading,
 * error, empty, datos. Centraliza el patrón repetido en tasks-page,
 * tasks-config-page y futuras surfaces.
 *
 * Reglas de precedencia:
 * 1. Si `loading=true`, renderiza `skeleton` (y oculta los children).
 * 2. Si `error` (string no vacío), renderiza `StatusMessage variant=error`.
 * 3. Si `isEmpty=true` (y no loading), renderiza `emptyState`.
 * 4. Si nada de lo anterior, renderiza los children.
 *
 * El caller pasa su propio `skeleton`/`emptyState`: DataList no sabe qué
 * es una task ni cómo se renderiza por ítem — solo elige cuál de los 4
 * slots mostrar. Mantener el componente presentacional: no maneja state,
 * no dispara callbacks, no tiene animación propia.
 *
 * NOTA sobre TSRX: octane 0.5.0 / TSRX no soporta `if/else` con JSX
 * statements al final del `@{...}` body (el último statement queda
 * "unused" y rompe SSR). Por eso usamos ternarios anidados o una
 * variable local — ambas formas son válidas en TSRX.
 */

export interface DataListProps {
  loading: boolean;
  error?: string | null;
  isEmpty?: boolean;
  /** Skeleton durante loading (típicamente 2-3 placeholders). */
  skeleton?: OctaneNode;
  /** Empty state cuando isEmpty=true (típicamente CTA + descripción). */
  emptyState?: OctaneNode;
  /** Contenido cuando hay datos (típicamente list.map(item => ...)). */
  children?: OctaneNode;
  /** className del wrapper — el caller controla spacing y flex direction. */
  className?: string;
}

export function DataList(props: DataListProps) @{
  const body = props.loading
    ? <>{props.skeleton}</>
    : props.error
    ? <StatusMessage variant="error">{props.error}</StatusMessage>
    : props.isEmpty
    ? <>{props.emptyState}</>
    : <>{props.children}</>;

  const state = props.loading
    ? "loading"
    : props.error
    ? "error"
    : props.isEmpty
    ? "empty"
    : "ready";

  <div
    data-component="data-list"
    data-state={state}
    class={props.className}
  >
    {body}
  </div>
}
