---
name: nuqs
description: "Trigger: nuqs, @octanejs/nuqs, useQueryState, useQueryStates, parseAsInteger, parseAsStringLiteral, parseAsBoolean, search params, URL state, query string state, deep-link. Type-safe URL search-params state for octane fullstack apps via @octanejs/nuqs (vendored port of nuqs 2.9.1). Use when persisting component state in the URL (active tab, drawer open state, filter, pagination, sort, search), sharing deep-links, or syncing state across browser back/forward."
license: Apache-2.0
metadata:
  author: "enri"
  version: "1.0"
  upstream:
    package: "@octanejs/nuqs"
    version: "0.1.45"
    ports: "nuqs@2.9.1"
    status: "beta, full vendored port (bindings-status.md last checked 2026-08-02)"
---

# nuqs

## Activation Contract

Activate when persisting component state in the URL (`?tab=types`, `?edit=true`,
`?q=hello`, `?page=2`), migrating a hand-rolled `URLSearchParams` reader to a
typed hook, adding a deep-link to a drawer / modal / filter / tab, or wiring
search-param state to back/forward navigation. nuqs replaces `useState` for any
state that should survive reload, be shareable by link, and respect browser
navigation.

**This project uses `@octanejs/nuqs` (the Octane binding), NOT `nuqs` upstream.**
The binding is a full vendored port of nuqs 2.9.1 onto Octane hooks. Import
surface is identical, but the package name is `@octanejs/nuqs`.

## Hard Rules

- **Import from `@octanejs/nuqs`, never `nuqs`**. Nuqs upstream is React-only.
  `@octanejs/nuqs` re-implements the React hooks on Octane's `useState` /
  `useEffect` / `useSyncExternalStore`. Importing `nuqs` directly will drag
  React's scheduler into a runtime that does not load React and crash.
- **Adapter is mandatory**: wrap the app shell in `<NuqsAdapter>` from
  `@octanejs/nuqs/adapters/react`. Without it, `useQueryState` has no store
  to read from and the hook returns the default value forever.
- **Always set a default via `.withDefault(...)`**. Without a default the
  value type is `T | null` and every consumer needs a null-check. With
  `.withDefault(value)` the type narrows to `T`.
- **Pin the parser to the key**: `useQueryState("tab", parseAsStringLiteral([...]).withDefault("user"))`
  gives you a typed enum (`"user" | "appearance" | ...`) with autocompletion.
  Use `parseAsInteger` for numbers, `parseAsBoolean` for booleans, etc.
- **One URL state, one key**: do not parallel-write the same key from
  `useQueryState` and `URLSearchParams` directly. Pick one. The Octane router
  uses `pushState`/`popstate`; nuqs listens to the same events. Mixing both
  causes lost updates on back/forward.
- **Server-safe imports**: from server modules (e.g. nitro route handlers),
  import from `@octanejs/nuqs/server`. That entry re-exports `createLoader`,
  `createSerializer`, parsers, and `createStandardSchemaV1` without React.
- **Peer dep version**: `@octanejs/nuqs@0.1.45` declares `octane ^0.6.0`. This
  project uses `octane@0.5.0`. The runtime ABI consumed (hooks lifecycle) is
  stable from 0.5. If `bun add` rejects, use `--ignore-peer`. Verify with
  `bun run typecheck` and `bun run dev` after install.

## Decision Gates

| Need | Action |
| ------ | -------- |
| Persist a single state (tab, drawer, search, page, sort) | `useQueryState(key, parser.withDefault(value))`. |
| Persist multiple related state at once | `useQueryStates({ a: parserA, b: parserB })`. One URL update for both. |
| Read URL params on the server (nitro, route handlers) | Import from `@octanejs/nuqs/server`. Use `createLoader(filters)` to type the search params. |
| Custom URL format (e.g. `from~to`, `key:value`) | `createParser({ parse, serialize })`. See Parsers section. |
| Test components that read URL state | `@octanejs/nuqs/adapters/testing` → `withNuqsTestingAdapter({ searchParams })`. |
| Build a custom router adapter (e.g. wouter) | `@octanejs/nuqs/adapters/custom` → `unstable_createAdapterProvider`. Out of scope for this skill; check Octane docs. |
| Component is server-only and never client-side | Do not use nuqs at all. nuqs is for client-side URL state; use route params instead. |
| Need to invalidate cache from another tab via `storage` event | Not in scope of this binding. Use a manual `popstate` listener. |

## Core API

### `useQueryState(key, parser.withDefault(default))`

Single key/value, two-way bound to the URL.

