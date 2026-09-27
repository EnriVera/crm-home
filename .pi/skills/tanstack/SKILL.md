---
name: tanstack
description: "Trigger: tanstack, @tanstack, react-query, tanstack query, tanstack router, tanstack table, tanstack form, tanstack db, useQuery, queryClient. REFERENCE ONLY — TanStack is NOT currently a dependency of the CRM-Home app. Use this skill when evaluating TanStack as a future replacement for the in-house useFetch hook (apps/web/src/hooks/use-fetch.ts), as a replacement for the hand-rolled client-router, or for tables/forms/data sync needs that grow beyond the current scope."
license: Apache-2.0
metadata:
  author: "enri"
  version: "1.0"
---

# Tanstack

## ⚠ Reference only — not currently installed

TanStack is **NOT** a dependency of this project. As of this writing,
CRM-Home uses:

- `apps/web/src/hooks/use-fetch.ts` (in-house, ~90 lines, bun-tested) for
  data fetching with loading/error/refetch.
- A hand-rolled `apps/web/src/lib/nav/client-router.tsrx` for SPA
  navigation (see `.pi/skills/octane/SKILL.md` for why wouter/tanstack-router
  were considered and rejected for octane compatibility).
- Native HTML tables + Tailwind for grids; no table abstraction.

This skill exists so the next agent (or future you) can make a
deliberate decision about **which** TanStack package, **why**, and **what
the migration path looks like** — not so we install TanStack blindly.

## Activation Contract

Activate ONLY when:

- The user is explicitly evaluating TanStack for a new module
  (`/pagos`, `/reportes`, `/dashboard avanzado`).
- The user proposes replacing `useFetch` with `@tanstack/react-query`.
- The user proposes replacing `client-router.tsrx` with `@tanstack/react-router`
  or `@tanstack/react-start`.
- A new page needs >50 rows of tabular data with sorting/filtering and
  the current pattern (server-side + native table) becomes painful.

If none of the above, do NOT activate. The existing patterns are
working and well-tested.

## Hard Rules

- **Do not install `@tanstack/react-router`**. It depends on React's
  scheduler and breaks octane runtime (same crash class as wouter — see
  `.pi/skills/octane/SKILL.md`). The hand-rolled `client-router.tsrx`
  - octane `createRoot` / `root.render` is the chosen path.
- **`@tanstack/react-query` is the only TanStack package that has a
  fair evaluation here**. It is framework-agnostic in its core (uses
  `useSyncExternalStore`-style subscriptions) and the React adapter
  (`@tanstack/react-query`) should NOT be used. Instead, use the core
  package directly with octane's `useSyncExternalStore` — same pattern
  as our hand-rolled `useFetch`, but with Query Devtools, infinite
  queries, mutations, optimistic updates, and request deduplication.
- **`@tanstack/react-start` is a fullstack framework** that would
  replace octane entirely. Out of scope for this skill — adopting it
  means rewriting the shell and every page. Not a near-term decision.
- **`@tanstack/table` for grids** is framework-agnostic (headless table
  logic). It pairs with any view layer. Use only when the user
  explicitly asks for sortable/filterable/virtualized tables.
- **`@tanstack/db` and `@tanstack/ai` are newer**. Out of scope for
  this skill — the project has no immediate need for synced
  collections or LLM middleware.

## Decision Gates

| Need | Action |
| ------ | -------- |
| Data fetching for a new page | Use existing `useFetch` from `apps/web/src/hooks/use-fetch.ts`. If the user wants query devtools / infinite scroll / mutations, evaluate `@tanstack/query-core` (NOT `@tanstack/react-query`). |
| Mutations + optimistic updates across pages | `useFetch` doesn't cover this well. If the user asks, propose `@tanstack/query-core` + a thin octane hook. |
| Sortable/filterable/virtualized grid | Propose `@tanstack/table` (headless) with native HTML table view. Do NOT install `@tanstack/react-table` (React adapter). |
| Multi-step form with validation | Today the project uses plain zod + per-form `logic.ts` reducers (see `apps/web/src/components/organisms/client-form/`). TanStack Form is a fair upgrade but only if forms grow beyond 3-4 fields with cross-field validation. |
| Real-time data sync (local-first) | `@tanstack/db` — but out of scope for this skill; no current need. |
| Router replacement | Do NOT migrate. The current `client-router.tsrx` works; the cost of swapping to `@tanstack/react-router` includes breaking octane compatibility. |
| Fullstack framework replacement | Out of scope. `@tanstack/react-start` would replace octane entirely. Not a near-term decision. |

## Execution Steps

### If evaluating `@tanstack/query-core` as a `useFetch` replacement

1. Read the current `apps/web/src/hooks/use-fetch.ts` to understand the
   contract: `{ loading, error, data, refetch }`, dependency array,
   `finally` invariant, cancellation on unmount.
2. Confirm with the user: is the goal to add capabilities (devtools,
   infinite scroll, mutations), or to replace `useFetch` outright?
   The first is a thin wrapper; the second is a wider refactor.
3. If green-lit, install ONLY `@tanstack/query-core` (not the React
   adapter). Wire it through a new `useOctaneQuery` hook in
   `apps/web/src/hooks/` that mirrors `useFetch`'s surface so callers
   don't change.
4. Do NOT migrate existing pages until the wrapper is stable.

### If evaluating `@tanstack/table` for a new grid

1. Identify the table's data shape (server-side or client-side,
   sortable columns, filterable columns, pagination strategy).
2. Install `@tanstack/table-core` (NOT `@tanstack/react-table`). Pair
   it with a thin octane hook that returns the column model.
3. Render with native `<table>` + Tailwind. Do NOT install
   `@tanstack/table-ui` or similar React-component-table packages.
4. For >1000 rows, also evaluate `@tanstack/virtual-core` for
   windowed rendering.

### If evaluating TanStack Form

1. Check whether the form actually exceeds the current pattern's
   capability: cross-field validation, conditional fields, async
   validation, repeatable field arrays. If not, stick with zod +
   per-form `logic.ts`.
2. If green-lit, install `@tanstack/form-core` and pair with zod (same
   schema as today's per-form validation).

## Output Contract

When TanStack is added to the project:

- Only the **core** package per domain — never the React adapter (which
  drags React's scheduler into octane and breaks at runtime).
- The new hook/module is installed under `apps/web/src/hooks/` or
  `apps/web/src/components/vendor/<name>/` with a stable contract that
  mirrors today's pattern (per the vendor wrapper rule §9 from
  `.pi/skills/zag/SKILL.md`).
- Migration of existing pages is a separate change with its own commit
  — never bundled with the initial installation.
- A memory entry is saved under topic `tanstack-adoption` with the
  rationale, version pin, and pages migrated.

## References

- <https://tanstack.com> — official portal (multiple products).
- <https://tanstack.com/query/latest> — Query docs (the most relevant
  package for this project today).
- <https://tanstack.com/router/latest> — Router (NOT recommended for
  octane; see Hard Rules).
- <https://context7.com/tanstack/tanstack.com/llms.txt> — current upstream
  dump (mostly blog / source-packages MCP, less useful for direct
  API reference; prefer per-product docs).
- `.pi/skills/octane/SKILL.md` — why React-router-family packages are
  avoided in this project.
- `.pi/skills/zag/SKILL.md` — vendor wrapper rule §9 that any TanStack
  integration must follow.
