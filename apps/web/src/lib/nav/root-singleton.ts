import type { Root } from "octane";

/**
 * Singleton holder for the content root of the shell.
 *
 * The `ClientRouter` (`apps/web/src/lib/nav/client-router.tsrx`) creates a
 * persistent sub-`Root` on `<main id="content">` after SPA navigation so it
 * can re-render the page component via `root.render(NewComponent)` without
 * tearing down the surrounding shell (sidebar, layout, theme). The Root
 * object lives at module scope because the entry point's initial `Root` (on
 * `#root`) is not exposed by the generated `virtual:octane-hydrate` script.
 *
 * Why this is safe:
 * - The shell's initial hydration owns the whole `#root` subtree, including
 *   `<main>` with the first page rendered. After the first SPA navigation we
 *   swap `<main>` innerHTML and hand ownership to the root held here. The
 *   shell subtree above `<main>` (sidebar, layout, etc.) is unaffected.
 * - `null` means no SPA navigation has happened yet; the entry-point root
 *   still owns the content.
 *
 * Tradeoff: the first SPA navigation creates a new root over a container
 * that was briefly owned by the entry-point root. The entry-point root's
 * reference to the now-swapped DOM nodes becomes orphaned. In practice this
 * is harmless — those nodes are no longer in the document and octane's
 * updates on them are no-ops. The user-visible behavior is correct.
 */

let contentRoot: Root | null = null;

export function setContentRoot(root: Root | null): void {
  contentRoot = root;
}

export function getContentRoot(): Root | null {
  return contentRoot;
}
