import type { OctaneNode } from "octane";

export interface SidebarSectionProps {
  /** Texto del label de la sección (ya traducido). */
  label: string;
  /** Slot opcional para acciones a la derecha (botón "+", contador, etc.). */
  trailing?: OctaneNode;
}

/**
 * Encabezado de sección del sidebar. Estilo consistente: label en mono
 * uppercase, tracking 0.25em (mismo lenguaje que el breadcrumb de
 * `PageHeader` y los section labels del mockup Orbit UI). En sidebar
 * colapsado se oculta para no acumular ruido visual.
 */
export function SidebarSection(props: SidebarSectionProps) @{
  <div class="flex items-center justify-between px-3 pt-4 pb-1.5 font-mono text-[10px] text-text-secondary uppercase tracking-[0.25em]">
    <span>{props.label}</span>
    {props.trailing === undefined ? null : props.trailing}
  </div>
}
