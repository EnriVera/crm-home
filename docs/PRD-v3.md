# CRM-HOME — PRD v3 (web-v2)

> **Status:** supersedes PRD-v2. Introduces a parallel Vue 3 + TypeScript frontend (`apps/web-v2`) that ships the same Phase 1 product as PRD-v2, and a stricter frontend architecture (DDD + atomic design with domain focus, vendor encapsulation). `apps/web` (octane) stays in the monorepo and is frozen; it is removed only when `web-v2` reaches feature parity and a defined cutover gate.
>
> **Backend is unchanged.** `apps/api` (nitro + h3 + orpc + kysely + PostgreSQL) is the single source of truth. `web-v2` consumes the existing orpc contract.
>
> **Repository:** monorepo branch is `develop` (per PRD-v2 §6.10). No new git branch for this PRD — all `web-v2` work lives on `develop` alongside `apps/web`.

---

## 0. Delta from PRD-v2 (summary)

| Area | PRD-v2 | PRD-v3 (this document) |
| --- | --- | --- |
| Frontend stack | Octane 0.5 (TSRX) | Vue 3 + TypeScript (composition API + `<script setup>`) |
| Build / package manager | Vite + bun (kept) | Vite + bun (kept, explicit) |
| Frontend architecture | Atomic design, vendor wrappers (kept) | Atomic design + **DDD layering** (domain / application / infrastructure / ui), vendor encapsulation kept and extended |
| Component library | shadcn (octane binding) + ad-hoc | shadcn-vue (presets below) + **Zag.js v1.44** as the headless primitives layer (ReUI is React-only, so we replaced it with Zag + Vue 3 native libs) |
| shadcn preset | unspecified | `luma` style, `zinc` base, `green` theme + chart color, `roboto` heading + font, `phosphor` icons, `large` radius, `solid` menu, `bold` accent |
| Design language | minimalist, primary = green (kept) | minimalist + **original** (no off-the-shelf look), primary = green, accent = green; oil-ui SKILL is the direction-setting source |
| Data fetching | `use-octane-query` over `@tanstack/query-core` | TanStack Query (vue) + orpc client (typed end-to-end against the API contract) |
| Routing | Octane router (MPA, `URLSearchParams`) | TanStack Router (file-based optional, full type safety) |
| State (shared) | effect + xstate | Pinia (app state) + XState v5 (workflows: timer, auth, wizards) |
| State machines | xstate | xstate v5 + **Stately** registry (MCP server) for design-time validate/simulate/visualize |
| Icons | `@octanejs/phosphor-icons` | `@phosphor-icons/vue` (same family, official Vue binding) |
| Drag & drop | `@octanejs/dnd-kit` | `vue-draggable-plus` (Vue 3 native, dnd-kit-compatible semantics) or `@dnd-kit/vue` if parity needed |
| Charts | `@octanejs/recharts` (deferred) | `unovis` (Vue 3, headless, tree-shakable) or `vue-chartjs` |
| Rich text | `@octanejs/lexical` (deferred) | `tiptap` (Vue 3 native, lexical-equivalent extensibility) |
| Resizable panels | `@octanejs/resizable-panels` | `vue-resizable-panels` (API-compatible) |
| Toasts | `@octanejs/sonner` | `vue-sonner` (same author) |
| i18n | `i18next` (custom integration) | `vue-i18n` (encapsulated in `shared/vendor/i18n/`) |
| OTP input | `@octanejs/zag` pin-input | `@zag-js/pin-input` + `vue-zag` binding |
| Forms | zod + custom | `vee-validate` + zod (encapsulated in `shared/vendor/forms/`) |
| Date picker | `day-picker` (deferred) | `vue-day-picker` |
| Tests | `bun test` | `vitest` + `@vue/test-utils` + `@testing-library/vue` |
| MCP servers in agent stack | shadcn, ReUI (added) | shadcn, ReUI, **Stately** (added by this PRD) |
| Skills in agent stack | shadcn, ReUI, … | shadcn, ReUI, **orpc** + **zag** (added by this PRD), plus `oil-ui` invoked at design time |
| Apps/web status | active | **frozen** (bugfix-only); removed when cutover gate passes |

Everything in PRD-v2 §6 (product decisions), §7 (navigation tree), §8 (modules and acceptance criteria), §11 (DB schema), §12 (seeds) is **unchanged** in this PRD. This document focuses on the frontend rewrite and the coexistence plan; it does not re-litigate product scope or backend design.

---

## 1. Scope of this PRD (what `web-v2` ships in v1)

`web-v2` ships the **PRD-v2 Phase 1 (MVP) feature set in full**:

- Passwordless login (OTP by email) + persistent session + logout.
- Config: user, appearance, types, categories, accounts, apps, currencies, attachments.
- Clients (basic CRUD).
- Tasks (grid / kanban / list views, drag & drop, `/tasks-config` with states).
- Schedule (free or task-bound timer, history, daily detail, pie chart, hourly/daily report).
- Minimal dashboard (active timer card + tasks grouped by state).
- Light / dark / system theme, persisted to the user account, applied instantly.
- Public legal pages (`/terms`, `/privacy`, `/cookies`) with versioned acceptance.
- OpenTelemetry backend telemetry (telemetry emission is server-side; the client only propagates W3C TraceContext).

**Out of scope for v1** (still deferred per PRD-v2): Phase 2 (Finance dashboards), Phase 3 (advanced reports, multi-device, push). These are added later, never in this document.

**Coexistence rule:** `apps/web` ships the same Phase 1 product and is the supported path while `web-v2` is being built. `web-v2` is enabled by env (`WEB_V2_ENABLED=1`) and routed via a separate port (`WEB_V2_PORT=5174` by default) so QA can switch without redeploying.

---

## 2. Why a rewrite (and why Vue 3)

