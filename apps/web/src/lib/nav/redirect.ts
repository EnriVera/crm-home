import type { Middleware } from "@octanejs/vite-plugin";

export type SessionQuery = () => Promise<{
  user: { id: string; email: string; name: string };
} | null>;

export function redirectResponse(location: string): Response {
  return new Response(null, {
    status: 302,
    headers: { Location: location },
  });
}

/**
 * Lee directo del header `cookie` (presencia de `crm_session=`) en vez de
 * llamar a `rpc.auth.session()`. Justificación: en SSR el `fetch` interno del
 * RPCLink no propaga cookies del browser al backend (Node fetch no tiene
 * contexto de browser), entonces `getSession()` siempre retorna null y se
 * genera un loop de redirecciones con `/login` ↔ `/dashboard`. La validación
 * REAL del token ocurre del lado cliente después de hidratar (cuando el
 * componente del shell dispara `rpc.tasks.*` con `credentials: 'include'`,
 * ahí sí viaja la cookie). Cookie stale solo causa un redirect extra.
 */
function hasSessionCookie(headers: Headers): boolean {
  return (headers.get("cookie") ?? "").includes("crm_session=");
}

export function createAuthRedirect(): Middleware {
  return async (context) => {
    return redirectResponse(
      hasSessionCookie(context.request.headers) ? "/dashboard" : "/login",
    );
  };
}

/**
 * Opuesto de `createAuthRedirect`: si el request trae cookie `crm_session`,
 * redirige al dashboard. Si NO trae sesión, deja pasar (`next()`). Se usa en
 * rutas públicas de auth (`/login`, `/login-verification`) para que un usuario
 * ya autenticado que navegue a ellas sea mandado al shell en vez de ver la
 * pantalla de login. Forma par con `createAuthRedirect` que está en `/`:
 * ambos mantienen la invariante "auth users en shell, anónimos en auth".
 *
 * Implementación con check de cookie (mismo motivo que `createAuthRedirect`):
 * SSR fetch no propaga cookies del browser, entonces `getSession()` siempre
 * retorna null en SSR y el flujo `/login ↔ /dashboard` loopea.
 */
export function createRedirectIfAuthenticated(): Middleware {
  return async (context, next) => {
    const cookies = context.request.headers.get("cookie") ?? "";
    // El flag `?reauth=1` fuerza el render de /login aunque haya cookie
    // presente: lo emite el 401 interceptor del RPC client cuando la
    // session del server murió (cookie stale) y queremos que el user
    // re-ingrese sus credenciales en vez de rebotar al dashboard.
    let isReauth = false;
    try {
      isReauth = new URL(context.request.url).searchParams.get("reauth") === "1";
    } catch {
      // URL inválida: sin reauth, cae al comportamiento por defecto.
    }
    if (cookies.includes("crm_session=") && !isReauth) {
      return redirectResponse("/dashboard");
    }
    return next();
  };
}
