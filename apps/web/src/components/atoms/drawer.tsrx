import { useEffect, useRef, type OctaneNode } from "octane";
import { t } from "../vendor/i18n/core";

/**
 * Drawer lateral derecho (patrón impeccable).
 *
 * Slots:
 * - `title`: h2 del header (i18n string).
 * - `children`: contenido scrolleable.
 * - `onClose`: requerido (escape + click en backdrop).
 *
 * Comportamiento:
 * - Render dentro de `<aside role="dialog">` con `aria-modal="true"`.
 * - Backdrop (`bg-black/40`) cierra al click.
 * - `Escape` cierra (listener global mientras está abierto).
 * - Lock del body scroll mientras está abierto (`overflow-hidden` en
 *   `<html>`).
 * - Focus se mueve al drawer's container al abrir (tabindex=-1 + focus).
 *
 * Styling: usa el mismo lenguaje visual de task-page (impeccable Operate,
 * design.md). surface + border-l + shadow-2xl. Consistente con TaskForm /
 * ClientForm.
 */
export interface DrawerProps {
  title: string;
  children: OctaneNode;
  onClose: () => void;
  /** Opcional: aria-label del close button (default = global.close). */
  closeLabel?: string;
  /** Ancho: default 480px (responsive via min(480px, 90vw)). */
  widthClass?: string;
}

export function Drawer(props: DrawerProps) @{
  const containerRef = useRef<HTMLElement | null>(null);
  const widthClass = props.widthClass ?? "w-[min(480px,90vw)]";

  // Escape cierra el drawer. Listener solo activo cuando está montado.
  useEffect(() => {
    const handler = (event: KeyboardEvent): void => {
      if (event.key === "Escape") props.onClose();
    };
    globalThis.addEventListener("keydown", handler);
    return () => globalThis.removeEventListener("keydown", handler);
  }, [props]);

  // Lock body scroll mientras el drawer está abierto.
  useEffect(() => {
    const html = document.documentElement;
    const previousOverflow = html.style.overflow;
    html.style.overflow = "hidden";
    return () => {
      html.style.overflow = previousOverflow;
    };
  }, []);

  // Mover focus al container al abrir (a11y: lectores de pantalla y usuarios
  // de keyboard saben que apareción algo nuevo).
  useEffect(() => {
    containerRef.current?.focus();
  }, []);

  <div data-component="drawer-root">
    <div
      data-component="drawer-backdrop"
      class="fixed inset-0 z-30 bg-black/40 transition-opacity duration-200"
      onClick={props.onClose}
      aria-hidden="true"
    />
    <aside
      ref={containerRef}
      data-component="drawer-panel"
      role="dialog"
      aria-modal="true"
      aria-labelledby="drawer-title"
      tabindex="-1"
      class={`fixed top-0 right-0 z-40 flex h-screen ${widthClass} flex-col border-l border-border bg-surface shadow-2xl`}
    >
      <header class="flex shrink-0 items-center justify-between gap-4 border-b border-border px-6 py-4">
        <h2
          id="drawer-title"
          class="text-lg font-semibold text-text-primary"
        >
          {props.title}
        </h2>
        <button
          type="button"
          aria-label={props.closeLabel ?? t("shell.close")}
          onClick={props.onClose}
          data-action="close-drawer"
          class="rounded-md p-1 text-text-secondary transition-colors hover:bg-background hover:text-text-primary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="20"
            height="20"
            viewBox="0 0 20 20"
            fill="none"
            stroke="currentColor"
            stroke-width="1.5"
            stroke-linecap="round"
            stroke-linejoin="round"
            aria-hidden="true"
          >
            <line x1="5" y1="5" x2="15" y2="15" />
            <line x1="15" y1="5" x2="5" y2="15" />
          </svg>
        </button>
      </header>
      <div class="flex-1 overflow-y-auto px-6 py-4">
        {props.children}
      </div>
    </aside>
  </div>
}