- **Hire-ability:** Vue 3 has a deeper candidate pool than Octane (single-vendor React-compiler niche). Cuts time-to-hire on a small team.
- **Tooling maturity:** shadcn-vue + Zag + TanStack Router + Pinia + Vite give us first-party Vue bindings for everything we already wrapped in `apps/web` via Octane. Less glue code, fewer bindings to maintain. ReUI was the originally-planned second layer; it is React-only so the plan was changed to Zag + Vue 3 native alternatives.
- **Architecture upgrade:** PRD-v2 already enforces atomic design + vendor isolation. `web-v2` adds a domain layer on top of that, so the codebase models product concepts (`Task`, `Schedule`, `Client`, `Session`) as first-class objects instead of as JSX-side shapes.
- **Backend stays the same:** zero product risk. The orpc contract is the API surface for both frontends.

**Why not keep Octane:** the bindings (`@octanejs/*`) are maintained by the same team as the framework, which raises the bus factor and makes every UI swap a multi-package migration. Going mainstream de-risks the stack.

---

## 3. Stack (locked)

### 3.1 Frontend (web-v2)

| Concern | Choice | Notes |
| --- | --- | --- |
| Framework | **Vue 3.5+** | Composition API + `<script setup>` only. Options API is banned in review. |
| Language | **TypeScript 5.9** (strict) | `strict: true`, `noUncheckedIndexedAccess: true`, `exactOptionalPropertyTypes: true`. |
| Build | **Vite 8** | Same major as `apps/web` to share a build cache key. |
| Package manager | **bun 1.4** | `bun install`, `bunx --bun`. Lockfile committed. |
| Styling | **Tailwind CSS v4** (`@tailwindcss/vite`) | Same as `apps/web`; tokens migrated. |
| Headless primitives | **shadcn-vue** (styling tokens) + **Zag.js v1.44** (behavior) | `components.json` defines the style preset. Zag machines are the actual primitives. The two are wrapped together in `src/shared/vendor/zag/`. |
| Composite components | **Zag.js v1.44** + Vue 3 native alternatives | Zag provides headless primitives (dialog, popover, tabs, select, menu, switch, tooltip, accordion, date-picker, pin-input, checkbox). Vue 3 native libs fill the composite gaps ReUI used to give: `@tanstack/vue-table` for data-grid, `@vuepic/vue-datepicker` was replaced by `@zag-js/date-picker`, `vue-draggable-plus` for kanban, `unovis/vue` for charts. |
| Design direction | **oil-ui** SKILL (invoked at design time) | Drives the "original, minimal, green-accent" look. SKILL is a *direction*, not a component library. |
| Icons | **Phosphor Icons** (`@phosphor-icons/vue`) | Encapsulated in `shared/vendor/icons/`. |
| State (app) | **Pinia** | One store per bounded context. No mutation outside the store. |
| State (workflows) | **XState v5** | Timer, auth, multi-step forms. Designed in **Stately**, validated via the Stately MCP before commit. |
| Data fetching | **TanStack Query (vue)** | Wraps orpc procedures. Cache key derives from procedure path + input. |
| API client | **@orpc/client** + **@tanstack/vue-query** | orpc contract imported as a type from `@crm/contract`. |
| Routing | **TanStack Router (vue)** | File-based routes under `src/router/routes/`. Type-safe `Link`, `useNavigate`, search-param validation via zod. |
| Forms | **vee-validate** + **zod** | Same zod schemas as the API contract. Single source of truth. |
| Drag & drop | **vue-draggable-plus** | Used for the kanban. Same semantics as `@dnd-kit/core` for parity with `apps/web`. |
| Charts | **unovis** (vue) | Pie chart for Schedule. SSR-untested behavior is documented per-call. |
| Rich text | **tiptap** | Tasks description. Lexical-equivalent extensibility. |
| Resizable panels | **vue-resizable-panels** | Sidebar (left) and edit drawer (right). |
| Toasts | **vue-sonner** | One toast surface at the app root. |
| OTP input | **@zag-js/pin-input** + `vue-zag` | OTP verification screen. |
| Date picker | **@zag-js/date-picker** (replaces vue-day-picker from PRD-v2) | Schedule date filters, task due dates, anywhere we need a calendar. Wrapped in `src/shared/vendor/zag/date-picker/`. |
| i18n | **vue-i18n** | Encapsulated in `shared/vendor/i18n/`. |
| Validation runtime | **zod** | Shared with API contract. |
| Tests | **vitest** + **@vue/test-utils** + **@testing-library/vue** | Component + composable tests. |
| E2E | **playwright** (already in repo) | Smoke on every PR. |
| Linting | **eslint** (vue + ts) + **prettier** | Replaces `tsrx-tsc` lint. |

### 3.2 shadcn-vue preset (locked)

Initialized with `bunx --bun shadcn-vue@latest init` and these answers (do not change without a PRD amendment):

| Field | Value |
| --- | --- |
| Style | **luma** |
| Base color | **zinc** |
| Theme color | **green** |
| Chart color | **green** |
| Heading font | **roboto** |
| Body font | **roboto** |
| Icon library | **phosphor** |
| Radius | **large** |
| Menu | **solid** |
| Menu accent | **bold** |

The corresponding `components.json` lives at `apps/web-v2/components.json` and is the **only** place shadcn-vue CLI is allowed to write into. See §7 for the file shape.

### 3.3 Backend

**Unchanged.** `apps/api` keeps its stack: nitro, h3, orpc, kysely, PostgreSQL, bun, vite (build only), effect, xstate (server side), shiki, OpenTelemetry. The orpc contract under `apps/api/src/http/router.ts` is imported as types into `web-v2` via a shared workspace package (`@crm/contract`, to be created in §6).

### 3.4 Tooling (repo-wide, already present)

Turborepo 2.10, husky + commitlint (Conventional Commits on `commit-msg`), bun as package manager. No changes.

---

## 4. Product decisions (inherited from PRD-v2 + web-v2 deltas)

Items 1–10 from PRD-v2 §6 are **inherited unchanged**. The following deltas apply for `web-v2`:

1. **Domain objects in the frontend.** Every bounded context in §5 has a domain layer: entities (immutable, validated by zod), value objects (e.g. `Money`, `Duration`, `EmailAddress`), and ports (e.g. `TaskRepository`). The UI layer never reaches into the orpc client directly — it goes through a use case (application layer) that depends on a port. The orpc adapter implements the port. **This is the same ports & adapters idea as the backend, mirrored in the frontend.**

