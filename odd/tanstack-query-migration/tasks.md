# TanStack Query migration

> **Feature doc for:** migrating `useFetch` (the in-house data hook) to
> `@tanstack/query-core`, wired into octane via a thin wrapper hook.
> Closes the gap between `apps/web/src/components/hooks/use-fetch.ts`
> (current) and the PRD-v2.md sync model
> ("los CRUD viajan por HTTP (orpc + tanstack-query con cache de nitro)",
> line 69).

## Why

- **PRD-v2.md line 69** explicitly plans for tanstack-query with cache.
- **TanStack Query** gives us for free: stale-while-revalidate, devtools,
  mutations, optimistic updates, request deduplication, background
  refetch on focus — none of which `useFetch` covers.
- **Why `@tanstack/query-core` (not `@tanstack/react-query`)**: the React
  adapter drags React's scheduler into octane runtime, which crashes
  (same class as the wouter bug we already removed). The core is
  framework-agnostic and we wrap it with octane's own
  `useSyncExternalStore`.

## Architectural decisions

| Decision | Rationale |
| ---------- | ----------- |
| Use `@tanstack/query-core`, NOT `@tanstack/react-query` | Same octane-runtime reason as `client-router.tsrx`: any React scheduler drags into octane crashes on the first `reportAllChanges`. |
| Wrap with `useOctaneQuery` that mirrors `useFetch`'s surface | Lets existing pages migrate 1:1 with no extra plumbing. New features can use the full TanStack API surface (queries, mutations, optimistic). |
| Page-by-page atomic commits | 9 commits, each migrates ONE page + tests + verified E2E. Independent rollback per page. |
| WebSocket invalidation (PRD line 69) deferred | Requires wiring WS into the QueryClient cache invalidation — separate phase, separate plan, not in this change. |
| No config singleton file at first | `QueryClient` is created on first import in the wrapper; later, if needed, move to `apps/web/src/lib/query-client.ts`. |

## Subsystems

1. **`apps/web/src/hooks/use-octane-query.ts`** — wrapper hook
   - Surface: `{ loading, error, data, refetch }` (matches useFetch)
   - Internal: `QueryObserver` from `@tanstack/query-core`
   - Reactivity: `useSyncExternalStore` from `octane`
   - Cancellation: QueryObserver lifecycle handles it (no manual `cancelled` flag)
   - `finally` invariant: QueryObserver fires even on error — `loading` always resolves to `false`
   - Tests: `apps/web/src/hooks/use-octane-query.test.ts` (headless, no DOM)

2. **`apps/web/package.json`** — add `@tanstack/query-core` dependency

3. **Per-page migration** (9 commits):
   - `clients-page` (pilot) — first migration, validates the wrapper
   - `client-detail-page`
   - `tasks-page`
   - `tasks-config-page`
   - `incomes-page`
   - `expenses-page`
   - `transfers-page`
   - `schedules-page`
   - `config-page`

## Phases

### Phase 1 — Infrastructure (1 commit)

- Install `@tanstack/query-core` (pinned)
- Implement `useOctaneQuery` (mirrors `useFetch`)
- Write 8 bun tests for the wrapper (matching the useFetch test surface)
- Verify build + typecheck

### Phase 2 — Per-page migration (9 commits)

Each commit:

1. Replace `useFetch` with `useOctaneQuery` for the SAME fetch call
2. Verify no behavior change (E2E with playwright/agent-browser)
3. Commit with scope `refactor(web):` and per-page subject

Pilot first: `clients-page`. If it reveals wrapper gaps, fix them in the
wrapper before migrating the next page. If clean, migrate in this order:
clients → tasks → tasks-config → client-detail → incomes → expenses →
transfers → schedules → config.

### Phase 3 — Deferred (NOT in this change)

- WebSocket invalidation tied to QueryClient cache (PRD line 69)
- Persistence (`createSyncStoragePersister`)
- Devtools (`@tanstack/query-devtools` has a core-only flavor)
- `useOctaneMutation` for create / update / delete flows (today each page
  manually calls the RPC and refetches; mutation hook would handle that)

## Migration contract

For each page, the commit diff should look like:

```diff
- const tasksFetch = useFetch<TaskRow[]>(
+ const tasksQuery = useOctaneQuery<TaskRow[]>(
    () => rpc.tasks.list({ search: q }),
    [q],
  );
- const loading = tasksFetch.loading;
+ const loading = tasksQuery.loading;
- const loadError = tasksFetch.error;
+ const loadError = tasksQuery.error;
- const tasks = tasksFetch.data ?? [];
+ const tasks = tasksQuery.data ?? [];
- // later...
- tasksFetch.refetch();
+ tasksQuery.refetch();
```

No call-site behavior change. After migration, the page renders exactly
the same UI; only the data hook changed.

## Verification

- **Per-page E2E** with `agent-browser` after each migration: login → SPA
  nav → list page → assert empty state visible, no console warnings,
  URL intact.
- **Backwards compat**: `useFetch` stays in the codebase during Phase 2
  (last page removed removes the file in the same or subsequent commit).
  This lets pages migrate independently and roll back if a wrapper bug
  surfaces.

## Out of scope

- `useOctaneMutation`
- Optimistic UI (each page today calls `refetch()` after create/update)
- WebSocket cache invalidation
- Storage persistence / hydration
- Cache time / stale time tuning per page

These are tracked as future PRD-v2.md features. Do NOT bundle into the
9 per-page commits.
