/**
 * Núcleo puro de la resolución de tema (D7). Sin DOM ni imports de octane:
 * testeable con `bun test` directamente.
 *
 * ATENCIÓN — duplicación deliberada: el script inline anti-FOUC de
 * `apps/web/index.html` replica esta regla (debe correr pre-paint, sin
 * módulos). SI CAMBIAS UNA, CAMBIA LA OTRA.
 */

/** Tema resuelto que se aplica a `<html>` (clase `.dark`). */
export type Theme = "light" | "dark";

/** Preferencia del usuario: un tema explícito o seguir al sistema operativo. */
export type ThemeSetting = Theme | "system";

/** Clave de persistencia local de la preferencia de tema (shell autenticado). */
export const STORAGE_KEY = "crm-theme";

/**
 * Rutas públicas (PRD §6.8): siguen SIEMPRE al SO, ignorando la preferencia
 * guardada y sin toggle de tema. Prefijos: `/login-verification/...` y futuras
 * sub-secciones legales también son públicas.
 */
export const PUBLIC_PATHS = [
  "/login",
  "/login-verification",
  "/terms",
  "/privacy",
  "/cookies",
] as const;

/**
 * Resuelve el tema efectivo a partir de la preferencia y del estado del SO.
 * Un setting desconocido (p. ej. localStorage corrupto) cae a `system`.
 */
export function resolveTheme(setting: ThemeSetting, systemDark: boolean): Theme {
  if (setting === "light" || setting === "dark") {
    return setting;
  }
  return systemDark ? "dark" : "light";
}

/** Indica si un path (con o sin query string) pertenece a una ruta pública. */
export function isPublicPath(path: string): boolean {
  const pathname = path.split("?")[0] ?? path;
  return PUBLIC_PATHS.some(
    (publicPath) =>
      pathname === publicPath || pathname.startsWith(`${publicPath}/`),
  );
}