2. **Vendor encapsulation is a hard rule, enforced by lint.** `eslint-plugin-import` with a custom `no-restricted-paths` rule blocks any import of a third-party UI package from outside `src/shared/vendor/**`. The rule allowlist is the only way a UI library enters the app. (Mirror of PRD-v2 §9 rule; now machine-enforced.)

3. **shadcn-vue provides the styling tokens; Zag provides the headless primitives.** shadcn-vue still owns the visual style preset (luma / zinc / green / roboto / phosphor / large / solid / bold) and writes CSS variables into `app.css`. The actual behavioral primitives — dialog, popover, tabs, select, menu, switch, tooltip, accordion, date-picker, pin-input, checkbox — are **Zag.js v1.44 machines** wrapped in `src/shared/vendor/zag/`. Originally the PRD named ReUI as the second component layer for composites; ReUI is **React-only** (its npm package description is "A set of customizable React components" and there is no Vue port maintained by the ReUI team). The Vue 3 composites that ReUI used to provide (data-grid, event-calendar, gantt, cascader, filters, stepper, timeline) are now sourced from `@tanstack/vue-table`, `@zag-js/date-picker`, `vue-draggable-plus`, and `unovis/vue` — wrapped in `src/shared/vendor/` like every other primitive. This is a **stack correction**, not a scope change.

4. **Design tokens live in one file.** `src/shared/ui/tokens.css` defines every color, spacing, radius, font, and shadow as a CSS custom property. shadcn-vue CSS variables, Zag-wrapped component styles, and hand-written utility classes all reference the same tokens. Tailwind v4 reads the same tokens via `@theme` in `src/app.css`. No raw hex in any component, ever.

5. **Routing is fully typed.** TanStack Router generates route trees from `src/router/routes/`. The `Link` component, `useNavigate`, and search-param readers are all typed against the route tree. Adding a route is a single file; type errors surface at the call site, not at runtime.

6. **State machines are designed in Stately before code.** Any new workflow (timer, auth, wizards) starts as a machine in Stately. The Stately MCP `validate_machine` + `simulate_machine` + `visualize_machine` must be run before the XState source lands in `src/machine/`. The behavior review markdown is attached to the PR.

7. **No N+1 in components.** Composables that call the API use TanStack Query. A component never calls an orpc procedure directly; it calls a composable that wraps a use case. This keeps test seams at the use-case boundary.

8. **Theme persistence is server-side.** Same as PRD-v2 §6.8: the `user_theme` column on `user` is the source of truth. The Pinia `themeStore` is a hydrated mirror, not the source.

9. **Telemetry on the frontend is opt-in, Fase 3.** PRD-v2 §10 already defers this. `web-v2` only sends W3C `traceparent` headers on API calls; no client-side spans are emitted.

---

## 5. Frontend architecture: DDD + atomic design with domain focus

`apps/web-v2/src/` is split into four top-level layers. Each has a strict dependency direction: `ui → application → domain`, and `infrastructure → application → domain`. The `shared` tree is a cross-cutting toolkit that other layers import (never the other way around).

