import {
  defineConfig,
  RenderRoute,
  type RenderRouteEntry,
} from "@octanejs/vite-plugin";
import {
  createAuthRedirect,
  createRedirectIfAuthenticated,
} from "./src/lib/nav/redirect";
import { createRequireSession } from "./src/lib/nav/session-guard";
import { SHELL_ROUTES } from "./src/lib/nav/routes";

/**
 * Tabla de rutas del meta-framework Octane (D2/D5).
 *
 * El modelo plano de Octane (un `layout` por ruta, sin herencia) se colapsa
 * con dos helpers; la tabla del shell se genera desde la lista canónica
 * `SHELL_ROUTES` (compartida con `lib/nav/tree.ts` — un test garantiza que
 * nav y rutas registradas no divergen). El auth-guard se enchufa como
 * `before` en `shellRoute` sin tocar las 8 declaraciones.
 */

const authRedirect = createAuthRedirect();
const requireSession = createRequireSession();
// `authRedirect` y `requireSession` leen directo del header `cookie` del
// incoming request (presencia de `crm_session=`) en vez de llamar al RPC.
// La validación estricta del token queda del lado del API, vía
// `rpc.auth.session()` cliente con `credentials: 'include'`, que sí propaga
// la cookie del browser. Si la cookie es inválida, el shell responde 401
// y la UI vuelve al login naturalmente. Misma técnica aplicada en
// `redirectIfAuthenticated` para cerrar las 3 aristas del loop.
const redirectIfAuthenticated = createRedirectIfAuthenticated();

/** Ruta del shell autenticado: layout `__app-shell.tsrx`. */
export const shellRoute = (
  path: string,
  entry: RenderRouteEntry,
): RenderRoute =>
  new RenderRoute({
    path,
    entry,
    layout: "/src/routes/__app-shell.tsrx",
    before: [requireSession],
  });

/** Ruta pública de auth: layout `__auth.tsrx` (tema del SO, PRD §6.8).
 * Incluye `redirectIfAuthenticated` para que un usuario YA logueado que
 * intente acceder a `/login` o `/login-verification` sea redirigido al
 * dashboard en vez de ver la pantalla de auth (par de `authRedirect` que
 * hace lo opuesto en `/`). */
export const authRoute = (path: string, entry: RenderRouteEntry): RenderRoute =>
  new RenderRoute({
    path,
    entry,
    layout: "/src/routes/__auth.tsrx",
    before: [redirectIfAuthenticated],
  });

/** Entry convencional de una ruta del shell: `<Slug>Route` en `<slug>.tsrx`. */
const shellEntry = (path: string): RenderRouteEntry => {
  const slug = path.slice(1);
  const exportName = slug.charAt(0).toUpperCase() + slug.slice(1) + "Route";
  return [exportName, `/src/routes/${slug}.tsrx`];
};

export default defineConfig({
  router: {
    routes: [
      // `/` no monta página: el middleware `before` responde 302 según sesión.
      new RenderRoute({
        path: "/",
        entry: ["IndexRoute", "/src/routes/index.tsrx"],
        before: [authRedirect],
      }),
      ...SHELL_ROUTES.map((path) => shellRoute(path, shellEntry(path))),
      // Rutas públicas de auth (D9): layout __auth con tema del SO (§6.8).
      authRoute("/login", ["LoginRoute", "/src/routes/login.tsrx"]),
      authRoute("/login-verification", [
        "LoginVerificationRoute",
        "/src/routes/login-verification.tsrx",
      ]),
      // PR-F: rutas adicionales del módulo tasks (sin item en SHELL_ROUTES).
      // Heredan `before: [requireSession]` vía shellRoute.
      shellRoute("/tasks/:id", [
        "TaskDetailRoute",
        "/src/routes/tasks/$id.tsrx",
      ]),
      shellRoute("/tasks-config", [
        "TasksConfigRoute",
        "/src/routes/tasks-config.tsrx",
      ]),
    ],
  },
});
