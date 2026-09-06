/**
 * Lógica pura del layout del sidebar (D-SA6). El binding
 * `@octanejs/resizable-panels` trabaja en PORCENTAJES del contenedor (no en
 * px — la px-exactitud 260↔64 se abandona justificadamente: con resize real un
 * ancho fijo deja de tener sentido; la paridad visual se verifica manualmente).
 *
 * Persistencia: la clave histórica `"crm-sidebar"` (booleano) queda abandonada
 * y se reemplaza por el auto-save del binding bajo el id `SIDEBAR_LAYOUT_ID`
 * (formato gestionado por el binding; sin migración de datos — preferencia
 * cosmética, el usuario arranca con el default una vez).
 */

/** Tamaños del panel del sidebar en % del contenedor del shell. */
export const SIDEBAR_LAYOUT = {
  /** Ancho del panel colapsado (solo ícono + title/aria-label). */
  collapsedSize: 5,
  /** Mínimo arrastrable sin colapsar. */
  minSize: 15,
  /**
   * Ancho inicial y ÚNICO tamaño de SSR/hidratación (snapshot estable, patrón
   * D8): el layout persistido se aplica post-mount solo en cliente → sin
   * mismatch de hidratación.
   */
  defaultSize: 20,
  /** Máximo arrastrable. */
  maxSize: 30,
} as const;

/** Id del auto-save del binding (evolución documentada de `"crm-sidebar"`). */
export const SIDEBAR_LAYOUT_ID = "crm-sidebar-layout";

/** ¿El tamaño (en %) corresponde al panel colapsado? */
export function isCollapsedSize(size: number): boolean {
  return size <= SIDEBAR_LAYOUT.collapsedSize;
}

/**
 * Clamp de límites: la zona `≤ collapsedSize` es el colapso; el resto queda
 * confinado a `[minSize, maxSize]`.
 */
export function clampSidebarSize(size: number): number {
  if (isCollapsedSize(size)) return SIDEBAR_LAYOUT.collapsedSize;
  return Math.min(Math.max(size, SIDEBAR_LAYOUT.minSize), SIDEBAR_LAYOUT.maxSize);
}
