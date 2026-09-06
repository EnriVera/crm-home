import {
  defineConfig,
  RenderRoute,
  type RenderRouteEntry,
} from "@octanejs/vite-plugin";
import { rootRedirect } from "./src/lib/nav/redirect";
import { SHELL_ROUTES } from "./src/lib/nav/routes";

/**
 * Tabla de rutas del meta-framework Octane (D2/D5).
 *
 * El modelo plano de Octane (un `layout` por ruta, sin herencia) se colapsa
 * con dos helpers; la tabla del shell se genera desde la lista canónica
 * `SHELL_ROUTES` (compartida con `lib/nav/tree.ts` — un test garantiza que
 * nav y rutas registradas no divergen). El futuro auth-guard se enchufa como
 * `before` en `shellRoute` sin tocar las 8 declaraciones.
 */

/** Ruta del shell autenticado: layout `__app-shell.tsrx`. */
export const shellRoute = (path: string, entry: RenderRouteEntry): RenderRoute =>
  new RenderRoute({ path, entry, layout: "/src/routes/__app-shell.tsrx" });

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
      // `/` no monta página: el middleware `before` responde 302 a /login (D2).
      // El entry es un fallback defensivo con anchor manual (no renderiza en
      // la práctica; cuando exista sesión, el mismo punto irá a /dashboard).
      new RenderRoute({
        path: "/",
        entry: ["IndexRoute", "/src/routes/index.tsrx"],
        before: [rootRedirect],
      }),
      ...SHELL_ROUTES.map((path) => shellRoute(path, shellEntry(path))),
      // Rutas públicas de auth (D9): layout __auth con tema del SO (§6.8).
      authRoute("/login", ["LoginRoute", "/src/routes/login.tsrx"]),
      authRoute("/login-verification", [
        "LoginVerificationRoute",
        "/src/routes/login-verification.tsrx",
      ]),
    ],
  },
});