```text
src/
├── domain/                          # 1. PURE business model (zero deps on Vue, orpc, anything)
│   ├── task/                        # bounded context: task
│   │   ├── entities/                # Task, TaskState (immutable, zod-validated factories)
│   │   ├── value-objects/           # TaskTitle, TaskDescription, KanbanOrder
│   │   ├── ports/                   # TaskRepository (interface), TaskEventBus (interface)
│   │   ├── events/                  # TaskCreated, TaskMoved, TaskDeleted (discriminated unions)
│   │   └── policies/                # invariants: e.g. "category requires type"
│   ├── schedule/                    # bounded context: schedule
│   │   ├── entities/                # Schedule, ScheduleItem
│   │   ├── value-objects/           # Duration, ScheduleMode (free | bound)
│   │   ├── ports/                   # ScheduleRepository, TimerEventBus
│   │   ├── events/                  # TimerStarted, TimerHeartbeat, TimerStopped, TimerAutoClosed
│   │   └── policies/                # "at most one open timer per user" (mirrors DB uq_open_timer)
│   ├── client/                      # bounded context: client
│   │   ├── entities/                # Client
│   │   ├── value-objects/           # PhoneNumber, EmailAddress
│   │   └── ports/                   # ClientRepository
│   ├── auth/                        # bounded context: auth (mirrors backend Session aggregate)
│   │   ├── entities/                # Session, OtpCode
│   │   ├── value-objects/           # OtpDigits (preserves leading zeros, length 6)
│   │   └── ports/                   # AuthRepository
│   ├── config/                      # bounded context: user config
│   │   ├── entities/                # UserConfig, Type, Category, Account, App, Currency
│   │   ├── value-objects/           # Theme, ColorToken, Money, CurrencyCode
│   │   └── ports/                   # ConfigRepository
│   ├── finance/                     # bounded context: finance (Phase 2 — scaffolding only in v1)
│   │   └── (ports + value objects)
│   └── shared/                      # cross-BC value objects and utilities
│       ├── identifiers/             # UserId, TaskId, etc. (branded types)
│       ├── errors/                  # DomainError, ValidationError, NotFoundError, ConflictError
│       ├── pagination/              # Page<T>, PageQuery
│       └── result/                  # Result<T, E> (no thrown errors across layer boundaries)
│
├── application/                     # 2. Use cases (orchestrate domain + ports; no Vue, no orpc)
│   ├── task/
│   │   ├── create-task.ts           # input: CreateTaskInput; output: Result<Task, DomainError>
│   │   ├── list-tasks.ts            # cache strategy: query key = ('tasks', filters)
│   │   ├── update-task.ts
│   │   ├── update-task-state.ts     # kanban move; emits TaskMoved
│   │   ├── reorder-task-in-column.ts
│   │   ├── delete-task.ts
│   │   └── index.ts                 # public surface: list of use cases
│   ├── schedule/
│   │   ├── start-timer.ts
│   │   ├── stop-timer.ts
│   │   ├── resume-timer.ts          # creates a new ScheduleItem with origin='resumed'
│   │   ├── heartbeat.ts
│   │   ├── auto-close-stale.ts      # closes items with heartbeat > 12h
│   │   ├── list-schedule-history.ts
│   │   └── index.ts
│   ├── client/                      # CRUD use cases
│   ├── auth/                        # request-otp, verify-otp, sign-out, get-session
│   ├── config/                      # CRUD use cases for every config entity
│   └── index.ts                     # barrel of every use case
│
├── infrastructure/                  # 3. Adapters (the only layer that knows about orpc, ws, storage)
│   ├── api/                         # orpc client wiring (HTTP transport, credentials: 'include')
│   │   ├── client.ts                # createOrpcClient() — called once at bootstrap
│   │   ├── procedures/              # one file per bounded context that maps orpc paths to ports
│   │   │   ├── task-repository.ts   # implements domain/task/ports/TaskRepository
│   │   │   ├── schedule-repository.ts
│   │   │   ├── client-repository.ts
│   │   │   ├── auth-repository.ts
│   │   │   └── config-repository.ts
│   │   ├── schemas/                 # zod schemas shared with @crm/contract
│   │   └── errors.ts                # orpc error → DomainError mapping
│   ├── realtime/                    # WebSocket client (PRD-v2 §6.5: invalidation + heartbeat only)
│   │   ├── socket.ts
│   │   ├── invalidation-bus.ts      # forwards {entity, id, action} to TanStack Query cache
│   │   └── heartbeat.ts
│   ├── persistence/                 # localStorage / IndexedDB
│   │   ├── persisted-filters.ts     # per-view filters keyed by useId() or explicit id
│   │   └── session-mirror.ts        # cached session info for instant render
│   └── platform/                    # window, document, URL — injectable for tests
│       └── env.ts
│
├── ui/                              # 4. Atomic design with domain focus
│   ├── atoms/                       # shadcn-vue primitives (Button, Input, Badge, Icon, …)
│   │                               # no domain knowledge; receive only typed props
│   ├── molecules/                   # composed from atoms; still no domain knowledge
│   │   ├── search-input/
│   │   ├── page-header/
│   │   ├── task-state-badge/        # presentation of a domain.TaskState; maps via adapter
│   │   ├── task-type-icon/          # presentation of a domain.Type
│   │   ├── money-amount/            # presentation of a domain.Money value object
│   │   └── timer-display/           # presentation of a domain.Duration
│   ├── organisms/                   # domain-aware components
│   │   ├── base-view/               # grid/kanban/list view container, filter persistence
│   │   ├── data-grid/               # wraps @tanstack/vue-table; accepts domain.Task[] etc.
│   │   ├── kanban-board/            # wraps vue-draggable-plus on @tanstack/vue-table; emits TaskMoved events
│   │   ├── timer-card/              # active timer display + controls
│   │   ├── schedule-history-list/
│   │   ├── client-list-item/
│   │   ├── config-tabs/             # tab router for /config
│   │   └── edit-drawer/             # resizable right-side drawer; form is in organisms too
│   ├── templates/                   # page layouts (no business logic)
│   │   ├── app-shell/               # sidebar + topbar + main area (resizable)
│   │   ├── auth-layout/             # public, system-theme (PRD-v2 §6.8)
│   │   └── legal-layout/
│   └── pages/                       # one per route, very thin: glue between router + organisms
│       ├── login/
│       ├── login-verification/
│       ├── dashboard/
│       ├── tasks/
│       ├── tasks-config/
│       ├── schedules/
│       ├── clients/
│       ├── client-detail/
│       ├── config/
│       ├── terms/
│       ├── privacy/
│       └── cookies/
│
├── shared/                          # cross-cutting toolkit (imported by all layers)
│   ├── vendor/                      # 5. THE ONLY place UI libs are imported
│   │   ├── shadcn-vue/              # exports Button, Input, Dialog, Sheet, Tabs, … (re-exports)
│   │   ├── reui/                    # PLACEHOLDER (ReUI is React-only; keep folder for parity)
│   │   ├── icons/                   # Phosphor wrapper; only file allowed to @phosphor-icons/vue
│   │   ├── orpc/                    # createOrpcQuery, createOrpcMutation; only file allowed to @orpc/client
│   │   ├── tanstack/                # createQuery, createMutation, createQueryClient; only file allowed to @tanstack/vue-query
│   │   ├── router/                  # re-exports Link, useNavigate, useParams from @tanstack/vue-router
│   │   ├── stately/                 # xstate v5 + actor helpers; machine files live in src/machine/
│   │   ├── i18n/                    # vue-i18n wrapper; createI18n(), useT()
│   │   ├── forms/                   # vee-validate + zod; toTypedSchema helper
│   │   ├── dnd/                     # vue-draggable-plus wrapper; emits domain events
│   │   ├── charts/                  # unovis wrapper; per-chart typed props
│   │   ├── richtext/                # tiptap wrapper; schema for task description
│   │   ├── resizable/               # vue-resizable-panels wrapper
│   │   ├── toast/                   # vue-sonner wrapper; toast() with typed payloads
│   │   ├── otp/                     # PLACEHOLDER; real wrapper is in shared/vendor/zag/pin-input/
│   │   ├── datepicker/              # PLACEHOLDER; real wrapper is in shared/vendor/zag/date-picker/
│   │   └── validation/              # zod helpers, branded type constructors
│   ├── ui/                          # design tokens and pure presentational helpers
│   │   ├── tokens.css               # CSS custom properties (the only file with raw color values)
│   │   ├── theme.ts                 # theme constants read by Tailwind @theme
│   │   └── cn.ts                    # class merge utility (no logic)
│   └── composables/                 # use-case wrappers (Vue lifecycle meets application layer)
│       ├── use-create-task.ts       # wraps application/task/create-task
│       ├── use-list-tasks.ts        # wraps application/task/list-tasks via TanStack Query
│       ├── use-timer.ts             # subscribes to the timer machine + heartbeat
│       └── …
│
├── machine/                         # XState v5 machines (designed in Stately first)
│   ├── timer.machine.ts             # PRD-v2 §8.4: states idle / running / paused / stale-detected
│   ├── auth.machine.ts              # idle / requesting-otp / verifying-otp / authenticated / error
│   ├── otp-input.machine.ts         # empty / partial / full / submitting
│   └── …
│
├── router/                          # TanStack Router setup
│   ├── router.ts                    # createRouter(); routeTree injection
│   ├── routes/                      # file-based route definitions
│   │   ├── __root.tsx               # app shell wrapper
│   │   ├── index.tsx                # / → redirect by session
│   │   ├── login.tsx
│   │   ├── login-verification.tsx
│   │   ├── (authed)/                # route group requiring session
│   │   │   ├── dashboard.tsx
│   │   │   ├── tasks/
│   │   │   │   ├── index.tsx
│   │   │   │   └── $id.tsx
│   │   │   ├── tasks-config.tsx
│   │   │   ├── schedules.tsx
│   │   │   ├── clients/
│   │   │   │   ├── index.tsx
│   │   │   │   └── $id.tsx
│   │   │   └── config.tsx
│   │   ├── terms.tsx                # public
│   │   ├── privacy.tsx              # public
│   │   └── cookies.tsx              # public
│   └── guards/
│       ├── require-session.ts
│       └── redirect-if-authenticated.ts
│
├── stores/                          # Pinia stores (mirror of server state for instant render)
│   ├── auth.ts                      # current user, session expiry, role
│   ├── theme.ts                     # light/dark/system, hydrated from user.user_theme
│   └── ui.ts                        # sidebar collapsed, last-used filters
│
├── app/                             # bootstrap, providers, plugins
│   ├── App.vue                      # <RouterProvider>, <ThemeProvider>, <I18nProvider>, <ToastProvider>
│   ├── main.ts                      # createApp, install Pinia, Router, VueQueryPlugin
│   ├── providers/
│   │   ├── theme-provider.vue
│   │   ├── i18n-provider.vue
│   │   └── toast-provider.vue
│   └── styles.css                   # Tailwind v4 entry, imports tokens.css
│
├── env.d.ts
└── README.md
```

