import { useEffect, useRef } from "octane";
import { useLocation } from "@octanejs/wouter";

/**
 * SPA-style route synchronization for the fullstack Octane shell.
 *
 * Octane in fullstack mode (octane.config.ts + file-based routes) renders each
 * URL as a separate SSR page and does NOT intercept `<a href>` clicks for SPA
 * navigation — every link is a full reload by design. To get SPA-like
 * navigation on top of the SSR routing, we pair `@octanejs/wouter`'s `Link`
 * (which intercepts the click, prevents default, and pushes the new URL via the
 * History API) with this component, which listens to URL changes via
 * `useLocation` and synchronizes the DOM in-place:
 *
 *  1. Fetch the new URL as HTML (the same path the SSR route returns).
 *  2. Parse it for the page container (`<main id="content">`) and the
 *     `<script id="__octane_data">` payload.
 *  3. Replace `<main>` innerHTML and update the hydration data payload.
 *  4. Dynamically re-import the route entry so the page's compiled module
 *     re-evaluates; octane's `delegateEvents` (document-level event
 *     delegation) plus the SSR'd `data-on-click` / `data-on-input` attributes
 *     on the new markup re-bind interactions without a full hydrateRoot pass.
 *  5. Scroll to top + move focus to the page heading for accessibility.
 *
 * State that lived in the previous page's component instance (useState,
 * useReducer) is lost — this is the same tradeoff Next/Remix take when they
 * re-render a segment. Server-fetched state is rehydrated because the route
 * module re-runs its RPC calls on mount.
 *
 * The component returns no DOM; it lives inside `<Router>` so `useLocation`
 * re-runs its effect whenever `Link` (or popstate) updates the URL.
 */
export function RouteSync(props: { ssrPath: string }) @{
  const [location] = useLocation({ ssrPath: props.ssrPath });
  const initialPath = useRef<string>(location);

  useEffect(() => {
    // Skip the initial mount: the shell already has the right SSR markup,
    // re-fetching here would just flicker for nothing.
    if (location === initialPath.current) return;
    initialPath.current = location;
    void syncRoute(location);
  }, [location]);

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

    // Re-evaluate the route entry so any module-level work (compiled
    // `delegateEvents` registrations for the new route, `injectStyle` for
    // sibling-scoped styles, side-effect imports) runs against the new DOM.
    // The `?import` suffix matches the format octane's hydrate virtual uses
    // for `routeModules`.
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
