import type { Middleware } from "@octanejs/vite-plugin";

export type SessionQuery = () => Promise<{ user: { id: string; email: string; name: string } } | null>

export function redirectResponse(location: string): Response {
  return new Response(null, {
    status: 302,
    headers: { Location: location },
  });
}

export function createAuthRedirect(getSession: SessionQuery): Middleware {
  return async () => {
    try {
      const session = await getSession();
      return redirectResponse(session ? "/dashboard" : "/login");
    } catch {
      return redirectResponse("/login");
    }
  };
}