### 5.1 Dependency direction (machine-enforced)

| From | Can import | Cannot import |
| --- | --- | --- |
| `domain/` | only other `domain/` files (zod, never Vue) | anything else |
| `application/` | `domain/`, other `application/` | `ui/`, `infrastructure/`, `shared/vendor/`, Vue, orpc, TanStack |
| `infrastructure/` | `domain/`, `application/`, `shared/validation/`, `shared/vendor/orpc/`, `shared/vendor/tanstack/`, orpc, ws, storage | `ui/` |
| `ui/` | `domain/`, `application/`, `infrastructure/`, `shared/**`, Vue, vendor | — (it is the top) |
| `shared/vendor/<tool>/` | only `<tool>` + `shared/validation/` | `ui/`, `domain/`, `application/`, other vendors |
| `machine/` | `domain/`, xstate, `shared/vendor/stately/` | `ui/`, `infrastructure/`, orpc |

Enforced with `eslint-plugin-import` + a `no-restricted-paths` config in `apps/web-v2/eslint.config.ts`. The allowlist is generated from the table above; PRs that add a new import path require an explicit rule update.

### 5.2 Why "DDD with atomic design with domain focus"

Atomic design gives us a UI taxonomy (atoms / molecules / organisms / templates / pages). DDD gives us a business taxonomy (bounded contexts, entities, value objects, ports, use cases). The mistake to avoid is mapping the two 1:1: an `atoms/task-badge.tsx` is wrong because the badge is a presentation of a domain object, not a standalone primitive.

The mapping we use is:

- `domain/` = bounded contexts. Each folder under `domain/` is one business concept (task, schedule, client, auth, config, finance).
- `ui/atoms/` = the only place where shadcn-vue primitives live. Atoms know about styling, never about tasks.
- `ui/molecules/` = presentational, but typed against domain value objects. `task-state-badge` is a molecule because it knows how to present a `domain.TaskState` value object; it does not know how to fetch one.
- `ui/organisms/` = domain-aware components. `kanban-board` is an organism because it composes `vue-draggable-plus` + `@tanstack/vue-table` (instead of ReUI Kanban, which is React-only) with `domain/task/events/TaskMoved` and writes back through a use case.
- `ui/templates/` = layout shells. `app-shell` is a template; the sidebar (left) and the edit drawer (right) live here.
- `ui/pages/` = one per route. A page glues the router, the use cases, and the organisms. It is intentionally thin (≤ 60 lines of logic).
- `application/` = one folder per bounded context, mirroring `domain/`. Use cases are functions, not classes; inputs and outputs are `Result<T, E>`.
- `infrastructure/` = adapters that implement the ports from `domain/`. The orpc repository adapter is the most important one.

This split lets us:

- Test a use case without a Vue test runner.
- Swap the orpc client for an in-memory fake in a component test by replacing the `TaskRepository` port binding in a test provider.
- Move a use case to a worker thread or a server component without changing `ui/`.

---

## 6. Repository / monorepo layout (deltas from today)

```text
crm-home/                        (root, unchanged)
├── apps/
│   ├── api/                     (unchanged)
│   ├── web/                     (frozen; bugfix-only)
│   └── web-v2/                  (NEW)
│       ├── src/                 (see §5)
│       ├── components.json      (shadcn-vue preset, see §3.2)
│       ├── vite.config.ts
│       ├── tailwind.config.ts   (or @theme in app.css for v4)
│       ├── tsconfig.json
│       ├── eslint.config.ts     (includes the no-restricted-paths rule)
│       ├── package.json
│       ├── README.md
│       └── tests/
│           ├── unit/
│           ├── integration/
│           └── e2e/             (Playwright)
├── packages/
│   ├── tsconfig/                (unchanged)
│   ├── contract/                (NEW: shared zod schemas + orpc types)
│   │   ├── src/
│   │   │   ├── task.ts
│   │   │   ├── schedule.ts
│   │   │   ├── client.ts
│   │   │   ├── auth.ts
│   │   │   ├── config.ts
│   │   │   ├── finance.ts
│   │   │   └── index.ts
│   │   ├── package.json
│   │   └── tsconfig.json
│   └── …
├── docs/
│   ├── PRD.md
│   ├── PRD-v2.md
│   └── PRD-v3.md                (this document)
├── .mcp.json                    (shadcn, reui, stately)
└── …
```

