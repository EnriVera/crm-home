import type { Middleware } from "@octanejs/vite-plugin";
import { redirectResponse } from "./redirect";
import type { SessionQuery } from "./redirect";

export type { SessionQuery };

export function createRequireSession(getSession: SessionQuery): Middleware {
  return async (_context, next) => {
    try {
      const session = await getSession();
      if (!session) {
        return redirectResponse("/login");
      }
      return next();
    } catch {
      return redirectResponse("/login");
    }
  };
}
