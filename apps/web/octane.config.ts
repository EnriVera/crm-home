import {
  defineConfig,
  RenderRoute,
  type RenderRouteEntry,
} from "@octanejs/vite-plugin";
import { createAuthRedirect } from "./src/lib/nav/redirect";
import { createRequireSession } from "./src/lib/nav/session-guard";
import { createRpcClient } from "./src/lib/api/rpc";
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

const baseURL = import.meta.env.VITE_API_URL ?? "/rpc";
const rpc = createRpcClient(baseURL);

async function getSession() {
  try {
    return await rpc.auth.session();
  } catch {
    return null;
  }
}

const authRedirect = createAuthRedirect(getSession);
const requireSession = createRequireSession(getSession);

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

/** Ruta pública de auth: layout `__auth.tsrx` (tema del SO, PRD §6.8). */
export const authRoute = (path: string, entry: RenderRouteEntry): RenderRoute =>
  new RenderRoute({ path, entry, layout: "/src/routes/__auth.tsrx" });

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
