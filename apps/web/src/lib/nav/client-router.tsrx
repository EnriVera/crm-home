import { useEffect, useRef } from "octane";
import {
  getCurrentPath,
  installClientRouter,
  subscribe,
} from "./client-router.ts";

/**
 * Client-side router mount point for the octane fullstack shell.
 *
 * Octane in fullstack mode (octane.config.ts + file-based routes) renders each
 * URL as a separate SSR page and does NOT intercept `<a href>` clicks for SPA
 * navigation. This component is the bridge that gives the shell SPA-like
 * behavior on top of the SSR routing:
 *
 *  1. On mount: `installClientRouter()` wires up the global click interceptor
 *     and `popstate` listener (idempotent — see `client-router.ts`).
 *  2. On every URL change after the initial mount: fetches the new HTML, swaps
 *     the `<main id="content">` innerHTML, updates the `<script
 *     id="__octane_data">` payload, and dynamically re-imports the route
 *     entry so octane's `delegateEvents` rebinds handlers on the new SSR'd
 *     markup.
 *  3. Restores scroll position to top + moves focus to the page `<h1>` for
 *     accessibility (screen readers announce the new view).
 *
 * Tradeoff: state local to the previous page's component instance
 * (`useState`, `useReducer`) is lost on navigation — same as Next/Remix when
 * they re-render a segment. Server-fetched state is rehydrated because the
 * route module re-runs its RPC calls on mount. For state that needs to
 * survive navigation, use `octane/signals` (`signal$ / query$`) — out of
 * scope here.
 *
 * The component renders no DOM. Mount it exactly once inside the shell.
 */
export function ClientRouter() @{
  const initialPath = useRef<string>(getCurrentPath());

  useEffect(() => {
    installClientRouter();
    return subscribe(() => {
      const path = getCurrentPath();
      if (path === initialPath.current) return;
      initialPath.current = path;
      void syncRoute(path);
    });
  }, []);

  return null;
}

async function syncRoute(path: string): Promise<void> {
  try {
    const response = await fetch(path, {
      headers: { Accept: "text/html" },
      credentials: "include",
    });
    if (!response.ok) {
      // Server rejected (e.g. 401 — auth middleware kicked in). Fall back to
      // a real navigation so the middleware redirect is honored.
      globalThis.location.assign(path);
      return;
    }
    const html = await response.text();
    const doc = new DOMParser().parseFromString(html, "text/html");

    const newMain = doc.querySelector("main#content");
    const currentMain = document.querySelector("main#content");
    if (newMain === null || currentMain === null) {
      globalThis.location.assign(path);
      return;
    }

    currentMain.innerHTML = newMain.innerHTML;

    const newData = doc.querySelector("#__octane_data");
    const currentData = document.querySelector("#__octane_data");
    if (newData !== null && currentData !== null) {
      currentData.textContent = newData.textContent;
    }

    // Re-evaluate the route entry so module-level work (compiled
    // `delegateEvents` registrations, `injectStyle` for sibling-scoped styles,
    // side-effect imports) runs against the new DOM. The `?import` suffix
    // matches the format octane's hydrate virtual uses for `routeModules`.
    const dataText = currentData?.textContent;
    if (typeof dataText === "string" && dataText.length > 0) {
      try {
        const payload = JSON.parse(dataText) as { entry?: string };
        if (typeof payload.entry === "string") {
          await import(/* @vite-ignore */ `${payload.entry}?import`);
        }
      } catch {
        // Malformed payload: not catastrophic — the SSR markup is already in
        // place and the page just won't have its compiled side-effects.
      }
    }

    // Accessibility: scroll to top + move focus to the page heading so screen
    // readers announce the new view. The `<h1>` is a stable contract in this
    // app: every page has one.
    globalThis.scrollTo({ top: 0, behavior: "instant" });
    const heading = currentMain.querySelector("h1");
    if (heading instanceof HTMLElement) {
      heading.setAttribute("tabindex", "-1");
      heading.focus({ preventScroll: true });
    }
  } catch {
    // Network or parse error: bail to a real navigation so the user is not
    // stranded on stale content.
    globalThis.location.assign(path);
  }
}