```tsx
import { useQueryState, parseAsStringLiteral } from '@octanejs/nuqs';

const TABS = ['user', 'appearance', 'types', 'categories'] as const;
type TabId = (typeof TABS)[number];

function ConfigTabs() @{
  const [tab, setTab] = useQueryState(
    'tab',
    parseAsStringLiteral(TABS).withDefault('user'),
  );

  <button onClick={() => setTab('types')}>Tipos</button>
}
```

`setTab(null)` clears the key from the URL. `setTab('types')` writes
`?tab=types`. The throttle queue coalesces rapid setter calls and returns a
`Promise<URLSearchParams>` that resolves once the URL committed.

### `useQueryStates({ key: parser.withDefault(...) })`

Multiple keys, single subscription, single URL update on multi-set.

```tsx
import { useQueryStates, parseAsString, parseAsInteger } from '@octanejs/nuqs';

function Filters() @{
  const [filters, setFilters] = useQueryStates({
    q: parseAsString.withDefault(''),
    page: parseAsInteger.withDefault(1),
  });

  <input value={filters.q} onInput={(e) => setFilters({ q: e.target.value })} />
}
```

`setFilters({ page: 2 })` updates only `page` in the URL. Calling
`setFilters({ q: 'a', page: 2 })` does one URL write for both.

### Parsers (built-in)

| Parser | Output | Notes |
| --- | --- | --- |
| `parseAsString` | `string` | Plain string. |
| `parseAsInteger` | `number` | Decimal integer; rejects non-numeric. |
| `parseAsFloat` | `number` | Decimal float. |
| `parseAsBoolean` | `boolean` | `'true'`/`'1'` → `true`, others → `false`. |
| `parseAsStringEnum([...])` | enum | Losely typed; prefer `parseAsStringLiteral` for literal types. |
| `parseAsStringLiteral([...] as const)` | literal union | Type-safe enum with autocompletion. |
| `parseAsJson<T>(schema)` | `T` | Validated by a `StandardSchemaV1` (zod, valibot, etc.). |
| `parseAsArrayOf(parser)` | `T[]` | Repeated key: `?tag=a&tag=b`. |
| `parseAsTimestamp` | `number` | Unix ms. |
| `parseAsIsoDateTime` | `string` | ISO 8601. |
| `parseAsHex` | `string` | Hex color. |
| `parseAsIndex` | `number` | 0-based index. |

All parsers expose `.withDefault(value)` and `.withOptions({ clearOnDefault: false })`.

### Custom parsers

```tsx
import { createParser } from '@octanejs/nuqs';

// '100~200' <=> { gte: 100, lte: 200 }
const parseAsRange = createParser({
  parse: (v) => {
    const [min = null, max = null] = v.split('~').map((s) => Number(s));
    if (Number.isNaN(min) || Number.isNaN(max)) return null;
    return { gte: min, lte: max };
  },
  serialize: ({ gte, lte }) => `${gte}~${lte}`,
});
```

Make the parser bijective (round-trips `parse(serialize(v)) === v`) or you
will see lossy behavior — the example in the nuqs docs warns that
`toFixed(4)` loses precision.

### Server entry (`@octanejs/nuqs/server`)

```ts
// in a nitro route handler
import { createLoader, parseAsString, parseAsInteger } from '@octanejs/nuqs/server';

const loadFilters = createLoader({
  q: parseAsString.withDefault(''),
  page: parseAsInteger.withDefault(1),
});

export default defineEventHandler((event) => {
  const filters = loadFilters(event); // { q: string, page: number }
  // ...
});
```

`createLoader` accepts an h3 event and returns the parsed object. It also
exposes `createSerializer` for building canonical URLs server-side.

## Adapter

```tsx
// src/routes/__app-shell.tsrx
import { NuqsAdapter } from '@octanejs/nuqs/adapters/react';

export function AppShell(props: { children: OctaneNode }) @{
  <NuqsAdapter>
    {props.children}
  </NuqsAdapter>
}
```

The standalone adapter intercepts `pushState`/`replaceState`/`popstate` to
keep nuqs in sync with the URL. For a custom router (e.g. the project's
hand-rolled `lib/nav/client-router.ts`), the default adapter is enough
because both write to the same `history` API.

`enableHistorySync` is opt-in if you want the adapter to also push updates
when you write to `location.search` outside of nuqs (rare).

## Testing adapter

```tsx
import { withNuqsTestingAdapter } from '@octanejs/nuqs/adapters/testing';

it('renders the types tab on /config?tab=types', () => {
  withNuqsTestingAdapter({ searchParams: '?tab=types' });
  // render <ConfigPage />, assert active tab is "types"
});
```

Accepts a query string, a `URLSearchParams`, or a record (values must be
strings). Resets the shared update queue once per mount.

## URL State Behavior (matches nuqs upstream)

