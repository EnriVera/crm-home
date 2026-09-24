# DataList abstraction + Optimistic UI

## Scope

3 follow-up items from the previous polish waves:

1. **DataList molecule (DRY)** — extract the `loading / error / empty / list`
   pattern into a reusable component. Used by tasks-page + tasks-config-page.
2. **Optimistic create on tasks-page** — when the user creates a task,
   appear instantly in the list with a temporary ID; reconcile with the
   server response on success, roll back on failure.
3. (Out of scope this pass) — Optimistic edit/delete/move require
   `router.refresh` or stale-data dedup; defer until DataList + create
   pattern are proven.

## Why

- Every list page duplicates the same 4-state render:
  `{loading ? <Skeleton /> : items.length === 0 ? <EmptyState /> : <List />}`
  plus error handling. As more surfaces land (clients, finance), this
  scales badly.
- The create-task flash (drawer close → refresh → empty state for ~100ms →
  task appears) feels broken. Adding to the list instantly closes the
  perceived loop.

## Plan

### Wave A: DataList molecule

File: `apps/web/src/components/molecules/data-list.tsrx`

API:

```tsx
<DataList
  loading={loading}
  error={loadError}
  isEmpty={tasks.length === 0}
  emptyState={<EmptyState onCreate={...} />}
  skeleton={<><Skeleton /><Skeleton /><Skeleton /></>}
  className="flex flex-col gap-3"
>
  {tasks.map(t => <TaskListItem key={t.task_id} ... />)}
</DataList>
```

Behavior:

- `loading=true` → renders `skeleton`, hides children
- `error` (string) → renders StatusMessage, hides children
- `isEmpty=true` (and !loading) → renders `emptyState`, hides children
- Else → renders children (the list)
- No new state introduced; pure presentational wrapper

Then refactor:

- `tasks-page.tsrx` (loading + skeleton + error path)
- `tasks-config-page.tsrx` (loading + skeleton + error path)

### Wave B: Optimistic create (tasks-page)

In `handleCreate`:

1. Generate `crypto.randomUUID()` as temp id
2. Push optimistic task to `tasks` state (top of list)
3. Close drawer
4. Fire RPC in background
5. On success: `setRefreshKey(k => k + 1)` to reconcile from server
6. On failure: remove the optimistic task + show error message

Constraints:

- Optimistic task should NOT be clickable (its ID doesn't exist on the
  server). Easiest: render with `pointer-events-none` until real data
  arrives via refresh. Or skip the link wrapper entirely until refresh.
- The refresh (5) replaces the optimistic task with the real one.

## Out of scope (deferred)

- **Optimistic edit/delete/move** — needs stale-data deduplication.
- **Streaming SSR** — octane `defer`/streaming payload; bigger change,
  needs research on the current octane version's API.
- **Other lists** (clients, finance) — once the API is stable, refactor
  in a follow-up pass.

## Verification

- 586+ tests pass
- Browser: hard reload /tasks → skeleton → 4 cards (no empty-state flash)
- Browser: hard reload /tasks-config → skeleton → 3 state rows
- Browser: open drawer, submit new task → task appears in list before
  RPC resolves → ~50ms later, gets real ID and is clickable
