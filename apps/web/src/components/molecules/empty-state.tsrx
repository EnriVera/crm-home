import type { OctaneNode } from "octane";

/**
 * Molecule para los empty states reutilizables de la app.
 *
 * Antes de este componente, cada página repetía inline el mismo bloque:
 * `<div class="flex flex-col items-center rounded-lg border border-dashed
 * bg-surface px-6 py-16 text-center"><Icon /> <h2>title</h2> <p>desc</p>
 * <Button action /></div>`. Eso es ~30 líneas por página, en 8 archivos.
 * Centralizarlo elimina duplicación y garantiza consistencia visual.
 *
 * Variantes:
 * - `kind="empty"` (default) — lista sin datos ("No hay tareas todavía").
 *   Suele incluir un CTA primario que abre el drawer/form de creación.
 * - `kind="notFound"` — detail page con id inexistente ("No encontramos
 *   este cliente"). El CTA primario lleva de vuelta al listado.
 *
 * El caller pasa `icon`, `title`, `description` y un `action` opcional
 * (cualquier OctaneNode — típicamente un Button). El componente no
 * conoce i18n: el caller resuelve las keys.
 *
 * El icon se centra automáticamente; pasar null para omitir (ej. tasks-
 * config que usa texto plano).
 *
 * Visual: dashed border + surface background, padding generoso,
 * jerarquía tipográfica consistente. Sigue la regla de la skill
 * impeccable: "empty states should teach the interface, not say
 * 'nothing here'".
 */

export interface EmptyStateProps {
  icon?: OctaneNode;
  title: OctaneNode;
  description?: OctaneNode;
  action?: OctaneNode;
  /** Variante: cambia sutilmente el copy y el atributo ARIA. */
  kind?: "empty" | "notFound";
  /** Padding vertical. Default "py-16" (generoso). Usa "py-12" en
   *  contextos más compactos (ej. tasks-config). */
  padding?: "py-12" | "py-16";
  class?: string;
}

export function EmptyState(props: EmptyStateProps) @{
  const padding = props.padding ?? "py-16";
  const isNotFound = props.kind === "notFound";

  <div
    data-component="empty-state"
    data-kind={props.kind ?? "empty"}
    role={isNotFound ? "alert" : "status"}
    aria-live="polite"
    class={`flex flex-col items-center rounded-lg border border-dashed border-border bg-surface px-6 ${padding} text-center ${props.class ?? ""}`}
  >
    {props.icon && (
      <div class="mb-4 text-text-secondary">{props.icon}</div>
    )}
    <h2 class={`font-semibold text-text-primary ${isNotFound ? "text-base" : "text-lg"}`}>
      {props.title}
    </h2>
    {props.description && (
      <p class="mt-2 max-w-sm text-sm text-text-secondary">
        {props.description}
      </p>
    )}
    {props.action && (
      <div class="mt-6">{props.action}</div>
    )}
  </div>
}