### 6.1 `@crm/contract` (new shared package)

Both `apps/api` and `apps/web-v2` import zod schemas and derived types from `@crm/contract`. This is the **single source of truth** for request/response shapes. Concrete responsibilities:

- One zod schema per entity (`Task`, `TaskState`, `Schedule`, `ScheduleItem`, `Client`, `Session`, `OtpRequest`, `UserConfig`, `Type`, `Category`, `Account`, `App`, `Currency`).
- Inferred TS types via `z.infer<typeof X>`.
- No orpc, no nitro, no Vue. Pure zod + TS.
- `apps/api` builds its orpc router against these schemas; `apps/web-v2` imports the same schemas in its domain entities and its use-case input/output types.

This is the same idea as a generated OpenAPI client, but cheaper: no codegen, no drift, one zod schema per concept.

---

## 7. MCP and skill setup (state, deltas)

### 7.1 MCP servers (`.mcp.json`)

Three servers, all in scope for `web-v2` work:

```json
{
  "mcpServers": {
    "shadcn": {
      "command": "npx",
      "args": ["shadcn@latest", "mcp"]
    },
    "reui": {
      "type": "http",
      "url": "https://mcp.reui.io"
    },
    "stately": {
      "command": "npx",
      "args": ["-y", "@statelyai/mcp"]
    }
  }
}
```

| Server | When to reach for it | When **not** to reach for it |
| --- | --- | --- |
| **shadcn** | adding a primitive (Button, Input, Dialog, Tabs, Sheet, Select, Checkbox, Tooltip, Toast, …) | composite components (data-grid, kanban) — those come from `src/shared/vendor/zag/` or Vue 3 native libs (`@tanstack/vue-table`, `vue-draggable-plus`, `unovis`) |
| **reui** | available for search but **not used** (ReUI is React-only; no Vue port). The MCP is kept for catalog browsing and to reuse the "search an intent" workflow for the Vue 3 native alternatives. | installing any `@reui/*` package — it will not work in a Vue 3 project. |
| **stately** | designing any new state machine (timer, auth, multi-step forms) before writing the XState source | CRUD flows that do not need a finite-state model |

### 7.2 Skills

Required at design time:

- `shadcn` (already installed) — for shadcn-vue initialization and primitive choices.
- `reui` (already installed) — for the composite component workflow.
- `orpc` (to be added by this PRD) — for the contract-first, type-safe RPC pattern between `web-v2` and the API.
- `oil-ui` (already installed) — invoked when designing any new screen, to keep the look original and minimal.

### 7.3 The orpc SKILL (this PRD)

The orpc skill is added as a small wrapper that points at the orpc full documentation. It teaches the agent:

- Why orpc is end-to-end typed (schema-first, contract package, no codegen).
- How to add a new procedure: define the zod schema in `@crm/contract`, expose it in `apps/api/src/http/router.ts`, consume it from `apps/web-v2` via the orpc client wrapper.
- How to handle errors (orpc error codes → `DomainError` mapping in `infrastructure/api/errors.ts`).
- How to wire TanStack Query against an orpc procedure.
- The pattern for "naked" vs "protected" procedures and how the auth middleware attaches the session user to `context.userId`.

The SKILL file lives at `.agents/skills/orpc/SKILL.md` and references `llms-full.txt` as the canonical source (downloaded once, kept in-tree for offline use).

---

## 8. Design system

### 8.1 Visual direction

Original, minimal, green-accented. **No off-the-shelf SaaS look.** Concretely:

- One accent color (green, see scale below). No secondary accent. No purple/pink decoration.
- Hairline borders only. No box-shadows on cards, ever. Surfaces are distinguished by background tone, not by depth.
- A single primary action per screen. Secondary actions are text buttons or quiet ghost buttons.
- A single column of attention on each page. Sidebars are utilitarian, not decorative.
- Typography: Roboto for both heading and body, but the heading is Roboto with `font-weight: 600` and `letter-spacing: -0.01em`; the body is `400`. No display font, no monospace for UI.
- Density: roomy. `1.5rem` baseline on card padding. `2rem` between sections.
- Iconography: Phosphor, `weight="regular"` for navigation, `weight="bold"` for actions. No filled icons for passive elements.
- No motion beyond micro-interactions (button press, focus ring, drawer slide). No parallax, no scroll-jacking.

The oil-ui SKILL is the direction-setting source. We do not copy oil-ui's components — we copy its discipline.

### 8.2 Color tokens (`src/shared/ui/tokens.css`)

The only file in the codebase that contains raw color values. All other files reference these custom properties.

```css
:root {
  /* Primary (green) */
  --color-primary-50:  #f0fdf4;
  --color-primary-100: #dcfce7;
  --color-primary-200: #bbf7d0;
  --color-primary-300: #86efac;
  --color-primary-400: #4ade80;
  --color-primary-500: #22c55e;  /* accent (dark mode) */
  --color-primary-600: #16a34a;  /* accent (light mode) */
  --color-primary-700: #15803d;
  --color-primary-800: #166534;
  --color-primary-900: #14532d;

  /* Zinc (neutral) */
  --color-zinc-50:  #fafafa;
  --color-zinc-100: #f4f4f5;
  --color-zinc-200: #e4e4e7;
  --color-zinc-300: #d4d4d8;
  --color-zinc-400: #a1a1aa;
  --color-zinc-500: #71717a;
  --color-zinc-600: #52525b;
  --color-zinc-700: #3f3f46;
  --color-zinc-800: #27272a;
  --color-zinc-900: #18181b;
  --color-zinc-950: #09090b;

  /* Semantic surfaces (light) */
  --color-bg:        var(--color-zinc-50);
  --color-surface:   white;
  --color-border:    var(--color-zinc-200);
  --color-text:      var(--color-zinc-900);
  --color-text-2:    var(--color-zinc-600);
  --color-accent:    var(--color-primary-600);
  --color-accent-fg: white;

  /* Radius */
  --radius-sm: 0.375rem;
  --radius:    0.625rem;   /* "large" preset */
  --radius-lg: 1rem;

  /* Spacing */
  --space-section: 2rem;

  /* Type */
  --font-family: 'Roboto', system-ui, sans-serif;
  --font-heading: 'Roboto', system-ui, sans-serif;
}

.dark {
  --color-bg:        var(--color-zinc-950);
  --color-surface:   var(--color-zinc-900);
  --color-border:    var(--color-zinc-800);
  --color-text:      var(--color-zinc-50);
  --color-text-2:    var(--color-zinc-400);
  --color-accent:    var(--color-primary-500);
  --color-accent-fg: var(--color-zinc-950);
}
```

