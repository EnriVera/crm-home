import { useEffect, useState } from "octane";
import { getCurrentPath, subscribe } from "./client-router.ts";

/**
 * Subscribe to client-side URL changes and re-render the calling component
 * with the current pathname. The initial render returns whatever
 * `globalThis.location.pathname` is at mount time — identical to what
 * `RenderRouteProps.url` would have given on a server render of the same
 * page, so the first paint is hydration-safe.
 *
 * Use this anywhere the UI needs to react to SPA navigation (active nav
 * state, breadcrumbs, in-page tabs that mirror the URL). Components that
 * never change appearance with the URL do not need it.
 */
export function useCurrentPath(): string {
  const [path, setPath] = useState<string>(getCurrentPath());
  useEffect(() => subscribe(() => setPath(getCurrentPath())), []);
  return path;
}
