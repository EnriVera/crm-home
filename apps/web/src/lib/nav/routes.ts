/**
 * Lista canónica de rutas del shell (D5). Única fuente compartida por la
 * tabla de `octane.config.ts` y el árbol del sidebar: nav y rutas
 * registradas no pueden divergir (test de consistencia en `tree.test.ts`).
 */
export const SHELL_ROUTES = [
  "/dashboard",
  "/tasks",
  "/schedules",
  "/clients",
  "/incomes",
  "/expenses",
  "/transfers",
  "/config",
] as const;

export type ShellRoute = (typeof SHELL_ROUTES)[number];