- **Default not written**: a missing key resolves to the parser's default
  without polluting the URL. The key is written only once the value diverges.
- **`clearOnDefault`**: setting a value back to its default removes the key
  from the URL. Default `true`. Opt out per call, per parser, or globally
  on the adapter.
- **Cross-hook sync**: two components bound to the same key update together.
  External `popstate` (back/forward) reconciles into state automatically.
- **Throttled updates**: rapid setter calls coalesce through a shared queue.
  Returns `Promise<URLSearchParams>` resolving on URL commit.

## Divergences from nuqs upstream (per `bindings-status.md` 2026-08-02)

- **No router-specific adapters**: `nuqs/adapters/next`, `/adapters/remix`,
  `/adapters/react-router`, `/adapters/tanstack-router` are React-router
  bindings not ported. Use `/adapters/react` (standalone) or
  `/adapters/custom` (build your own).
- **`createSearchParamsCache` not ported**: it depends on React's
  `React.cache()`, which Octane does not implement. Use `createLoader`
  for request-scoped parsing instead.
- **`TransitionStartFunction` declared locally**: the package carries no
  `@types/react` dependency.
- **`NuqsTestingAdapter` resets the shared update queue once per mount**
  (upstream: every render).
- **No SSR surface in the client binding**: SSR is the responsibility of the
  `nuqs/server` entry (Node-only, no React). Client hydration is not in the
  supported evidence claim.

## Project Conventions

- **One URL state, one hook per page**: if a page needs 3+ URL params, prefer
  `useQueryStates` over three `useQueryState` calls.
- **Stable parser instances**: define parsers at module scope, not inside the
  component (each render creates a new `parseAsStringLiteral` instance
  otherwise and triggers unnecessary re-subscriptions).
- **Key naming**: use camelCase (`tab`, `edit`, `q`, `page`) — they show up
  verbatim in the URL.
- **URL tests**: every page that uses nuqs should have at least one test
  asserting the deep-link. Pattern: `withNuqsTestingAdapter({ searchParams: '?tab=types' })`.
- **Defaults that match the URL**: the parser's `withDefault` MUST match the
  initial server-rendered state. Otherwise the first client render diverges
  from the server snapshot and you get a hydration mismatch.
- **Coordinate with `lib/nav/client-router.ts`**: when changing the URL via
  nuqs, do not also call `navigate()` from the client router for the same
  navigation. The pushState notifications are deduped, but it's wasted work.

## Common Pitfalls

| Symptom | Cause | Fix |
| --- | --- | --- |
| Hook always returns the default | `<NuqsAdapter>` not mounted at the root | Wrap the app shell in `NuqsAdapter` once. |
| `undefined` returned from `useQueryState` | Parser has no `withDefault` | Add `.withDefault(value)`. |
| URL updates don't trigger re-render | Two `NuqsAdapter` instances mounted | Only one adapter in the tree. |
| Hydration mismatch on first paint | `withDefault` differs from server URL | Set the default to match what the server would render. |
| Back button doesn't restore state | Writing to `location.search` directly | Use `setX()` from nuqs, not direct `pushState`. |
| Type is `string \| null` instead of `string` | Missing `.withDefault(...)` | Always chain `.withDefault`. |
| `bun install` fails on peer dep | `octane@0.5.0` vs `^0.6.0` peer dep | Use `--ignore-peer` and verify typecheck. |
| Component crashes on import | Imported from `nuqs` (React upstream) | Change to `@octanejs/nuqs`. |

## Execution Checklist

1. Identify the URL state (key + parser + default).
2. `bun add @octanejs/nuqs@0.1.45` (apps/web). Use `--ignore-peer` if needed.
3. Wrap `__app-shell.tsrx` in `<NuqsAdapter>`.
4. Replace `useState` for the URL-bound state with `useQueryState` /
   `useQueryStates`.
5. Use stable parsers at module scope (not inline in JSX).
6. Add `withNuqsTestingAdapter` test for the deep-link case.
7. Run `bun run typecheck` + `bun run test` + agent-browser E2E for the
   reload + back/forward cases.
8. Commit following `work-unit-commits`: one commit per logical unit
   (install / adapter / migration / test).

## References

- `@octanejs/nuqs` README: <https://github.com/octanejs/octane/blob/main/packages/nuqs/README.md>
- Status matrix: <https://github.com/octanejs/octane/blob/main/docs/bindings-status.md#octanejsnuqs>
- Upstream nuqs docs: <https://nuqs.dev/docs/basic-usage> (read for API
  semantics; substitute `@octanejs/nuqs` for `nuqs` in imports)
- Project feature doc: `odd/config-tabs-nuqs/tasks.md`
- Sibling skills: `zag`, `xstate`, `tanstack`, `nitro`, `h3`
