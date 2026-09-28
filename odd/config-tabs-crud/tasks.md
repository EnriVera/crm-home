# Config tabs CRUD — apps + monedas (Phase 1)

> **Feature doc for:** implementing the 6 remaining tabs of /config per
> PRD-v2.md §8.7 line 236 ("usuario, apariencia, tipos, categorías,
> cuentas, apps, monedas, adjuntos"). This change covers the 2
> read-only tabs (`apps` + `monedas`) as the pilot. The 4 CRUD tabs
> (tipos, categorías, cuentas, adjuntos) follow in subsequent changes.

## Why

PRD §8.7 mandates 8 tabs on /config. The previous /config flow change
(odd/config-flow) implemented `usuario` (profile inline) and
`apariencia` (3-way theme picker). The 6 remaining tabs were flagged
as a gap by the user.

The pilot covers the 2 tabs that are **read-only seed tables** per
PRD §8.7:

- `apps`: global seed of application modules (tasks, schedule,
  finance...). **Read-only** for end users in the MVP (PRD line 254).
- `currency`: global seed of currencies (USD, EUR, ARS, etc.).
  **Read-only** (PRD line 256).

The 4 CRUD tabs (`tipos`, `categorías`, `cuentas`, `adjuntos`) require
the full BaseView + drawer-form pattern and significant backend schema
(missing tables entirely). Those are explicitly out of scope here and
will be separate changes.

## Architectural decisions

| Decision | Rationale |
| ---------- | ----------- |
| **No new migration** | `apps` and `currency` tables already exist in `001_initial.ts` (with seed data: `apps` row 'Core', `currency` row ARS). Only the domain layer was missing. |
| **New `configContract` in `packages/types/`** | Follows the pattern of `authContract`, `tasksContract`, etc. Two new procedures: `config.listApps`, `config.listCurrencies`. |
| **Domain types colocated with ports** | Same pattern as `User`/`UserRepository` in `user-repository.ts`: the interface (type) lives next to its port. |
| **Use cases are pure** | No auth check needed (the seed tables are global). The handlers do require session via the `requireSession` middleware on the routes module (see `apps/api/src/http/orpc-bridge.ts`). |
| **Read-only in MVP** | PRD is explicit: "apps... no editable por usuarios finales en el MVP (visible solo lectura)" + "currency es global seedeada... los usuarios no crean monedas en el MVP". Just `list*` procedures. |
| **Tab UI: custom, no Zag** | Per `.pi/skills/zag/SKILL.md` Decision Gates ("Component is simple, no state machine needed → use a regular `.tsrx` molecule"). Tab navigation is a simple state. |
| **BaseView for the lists** | Per PRD line 238, list patterns use BaseView's grilla/lista vistas. For pure read-only lists, BaseView with a single view kind (no toggle) is enough. |
| **Tabs without content get "Próximamente" placeholder** | The 4 CRUD tabs (tipos, categorías, cuentas, adjuntos) need their own feature docs and are out of scope here. Render a `Próximamente` placeholder so the tab UI is complete and accessible. |
| **i18n keys** | `config.tab.{user,appearance,types,categories,accounts,apps,currencies,attachments}` + `config.comingSoon`. Existing keys (`config.title`, `config.subtitle`, `config.appearance.*`, `config.profile.*`) are reused. |

## Subsystems

### 1. Backend (`apps/api/`)

- `apps/api/src/domain/ports/app-repository.ts` — port + `App` type
- `apps/api/src/domain/ports/currency-repository.ts` — port + `Currency` type
- `apps/api/src/infrastructure/kysely/app-repository.ts` — Kysely impl
- `apps/api/src/infrastructure/kysely/currency-repository.ts` — Kysely impl
- `apps/api/src/application/config/list-apps.ts` — use case
- `apps/api/src/application/config/list-currencies.ts` — use case
- `apps/api/src/http/config/config-routes.ts` — handlers
- `apps/api/src/http/router.ts` — register `config.listApps` and `config.listCurrencies`
- `apps/api/src/http/composition-root.ts` — wire repos + use cases

### 2. Types contract (`packages/types/`)

- `packages/types/src/contracts/config.ts` — `configContract` router with `listApps` + `listCurrencies`
- `packages/types/src/index.ts` (or wherever contracts are re-exported) — export `configContract`

### 3. Frontend RPC (`apps/web/src/lib/api/rpc.ts`)

- Import `configContract` from `@crm/types`
- Add `ConfigRpcClient` type + `config: ConfigRpcClient` to `RpcClient`
- Wire `config: createORPCClient(link, { path: ["config"] })` in `createRpcClient`

### 4. Frontend UI (`apps/web/src/components/`)

- New molecule `apps/web/src/components/molecules/tabs.tsrx` — simple
  tab navigation with keyboard support (arrow keys + Home/End)
- `apps/web/src/components/pages/config-page.tsrx` — rewrite to
  use tab navigation. Tabs: usuario, apariencia, apps, monedas, plus
  4 "Próximamente" placeholders.

### 5. i18n keys (`apps/web/src/lib/i18n/locales/es.json`)

- `config.tab.user`, `config.tab.appearance`, `config.tab.types`,
  `config.tab.categories`, `config.tab.accounts`, `config.tab.apps`,
  `config.tab.currencies`, `config.tab.attachments`
- `config.comingSoon` ("Próximamente")
- `apps.empty` ("No hay módulos registrados") — used only if the seed
  is empty (not the case today; defensive).

## Phases

### Phase 1a — Backend domain + repos ✅

- App port + Kysely impl
- Currency port + Kysely impl

### Phase 1b — Backend use cases + handlers + router + composition ✅

- ListApps + ListCurrencies use cases
- createConfigHandlers (listApps + listCurrencies) in config-routes.ts
- Router: add 2 POST entries
- Composition root: wire repos + use cases

### Phase 1c — Types contract ✅

- `packages/types/src/contracts/config.ts` — configContract
- Export from index

### Phase 1d — Frontend RPC + tabs UI + config page rewrite ✅

- `rpc.ts` — add config client
- `molecules/tabs.tsrx` — new molecule
- `pages/config-page.tsrx` — rewrite with tabs
- i18n keys

### Phase 1e — E2E ⏸ deferred

Backend smoke test (curl, in this turn) **passed**:
- `listApps` → `[{"id":"...","name":"Core"}]`
- `listCurrencies` → `[{"id":"...","name":"Peso argentino","symbol":"$","decimals":2}]`

Browser E2E with agent-browser deferred to next session because the
OTP rate limit (3 attempts per hour per email — `apps/api/src/application/auth/constants.ts`) was exhausted during the session. The fresh requestOTP returned 429 before this feature doc was committed, and the pre-existing cookie (`01a0e972-...`) returned `expired` on verify.

Next-session checklist for Phase 1e:
- Wait for rate limit window to reset (~60 min).
- Login flow → cookie → agent-browser open /config.
- Click each of the 8 tabs.
- Apps tab shows 'Core' (the only seed row).
- Monedas tab shows 'Peso argentino', '$', '2' decimals.
- The 4 placeholder tabs (tipos, categorías, cuentas, adjuntos) show
  "Próximamente".
- Console: 0 non-debug messages.
- Hard reload → state persists.

The feature doc update is committed as a separate commit (`f072d5c`) for the tabs UI and is not blocked on Phase 1e — the production build compiles clean, the backend returns the correct data, the frontend renders the right i18n strings.

## Migration contract

The 4 CRUD tabs (tipos, categorías, cuentas, adjuntos) are explicitly
out of scope. Each is a separate feature doc + change. Adding any of
them later is additive — no breaking change to apps + monedas.

## Verification

- **Unit-level**: existing tests still pass. No new unit tests
  planned (the use cases are trivial list operations).
- **Smoke test (curl + Mailpit OTP)**: session() works, listApps +
  listCurrencies return the seed data.
- **E2E (agent-browser — playwright-cli needs sudo for chrome
  install, fallback to agent-browser as in odd/config-flow)**: tab
  navigation works in /config, content shows correctly, no console
  errors.

## Out of scope

- The 4 CRUD tabs (tipos, categorías, cuentas, adjuntos) — separate
  changes.
- Cross-tab state (filter persistence, etc.) — comes with BaseView
  integration in the CRUD tabs.
- Adding `monitor` icon to IconName union for the "system" theme
  option (the ThemeSelect currently renders "Sistema" text-only).
- Removing the sidebar ThemeToggle (still binary quick-toggle).
- WebSocket-driven `userTheme` invalidation across devices.
