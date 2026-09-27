/**
 * Client-side navigation primitives for the octane fullstack shell.
 *
 * Octane in fullstack mode (octane.config.ts + file-based routes) does NOT
 * intercept `<a href>` clicks — every navigation is a full reload by design.
 * This module is the minimum we need on top to make the app feel like an SPA:
 *
 *  - `navigate(href, { replace? })` pushes/replaces the URL via the History
 *    API and notifies subscribers.
 *  - `installClientRouter()` (called once from the shell) wires up a single
 *    delegated click listener on `document` that intercepts left-click on
 *    internal `<a>` tags and routes them through `navigate` instead of
 *    letting the browser do a full navigation.
 *  - A `popstate` listener keeps `currentPath` in sync with back/forward.
 *  - `subscribe(listener)` lets components re-render when the URL changes —
 *    the active-state class in the sidebar depends on this.
 *
 * Why no `@octanejs/wouter` (the official port): wouter's `useSyncExternalStore`
 * interactions drag React's scheduler into a bundle that does not load React,
 * and on the `RouteSync` re-evaluation path the scheduler fires
 * `reportAllChanges` against a task without `startTime` and crashes with
 * `Cannot read properties of undefined (reading 'startTime')`. A 100-line
 * hand-rolled router avoids the dependency entirely and gives us exactly the
 * semantics we need for an app whose routing surface is a fixed table from
 * `lib/nav/routes.ts`.
 */

const listeners = new Set<() => void>();
let installed = false;
let currentPath = readInitialPath();

function readInitialPath(): string {
 if (globalThis.location === undefined) return "/";
 return globalThis.location.pathname || "/";
}

export function getCurrentPath(): string {
 return currentPath;
}

export function subscribe(listener: () => void): () => void {
 listeners.add(listener);
 return () => {
  listeners.delete(listener);
 };
}

function notify(): void {
 for (const listener of listeners) listener();
}

export function navigate(href: string, opts: { replace?: boolean } = {}): void {
 if (globalThis.history === undefined) return;
 const url = new URL(href, globalThis.location.href);
 if (opts.replace === true) {
  globalThis.history.replaceState({}, "", url);
 } else {
  globalThis.history.pushState({}, "", url);
 }
 currentPath = url.pathname;
 notify();
}

/**
 * Install the global click interceptor + popstate listener. Idempotent —
 * safe to call from multiple components; only the first call wires up the
 * DOM listeners.
 */
export function installClientRouter(): void {
 if (installed === true) return;
 if (document === undefined) return;
 installed = true;

 document.addEventListener("click", handleDocumentClick);
 globalThis.addEventListener("popstate", handlePopState);
}

function handleDocumentClick(event: MouseEvent): void {
 if (event.defaultPrevented === true) return;
 if (event.button !== 0) return;
 if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;

 const target = event.target;
 if (!(target instanceof Element)) return;

 const anchor = target.closest("a");
 if (!(anchor instanceof HTMLAnchorElement)) return;
 if (shouldIntercept(anchor) === false) return;

 event.preventDefault();
 navigate(anchor.href);
}

function handlePopState(): void {
 currentPath = readInitialPath();
 notify();
}

function shouldIntercept(anchor: HTMLAnchorElement): boolean {
 if (anchor.hasAttribute("download") === true) return false;
 const target = anchor.getAttribute("target");
 if (target !== null && target !== "" && target !== "_self") return false;
 const rel = anchor.getAttribute("rel");
 if (rel !== null && rel.split(/\s+/).includes("external") === true)
  return false;

 // Same-origin only.
 let anchorUrl: URL;
 try {
  anchorUrl = new URL(anchor.href, globalThis.location.href);
 } catch {
  return false;
 }
 if (anchorUrl.origin !== globalThis.location.origin) return false;

 // Hash-only links on the same page → let the browser handle smooth scroll.
 if (
  anchorUrl.pathname === globalThis.location.pathname &&
  anchorUrl.hash !== "" &&
  anchorUrl.search === globalThis.location.search
 ) {
  return false;
 }

 return true;
}
