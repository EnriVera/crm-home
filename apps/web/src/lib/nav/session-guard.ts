import type { Middleware } from "@octanejs/vite-plugin";
import { redirectResponse } from "./redirect";

/**
 * Guard SSR del shell autenticado. Si el request trae cookie `crm_session=`
 * (presencia: NO valida el token) deja pasar al render. Si no trae cookie,
 * redirige a `/login`.
 *
 * Decisión de diseño: presencia de cookie, no fetch a `rpc.auth.session()`.
 * Motivo: en SSR `fetch` interno NO propaga cookies del browser (Node fetch
 * no tiene contexto de browser), entonces `getSession()` siempre retorna null
 * → el usuario con cookie válida es redirigido a `/login`, que a su vez lo
 * manda al dashboard (que también falla por el mismo motivo) → loop
 * `TOO_MANY_REDIRECTS`. Misma técnica aplicada en `createAuthRedirect` y
 * `createRedirectIfAuthenticated` para cerrar las 3 aristas del loop.
 *
 * Trade-off: una cookie `crm_session=foo` inventada pasa al shell, pero
 * cualquier llamada RPC del cliente (con `credentials: 'include'`) hace que
 * el backend rechace la sesión y la UI vuelva al login naturalmente. La
 * validación estricta del token queda del lado del API.
 */
export function createRequireSession(): Middleware {
   return async (context, next) => {
      const cookies = context.request.headers.get("cookie") ?? "";
      if (cookies.includes("crm_session=")) {
         return next();
      }
      return redirectResponse("/login");
   };
}