Tailwind v4 reads the same tokens via `@theme` in `app.css`. The Zag-wrapped component CSS variables (set via the `cn()` utility and inline classes) reference the same tokens, so every primitive in the app inherits the same palette.

### 8.3 Theme persistence (PRD-v2 §6.8, unchanged)

`user_theme ∈ {light, dark, system}` is the source of truth. The `themeStore` is hydrated from it on app boot. The `system` value follows `prefers-color-scheme` via a media-query listener registered in `theme-provider.vue`.

### 8.4 Empty / loading / error states

- **Empty:** every list view has a defined empty state with a single CTA. Never a blank screen.
- **Loading:** skeletons in the same shape as the final content. No spinners on the first paint of a route (PRD-v2 §8.2 acceptance).
- **Error:** toast for transient errors, inline message for blocking errors. Error boundary at the route level renders a "Something went wrong" panel with a retry button.

---

## 9. Module-level deltas (vs PRD-v2 §8)

PRD-v2 §8 product rules, acceptance criteria, and DB constraints are **inherited unchanged** for `web-v2`. The deltas below are frontend-only.

### 9.1 Login (`/login` + `/login-verification`)

- `auth.machine.ts` owns the state (idle → requesting-otp → otp-sent → verifying-otp → authenticated → error). Designed in Stately.
- `OtpInput` organism wraps `shared/vendor/otp/`. Preserves leading zeros (PRD-v2 §8.1 acceptance criterion).
- The auth API adapter (`auth-repository.ts`) returns a `Result<Session, DomainError>`. The `verify-otp` use case maps the orpc error code `otp_invalid` / `otp_expired` / `otp_max_attempts` to a user-facing message via i18n.

### 9.2 Dashboard (`/dashboard`)

- `TimerCard` organism (presenter for the timer machine) + `TaskStateColumns` organism (presenter for the dashboard summary).
- Empty state: two CTAs ("Create your first task", "Start your first timer"). Same copy shape as PRD-v2 §8.2.

### 9.3 Tasks (`/tasks`)

- `BaseView` organism: grid / kanban / list, view switcher, search filter, localStorage-persisted filters (PRD-v2 §9).
- `KanbanBoard` organism wraps `vue-draggable-plus` on top of `@tanstack/vue-table` rows. Emits `domain/task/events/TaskMoved` on drop. The `update-task-state` and `reorder-task-in-column` use cases run against the event.
- `EditTaskDrawer` organism: resizable right drawer, tiptap for the description, vee-validate + zod form.
- dnd: `shared/vendor/dnd/` wraps `vue-draggable-plus`. The wrapper emits the same `TaskMoved` event shape that the React `apps/web` version did, so QA can compare behavior across both frontends.

### 9.4 Schedule (`/schedules`)

- `timer.machine.ts` is the source of truth for the active timer UI. Designed in Stately: states `idle`, `starting`, `running`, `paused`, `stale-detected`, `stopped`.
- `useTimer` composable subscribes to the machine + the heartbeat. The heartbeat WS path goes through `infrastructure/realtime/heartbeat.ts`.
- `ScheduleHistoryList` organism: list of past `ScheduleItem`s with restart button.
- `ScheduleDayDetail` organism: per-day execution rows with filters.
- `SchedulePieChart` organism wraps `unovis/vue` (donut, not literal pie — better data-density per the oil-ui direction).

### 9.5 Clients (`/clients`)

- `BaseView` (grid + list only — no kanban for clients).
- `EditClientDrawer`: phone split into `area` and `number` inputs (PRD-v2 §8.5 acceptance: `+54 9 11 0000-1111` round-trips exactly).
- Delete confirmation lists dependencies (PRD-v2 §8.5 acceptance).

### 9.6 Config (`/config`)

- Tabs: `user`, `appearance`, `types`, `categories`, `accounts`, `apps`, `currencies`, `attachments`.
- `appearance` tab: theme radio group (light / dark / system). Persists to `user_theme` on selection.
- `apps` and `currencies` are read-only in v1 (PRD-v2 §8.7).

### 9.7 Legal pages (`/terms`, `/privacy`, `/cookies`)

- Markdown files under `apps/web-v2/src/ui/pages/legal/content/<page>.md`. Version is encoded in a comment at the top of each file and surfaced in the UI.
- The content acceptance flow on first OTP validation is unchanged (PRD-v2 §8.8). The `user_accepted_terms_at` and `user_terms_version` columns are still written by the backend.

---

## 10. Testing strategy

| Level | Tool | What it covers |
| --- | --- | --- |
| Unit | vitest | `domain/` entities, value objects, policies, `application/` use cases (with in-memory port fakes) |
| Component | vitest + @vue/test-utils + @testing-library/vue | `ui/molecules/`, `ui/organisms/` (mounting, events, slots); vendors in isolation |
| Integration | vitest + orpc MSW | `infrastructure/api/*` against mocked orpc responses; the wire format is pinned |
| State machine | xstate v5 + Stately MCP | every machine: `validate_machine`, `simulate_machine`, behavior review markdown in the PR |
| E2E | Playwright | every route happy path + the seven critical acceptance criteria from PRD-v2 (OTP, theme persistence, kanban reorder, free schedule, midnight-crossing timer, etc.) |
| Visual | Playwright screenshots | checked on PR; manual review for design direction (oil-ui discipline) |

