import { useEffect, useRef } from "octane";
import { hydrateRoot, type Root } from "octane";
import {
  getCurrentPath,
  installClientRouter,
  subscribe,
} from "./client-router.ts";
import { getContentRoot, setContentRoot } from "./root-singleton.ts";

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
 *  2. On every URL change after the initial mount: fetches the new SSR HTML,
 *     swaps `<main id="content">` with the new content, updates the
 *     `<script id="__octane_data">` payload, dynamically imports the new
 *     route module from `__octane_data.entry`, and re-hydrates the new page
 *     component via `octane.hydrateRoot()` (first SPA nav) or
 *     `root.render(NewPage)` (subsequent navs).
 *
 * Why `hydrateRoot`/`root.render` and not just `innerHTML =`:
 * - Plain `innerHTML` swap leaves the new DOM un-hydrated. The page
 *   component never mounts, its `useEffect` never runs, and the
 *   `useState(true)` loading flag stays stuck forever — exactly the
 *   "skeleton que no se va" bug the user reported.
 * - `hydrateRoot` adopts the SSR HTML and mounts the component; subsequent
 *   navigations use `root.render(NewPage)` which tears down the old page
 *   and mounts the new one. Both routes go through the same code path so
 *   the loading/empty/error states behave identically to a hard reload.
 *
 * Tradeoff: the entry point's initial `Root` (on `#root`) briefly owns
 * `<main>` before the first SPA nav. The reference becomes orphaned after
 * the swap but this is harmless in practice — see `root-singleton.ts` for
 * the rationale.
 *
 * Accessibility: scroll to top + move focus to the page `<h1>` on every
 * navigation (screen readers announce the new view).
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

    // Update the route data so any subsequent code (or a re-fetch) sees the
    // new entry. Must happen BEFORE the dynamic import so the resolved
    // module path matches what the SSR says is the entry.
    const newData = doc.querySelector("#__octane_data");
    const currentData = document.querySelector("#__octane_data");
    if (newData !== null && currentData !== null) {
      currentData.textContent = newData.textContent;
    }
    const routeData: {
      entry?: string;
      exportName?: string | null;
      params?: Record<string, string>;
      url?: string;
    } = JSON.parse(currentData?.textContent ?? "{}");

    if (typeof routeData.entry !== "string") {
      globalThis.location.assign(path);
      return;
    }

    // Swap the SSR HTML into the live <main>. hydrateRoot (next step) will
    // adopt these nodes.
    currentMain.innerHTML = newMain.innerHTML;

    // Dynamic import of the route module. Octane vite serves `.tsrx` files
    // through `?import`; ordinary `.ts`/`.js` URLs are unchanged.
    const entryUrl = new URL(routeData.entry, globalThis.location.href);
    if (
      entryUrl.pathname.endsWith(".tsrx") &&
      !entryUrl.searchParams.has("import")
    ) {
      const existing = entryUrl.search.slice(1);
      entryUrl.search = existing.length > 0 ? `?import&${existing}` : "?import";
    }
    const PageModule = (await import(
      /* @vite-ignore */ entryUrl.href
    )) as Record<string, unknown>;
    const Page = getComponentExport(
      PageModule,
      routeData.exportName ?? undefined,
    );
    if (typeof Page !== "function") {
      console.error(
        "[client-router] route entry has no component export:",
        routeData.entry,
        routeData.exportName,
      );
      globalThis.location.assign(path);
      return;
    }

    const existingRoot = getContentRoot();
    const pageProps = {
      params: routeData.params ?? {},
      url: path,
    };
    // Octane invokes ComponentBody as `(props, scope, extra)`. The .tsrx
    // `@{ ... }` shorthand compiles to a body that reads `block` from the
    // scope arg, so passing only props throws "Cannot read properties of
    // undefined (reading 'block')". Forward all three args verbatim.
    const pageBody = (
      props: typeof pageProps,
      scope: unknown,
      extra: unknown,
    ): unknown => (Page as (p: typeof pageProps, s: unknown, e: unknown) => unknown)(
      props,
      scope,
      extra,
    );
    if (existingRoot !== null) {
      // Subsequent SPA nav: octane tears down the old page and mounts the
      // new one in place. The same <main> stays mounted in the shell.
      existingRoot.render(pageBody);
    } else {
      // First SPA nav after hydration: hydrateRoot adopts the swapped SSR
      // HTML and mounts the new page component on top of it.
      const root = hydrateRoot(currentMain, pageBody);
      setContentRoot(root);
    }

    // Accessibility: scroll to top + focus the page heading so screen
    // readers announce the new view.
    globalThis.scrollTo({ top: 0, behavior: "instant" });
    const heading = currentMain.querySelector("h1");
    if (heading instanceof HTMLElement) {
      heading.setAttribute("tabindex", "-1");
      heading.focus({ preventScroll: true });
    }
  } catch (error) {
    console.error(
      "[client-router] syncRoute failed, falling back to full reload",
      error,
    );
    globalThis.location.assign(path);
  }
}

function getComponentExport(
  mod: Record<string, unknown>,
  exportName: string | undefined,
): unknown {
  if (exportName !== undefined && typeof mod[exportName] === "function") {
    return mod[exportName];
  }
  if (typeof mod.default === "function") {
    return mod.default;
  }
  for (const [key, value] of Object.entries(mod)) {
    if (typeof value === "function" && /^[A-Z]/.test(key)) {
      return value;
    }
  }
  return undefined;
}
