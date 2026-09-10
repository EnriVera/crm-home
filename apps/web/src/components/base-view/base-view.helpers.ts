/**
 * Helpers puros para `BaseView`.
 *
 * Aislados del componente `.tsrx` para que sean testeables sin requerir
 * el plugin de Octane (los `.tsrx` no resuelven en bun:test — ver
 * apps/web/src/components/vendor/{dnd-kit,lexical} para el patrón).
 *
 * Regla §D2 del design: el namespace localStorage es
 *   `base-view:<moduleId>:<viewId|default>`
 * NO colisiona con `crm-sidebar-layout` (otro namespace del meta-framework).
 */

export function buildBaseViewStorageKey(
 id: string | undefined,
 moduleId: string,
): string {
 const suffix = id ?? "default";
 return `base-view:${moduleId}:${suffix}`;
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