Coverage targets: **80% lines on `domain/` and `application/`**, **70% lines on `ui/organisms/`**. `ui/atoms/` is covered by shadcn-vue's own tests; we do not re-test the primitives.

---

## 11. Coexistence with `apps/web` (cutover plan)

### 11.1 During the build

- `apps/web` ships the same Phase 1 product. It is **frozen**: only bugfix PRs are accepted. No new features. The branch is `develop` for both, with a `// web-v2:` prefix in commit messages for any change that lands in `apps/web-v2/` to keep `git log` greppable.
- Both apps are built and run side by side. `apps/web` runs on `WEB_PORT=5173` (default). `apps/web-v2` runs on `WEB_V2_PORT=5174`. The backend listens on `API_PORT=3000` and accepts CORS from both.
- The Turbo `dev` task becomes `turbo run dev --filter=./apps/*` (already that way today). Add a `dev:v2` script for just `web-v2`.
- The `@crm/contract` package is built before either frontend. Both consume the same types.

### 11.2 Cutover gate

`apps/web` is removed only when **all** of the following are true:

1. `apps/web-v2` ships **every** PRD-v2 Phase 1 feature with passing acceptance criteria. Verified by the E2E suite.
2. Two weeks of internal dogfooding (the team uses `web-v2` for their own CRM data) with no P0/P1 bug reports.
3. Visual parity check: side-by-side screenshot diff for the 11 PRD-v2 routes. No regressions vs `apps/web`. Allowed deltas: the visual direction (§8.1) is intentionally different from `apps/web`'s poppins + green-600 look, so this is a direction check, not a pixel-perfect diff.
4. Bundle size budget: `web-v2` first-load JS ≤ 300 KB gzipped on `/dashboard`. (`apps/web` baseline: measured before the cutover PR.)
5. Lighthouse: performance ≥ 90, a11y ≥ 95, best-practices ≥ 95 on `/dashboard`, `/tasks`, `/schedules`.

When all five pass, the cutover PR is opened:

- Rename `apps/web-v2/` → `apps/web/`.
- Update turbo and root `package.json` workspaces.
- Update `WEB_PORT` and remove `WEB_V2_PORT`.
- Update README and onboarding docs.

The cutover PR is reviewed by **two** engineers (per the project rule on high-blast-radius changes) and rolled out behind a feature flag for one more week before the `apps/web` legacy path is removed.

### 11.3 Rollback

If a P0 lands in `web-v2` after the cutover:

- The flag flips back to the legacy `apps/web` (kept in a `legacy/web` git tag for 90 days post-cutover).
- The contract package is not reverted (backend stays on the new schemas).
- A fix is shipped to `web-v2` and the flag flips back.

---

## 12. Roadmap (post-v1, non-binding)

Not part of this PRD; recorded for context.

- **Phase 2 (web-v2):** Finance dashboards, attachments on every module, advanced filters. Same architectural rules, no new layers.
- **Phase 3 (web-v2):** Advanced reports (per-client profitability, CSV/PDF export), per-tenant rate limits, optional telemetry on the client (web vitals, navigation traces).
- **Multi-tenant:** when the time comes, the bounded contexts in `domain/` and the use cases in `application/` are the unit of extraction. Nothing in `ui/` or `infrastructure/` needs to change for the first multi-tenant step.

---

## 13. Risks and decisions pending

| Topic | Status | Owner | Decision deadline |
| --- | --- | --- | --- |
| dnd-kit Vue port maturity | `vue-draggable-plus` is the default; `vue-dnd-kit` is the fallback. Verify with a 1-day spike before Tasks work starts. | TBD | before `web-v2` Tasks module |
| ReUI parity on Base UI vs Radix UI | ReUI ships both. Pick once, document the choice, never mix in one file. Default: Base UI (the shadcn-vue default). | RESOLVED | n/a — ReUI removed from stack (React-only); Zag replaces it |
| Pinia vs composable singletons | Pinia for app state; composable singletons for trivial reactive state. No Zustand-style external stores. | TBD | before any state work |
| Vue I18n vs `@intlify/unplugin-vue-i18n` | Default to `vue-i18n` runtime; switch to the unplugin if the bundle bloats. | TBD | after first non-English locale is needed |
| orpc streaming / subscriptions | Not in MVP. The WS path in PRD-v2 §6.5 is enough. | TBD | if a real-time view becomes a PRD requirement |
| shadcn-vue registry URL | Default to the public registry. If we ship our own primitives (likely), a `packages/registry/` is added later. | TBD | when a private primitive is needed |

---

## 14. Acceptance criteria for "PRD-v3 done"

The PRD is implemented when **all** of the following are true:

- [ ] `apps/web-v2` runs alongside `apps/web` on `develop`. Both pass the E2E suite on CI.
- [ ] Every PRD-v2 §8 acceptance criterion passes on `apps/web-v2` (E2E test, not manual).
- [ ] `apps/web-v2/components.json` is the exact preset in §3.2.
- [ ] `apps/web-v2/components.json` and `apps/web-v2/components/vendor/<reui>/` are the only places that import third-party UI packages (lint-enforced).
- [ ] `domain/` has zero `import` statements from `vue`, `pinia`, `@orpc/client`, `@tanstack/*`, or any vendor package (lint-enforced).
- [ ] `application/` has zero `import` statements from `vue`, `pinia`, `@orpc/client`, or `@tanstack/*` (lint-enforced).
- [ ] Every state machine under `src/machine/` has a Stately behavior review markdown attached to the PR that introduced it.
- [ ] The cutover gate (§11.2) is fully met.

---

## 15. Day of judgment (review)

Once the implementation lands, this PRD goes through a **dual adversarial review** (the `judgment-day` SKILL): two reviewers independently produce a structured critique across product, architecture, code, and design, with at most two scoped fix / re-judgment rounds. The review covers the `apps/web-v2` change and the `docs/PRD-v3.md` document. The output of the review (pass, list of fixes, re-judgment) is the gate that closes the PRD.
