/**
 * Helpers puros para `BaseView`.
 *
 * Aislados del componente `.tsrx` para que sean testeables sin requerir
 * el plugin de Octane (los `.tsrx` no resuelven en bun:test — ver
 * apps/web/src/components/vendor/{dnd-kit,lexical} para el patrón).
 *
 * Regla §D2 del design: el namespace localStorage es
 *   `base-view:<moduleId>:<viewId|default>` (filters)
 *   `base-view:<moduleId>:<viewId|default>:view` (selected view)
 * NO colisiona con `crm-sidebar-layout` (otro namespace del meta-framework).
 */

export function buildBaseViewStorageKey(
 id: string | undefined,
 moduleId: string,
): string {
 const suffix = id ?? "default";
 return `base-view:${moduleId}:${suffix}`;
}

/**
 * Key separada para el view seleccionado (independiente de los filters).
 * Permite resetear filters sin perder la elección de vista, y viceversa.
 */
export function buildViewStorageKey(
 id: string | undefined,
 moduleId: string,
): string {
 return `${buildBaseViewStorageKey(id, moduleId)}:view`;
}

export function serializeFilters<T extends Record<string, unknown>>(
 filters: T,
): string {
 return JSON.stringify(filters);
}

export function parsePersistedFilters<T extends Record<string, unknown>>(
 raw: string | null | undefined,
): T {
 if (!raw) return {} as T;
 try {
  const parsed = JSON.parse(raw);
  if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
   return parsed as T;
  }
  return {} as T;
 } catch {
  return {} as T;
 }
}

const VALID_VIEW_KINDS = ["list", "grid", "kanban"] as const;
export type ViewKind = (typeof VALID_VIEW_KINDS)[number];

export function isValidViewKind(value: unknown): value is ViewKind {
 return (
  typeof value === "string" &&
  (VALID_VIEW_KINDS as readonly string[]).includes(value)
 );
}

/**
 * Lee el view persistido del localStorage. Si no existe o es inválido,
 * retorna `null` — el caller debe usar el default (primera vista de
 * `availableViews`).
 */
export function parsePersistedView(
 raw: string | null | undefined,
): ViewKind | null {
 if (!raw) return null;
 return isValidViewKind(raw) ? raw : null;
}
