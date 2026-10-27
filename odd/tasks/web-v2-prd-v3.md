# web-v2 — task list (PRD-v3 implementation)

> Source: `docs/PRD-v3.md`. Each task closes a slice of the PRD; the PRD is done when the §14 acceptance criteria all pass.

## Status legend

- `[ ]` pending
- `[~]` in progress
- `[x]` done
- `[!]` blocked (reason noted)

---

## Track 0 — Repo wiring (foundation)

- [ ] **T-0.1** Add `apps/web-v2` to turbo workspaces (root `package.json`).
- [ ] **T-0.2** Add `dev:v2` script to root `package.json` that runs only `apps/web-v2`.
- [ ] **T-0.3** Add `WEB_V2_PORT=5174` and `WEB_V2_ENABLED=1` to `.env.example`.
- [ ] **T-0.4** Add `apps/web-v2` to `.gitignore` for build artifacts only (`.output/`, `dist/`, `node_modules/`).
- [ ] **T-0.5** Document the `web-v2:` commit prefix in `CONTRIBUTING.md` (or create it if missing).
- [ ] **T-0.6** Confirm `apps/web` is in `package.json` workspaces (already there).

## Track 1 — `@crm/contract` (shared zod schemas)

- [ ] **T-1.1** Create `packages/contract/package.json` and `tsconfig.json` (extends `@crm/tsconfig`).
- [ ] **T-1.2** Add to root `package.json` workspaces.
- [ ] **T-1.3** Move every entity zod schema from `apps/api/src/http/<entity>/*-routes.ts` into `packages/contract/src/<entity>.ts`. Start with the entities that are already in production use: `task`, `task_state`, `client`, `schedule`, `schedule_item`, `type`, `category`, `account`, `app`, `currency`, `auth` (OtpRequest, Session), `user_config`. **Note:** this task is a backend refactor, not a frontend task. It blocks T-1.4.
- [ ] **T-1.4** Update `apps/api/src/http/<entity>/*-routes.ts` to import the schemas from `@crm/contract` instead of defining them inline.
- [ ] **T-1.5** Add `index.ts` barrel that re-exports every schema and its inferred type.
- [ ] **T-1.6** Add `branded identifier` types in `packages/contract/src/shared/identifiers.ts` (UserId, TaskId, ClientId, etc.) using `z.brand<…>()`.
- [ ] **T-1.7** Add `Result<T, E>` and `Page<T>` helpers in `packages/contract/src/shared/`.

## Track 2 — `apps/web-v2` scaffolding

- [ ] **T-2.1** Create `apps/web-v2/package.json` with the locked stack from PRD-v3 §3.1.
- [ ] **T-2.2** Create `apps/web-v2/tsconfig.json` (strict, `noUncheckedIndexedAccess`, `exactOptionalPropertyTypes`).
- [ ] **T-2.3** Create `apps/web-v2/vite.config.ts` with `@vitejs/plugin-vue`, `@tailwindcss/vite`, and `vite-tsconfig-paths`.
- [ ] **T-2.4** Create `apps/web-v2/index.html`.
- [ ] **T-2.5** Create `apps/web-v2/components.json` (shadcn-vue preset, PRD-v3 §3.2).
- [ ] **T-2.6** Create `apps/web-v2/eslint.config.ts` (flat config) with the `no-restricted-paths` rules from PRD-v3 §5.1.
- [ ] **T-2.7** Create `apps/web-v2/app/styles.css` (Tailwind v4 entry, `@import "./shared/ui/tokens.css"`).
- [ ] **T-2.8** Create `apps/web-v2/src/shared/ui/tokens.css` (PRD-v3 §8.2).
- [ ] **T-2.9** Create `apps/web-v2/src/main.ts` and `apps/web-v2/src/app/App.vue` (Pinia, Router, VueQueryPlugin, I18nProvider, ThemeProvider, ToastProvider).
- [ ] **T-2.10** Create the empty folder skeleton for `domain/`, `application/`, `infrastructure/`, `ui/`, `shared/`, `machine/`, `router/`, `stores/`, `app/`. Add a `.gitkeep` to each.

## Track 3 — Design system

- [ ] **T-3.1** `src/shared/ui/cn.ts` — class merge utility (`clsx` + `tailwind-merge`).
- [ ] **T-3.2** `src/shared/ui/theme.ts` — re-exports of the design tokens for code-side use (no raw hex anywhere else).
- [ ] **T-3.3** Verify Tailwind v4 picks up the tokens via `@theme` in `app/styles.css`.
- [ ] **T-3.4** Add `@fontsource/roboto` and import the 400/500/600/700 weights in `app/styles.css`.
- [ ] **T-3.5** Wire dark-mode via `class="dark"` on `<html>` (Tailwind v4 `@variant dark`).
- [ ] **T-3.6** `src/app/providers/theme-provider.vue` — hydrates from `user.user_theme`, listens to `prefers-color-scheme` for `system` value.
- [ ] **T-3.7** `src/stores/theme.ts` — Pinia store, source of truth for the current `theme` reactive ref.
- [ ] **T-3.8** `src/stores/auth.ts` — Pinia store, mirrors `Session` and `User` from the API.
- [ ] **T-3.9** `src/stores/ui.ts` — Pinia store, sidebar collapsed, last-used filters per view.

## Track 4 — Vendor wrappers (one folder per tool)

- [ ] **T-4.1** `src/shared/vendor/shadcn-vue/` — re-export shadcn-vue primitives from a single `index.ts`. Each primitive lives in its own subfolder (`button/`, `input/`, `dialog/`, `sheet/`, `tabs/`, `select/`, `checkbox/`, `tooltip/`, `sonner/`). Initialized from `components.json`.
- [ ] **T-4.2** `src/shared/vendor/reui/` — re-export ReUI components (`data-grid/`, `kanban/`, `event-calendar/`, `gantt/`, `cascader/`, `filters/`, `stepper/`, `timeline/`). Install via the ReUI MCP into `src/ui/organisms/`, then re-export the typings from the vendor module.
- [ ] **T-4.3** `src/shared/vendor/icons/` — `Icon.vue` wrapper around `@phosphor-icons/vue`. Type-safe `name` prop.
- [ ] **T-4.4** `src/shared/vendor/orpc/` — `createOrpcClient()`, `createOrpcQuery()`, `createOrpcMutation()`. Reads `@crm/contract` for the router type.
- [ ] **T-4.5** `src/shared/vendor/tanstack/` — `createQueryClient()`, `useOrpcQuery`, `useOrpcMutation`, `QueryClientProvider` re-export.
- [ ] **T-4.6** `src/shared/vendor/router/` — re-exports of `Link`, `useNavigate`, `useParams` from `@tanstack/vue-router`.
- [ ] **T-4.7** `src/shared/vendor/stately/` — re-exports of `setup`, `createActor`, `fromPromise`, `assign` from `xstate`. Machine files live in `src/machine/`.
- [ ] **T-4.8** `src/shared/vendor/i18n/` — `createI18n()`, `useT()`. `vue-i18n` setup, default locale `en`.
- [ ] **T-4.9** `src/shared/vendor/forms/` — `toTypedSchema()` from `@vee-validate/zod`, `useForm` from `vee-validate`.
- [ ] **T-4.10** `src/shared/vendor/dnd/` — `useDraggable`, `useDroppable` wrappers around `vue-draggable-plus`. Emits a domain event on drop.
- [ ] **T-4.11** `src/shared/vendor/charts/` — `<DonutChart>`, `<BarChart>`, `<LineChart>` wrappers around `unovis` Vue.
- [ ] **T-4.12** `src/shared/vendor/richtext/` — `RichTextEditor.vue` around `@tiptap/vue-3` with a Task description schema.
- [ ] **T-4.13** `src/shared/vendor/resizable/` — `ResizablePanelGroup`, `ResizablePanel`, `ResizableHandle` re-exports from `vue-resizable-panels`.
- [ ] **T-4.14** `src/shared/vendor/toast/` — `toast()`, `ToastProvider.vue` around `vue-sonner`.
- [ ] **T-4.15** `src/shared/vendor/otp/` — `OtpInput.vue` around `@zag-js/pin-input` + `vue-zag`.
- [ ] **T-4.16** `src/shared/vendor/datepicker/` — `<DatePicker>` re-export from `vue-day-picker`.
- [ ] **T-4.17** `src/shared/vendor/validation/` — zod helpers (`zId()`, `zMoney()`, `zPhoneNumber()`), branded type constructors.

## Track 5 — Domain layer (one folder per bounded context)

- [ ] **T-5.1** `domain/shared/` — `Result`, `DomainError`, `Page<T>`, branded IDs.
- [ ] **T-5.2** `domain/task/` — `Task` entity (zod-validated factory), `TaskState` entity, `TaskTitle`/`TaskDescription`/`KanbanOrder` value objects, `TaskRepository` port, `TaskMoved`/`TaskCreated`/`TaskDeleted` events, `categoryRequiresType` policy.
- [ ] **T-5.3** `domain/schedule/` — `Schedule`, `ScheduleItem` entities, `Duration` value object, `ScheduleRepository` port, `TimerStarted`/`TimerStopped`/`TimerHeartbeat`/`TimerAutoClosed` events, `atMostOneOpenTimer` policy.
- [ ] **T-5.4** `domain/client/` — `Client` entity, `PhoneNumber`/`EmailAddress` value objects, `ClientRepository` port.
- [ ] **T-5.5** `domain/auth/` — `Session`, `OtpRequest` entities, `OtpDigits` value object (preserves leading zeros), `AuthRepository` port.
- [ ] **T-5.6** `domain/config/` — `UserConfig`, `Type`, `Category`, `Account`, `App`, `Currency` entities, `Theme`/`ColorToken`/`Money`/`CurrencyCode` value objects, `ConfigRepository` port.
- [ ] **T-5.7** `domain/finance/` — ports + value objects only (Phase 2).

## Track 6 — Application layer (use cases)

- [ ] **T-6.1** `application/auth/request-otp.ts` — `Result<OtpRequest, DomainError>`.
- [ ] **T-6.2** `application/auth/verify-otp.ts` — maps orpc error codes to user-facing `DomainError`.
- [ ] **T-6.3** `application/auth/sign-out.ts`.
- [ ] **T-6.4** `application/auth/get-session.ts` — returns the cached `Session` from the Pinia store, fetches if missing.
- [ ] **T-6.5** `application/task/list-tasks.ts`, `create-task.ts`, `update-task.ts`, `update-task-state.ts`, `reorder-task-in-column.ts`, `delete-task.ts`.
- [ ] **T-6.6** `application/schedule/start-timer.ts`, `stop-timer.ts`, `resume-timer.ts`, `heartbeat.ts`, `auto-close-stale.ts`, `list-schedule-history.ts`.
- [ ] **T-6.7** `application/client/list-clients.ts`, `create-client.ts`, `update-client.ts`, `delete-client.ts`.
- [ ] **T-6.8** `application/config/list-types.ts`, `list-categories.ts`, `list-accounts.ts`, `list-currencies.ts`, `list-apps.ts`, `update-user-config.ts`, `update-theme.ts`.

## Track 7 — Infrastructure layer

- [ ] **T-7.1** `infrastructure/api/client.ts` — `createOrpcClient()` with `credentials: 'include'`, `baseURL: import.meta.env.VITE_API_URL ?? 'http://localhost:3000'`.
- [ ] **T-7.2** `infrastructure/api/errors.ts` — orpc error → `DomainError` mapping (PRD-v3 SKILL orpc, table in §Error mapping).
- [ ] **T-7.3** `infrastructure/api/procedures/task-repository.ts` — implements `domain/task/ports/TaskRepository`.
- [ ] **T-7.4** `infrastructure/api/procedures/schedule-repository.ts`.
- [ ] **T-7.5** `infrastructure/api/procedures/client-repository.ts`.
- [ ] **T-7.6** `infrastructure/api/procedures/auth-repository.ts`.
- [ ] **T-7.7** `infrastructure/api/procedures/config-repository.ts`.
- [ ] **T-7.8** `infrastructure/realtime/socket.ts` — WebSocket client (PRD-v2 §6.5).
- [ ] **T-7.9** `infrastructure/realtime/invalidation-bus.ts` — `{entity, id, action}` → TanStack Query invalidation.
- [ ] **T-7.10** `infrastructure/realtime/heartbeat.ts` — 30s heartbeat for the open timer.
- [ ] **T-7.11** `infrastructure/persistence/persisted-filters.ts` — per-view localStorage filter persistence.
- [ ] **T-7.12** `infrastructure/persistence/session-mirror.ts` — cached session info for instant render.

## Track 8 — Composables (use-case wrappers)

- [ ] **T-8.1** `shared/composables/use-list-tasks.ts` — wraps `application/task/list-tasks` + TanStack Query.
- [ ] **T-8.2** `shared/composables/use-create-task.ts`.
- [ ] **T-8.3** `shared/composables/use-update-task-state.ts` — kanban move; calls `invalidation-bus` after success.
- [ ] **T-8.4** `shared/composables/use-timer.ts` — subscribes to the timer machine + heartbeat.
- [ ] **T-8.5** `shared/composables/use-auth.ts` — wraps the auth use cases, exposes `requestOtp`, `verifyOtp`, `signOut`.
- [ ] **T-8.6** `shared/composables/use-theme.ts` — exposes the theme store + `setTheme` action.
- [ ] **T-8.7** `shared/composables/use-config.ts` — wraps the config use cases.

## Track 9 — State machines (designed in Stately first)

- [ ] **T-9.1** `machine/timer.machine.ts` — states `idle`, `starting`, `running`, `paused`, `stale-detected`, `stopped`. Designed in Stately first, behavior review attached.
- [ ] **T-9.2** `machine/auth.machine.ts` — states `idle`, `requesting-otp`, `otp-sent`, `verifying-otp`, `authenticated`, `error`.
- [ ] **T-9.3** `machine/otp-input.machine.ts` — states `empty`, `partial`, `full`, `submitting`.

## Track 10 — Templates (page layouts)

- [ ] **T-10.1** `ui/templates/app-shell/` — sidebar (left) + topbar + main area, both resizable.
- [ ] **T-10.2** `ui/templates/auth-layout/` — public, system theme (PRD-v2 §6.8).
- [ ] **T-10.3** `ui/templates/legal-layout/` — public, markdown content.
- [ ] **T-10.4** `ui/templates/error-boundary.vue` — route-level error boundary, "Something went wrong" panel with retry.

## Track 11 — Pages (one per route)

- [ ] **T-11.1** `ui/pages/login/` — `/login`. Form + `auth.machine` driven.
- [ ] **T-11.2** `ui/pages/login-verification/` — `/login-verification`. `OtpInput` + auto-submit.
- [ ] **T-11.3** `ui/pages/dashboard/` — `/dashboard`. `TimerCard` + `TaskStateColumns` (placeholder OK in v1).
- [ ] **T-11.4** `ui/pages/tasks/` — `/tasks`. `BaseView` + `KanbanBoard` (organism) + `EditTaskDrawer`.
- [ ] **T-11.5** `ui/pages/tasks-config/` — `/tasks-config`. Tabs for states.
- [ ] **T-11.6** `ui/pages/schedules/` — `/schedules`. Timer input + history + chart.
- [ ] **T-11.7** `ui/pages/clients/` — `/clients`. `BaseView` (grid + list).
- [ ] **T-11.8** `ui/pages/client-detail/` — `/clients/:id`. Edit + delete.
- [ ] **T-11.9** `ui/pages/config/` — `/config`. Tabs router for user / appearance / types / categories / accounts / apps / currencies / attachments.
- [ ] **T-11.10** `ui/pages/terms/`, `ui/pages/privacy/`, `ui/pages/cookies/` — public markdown.

## Track 12 — Router (TanStack Router)

- [ ] **T-12.1** `router/router.ts` — `createRouter({ routeTree })`.
- [ ] **T-12.2** `router/routes/__root.tsx` — wraps `<AppShell>` for authed routes, `<AuthLayout>` for public.
- [ ] **T-12.3** `router/routes/index.tsx` — `/` redirect by session.
- [ ] **T-12.4** `router/routes/login.tsx`, `login-verification.tsx`.
- [ ] **T-12.5** `router/routes/(authed)/` group: `dashboard.tsx`, `tasks/index.tsx`, `tasks/$id.tsx`, `tasks-config.tsx`, `schedules.tsx`, `clients/index.tsx`, `clients/$id.tsx`, `config.tsx`.
- [ ] **T-12.6** `router/routes/terms.tsx`, `privacy.tsx`, `cookies.tsx`.
- [ ] **T-12.7** `router/guards/require-session.ts` — pre-load check before navigation.
- [ ] **T-12.8** `router/guards/redirect-if-authenticated.ts`.

## Track 13 — Tests

- [ ] **T-13.1** `vitest.config.ts` — happy-dom env, path aliases matching tsconfig.
- [ ] **T-13.2** `tests/unit/domain/` — entities, value objects, policies.
- [ ] **T-13.3** `tests/unit/application/` — use cases against in-memory port fakes.
- [ ] **T-13.4** `tests/component/ui/` — `ui/molecules/`, `ui/organisms/` with @vue/test-utils + @testing-library/vue.
- [ ] **T-13.5** `tests/integration/api/` — orpc MSW against `infrastructure/api/procedures/`.
- [ ] **T-13.6** `tests/e2e/` — Playwright happy paths (subset of PRD-v2 §8 acceptance criteria).

## Track 14 — Verification & cutover

- [ ] **T-14.1** E2E suite passes for the 11 PRD-v2 routes on `apps/web-v2`.
- [ ] **T-14.2** Every PRD-v2 §8 acceptance criterion passes (E2E test, not manual).
- [ ] **T-14.3** `domain/` lint rule (`no-restricted-paths`) is green.
- [ ] **T-14.4** `application/` lint rule is green.
- [ ] **T-14.5** Bundle size on `/dashboard` ≤ 300 KB gzipped.
- [ ] **T-14.6** Lighthouse on `/dashboard`, `/tasks`, `/schedules`: performance ≥ 90, a11y ≥ 95, best-practices ≥ 95.
- [ ] **T-14.7** Two-week dogfood window with no P0/P1.
- [ ] **T-14.8** Cutover PR opened (PRD-v3 §11.2).
- [ ] **T-14.9** **Day of judgment** (PRD-v3 §15). Dual adversarial review against PRD-v3 + the `apps/web-v2` change. At most 2 fix/re-judgment rounds.

---

## Cross-track rules (always)

1. **No inline zod for an entity that has a contract schema.** Add it to `@crm/contract` first.
2. **No direct orpc call from a component.** Composable → use case → port → adapter.
3. **No third-party UI import outside `src/shared/vendor/`.** The lint rule blocks it.
4. **No raw hex / font in any component.** The design tokens are the only source of truth.
5. **State machines are designed in Stately before code.** Behavior review markdown in the PR.
6. **One work-unit commit per task.** Conventional Commits on `develop` with the `// web-v2:` prefix.

---

## Dependency graph (rough)

```text
T-0.x   ── independent
T-1.x   ── independent (but consumed by everything below)
T-2.x   ── independent
T-3.x   ── depends on T-2.7, T-2.8
T-4.x   ── depends on T-2.1 (deps installed)
T-5.x   ── depends on T-1.x
T-6.x   ── depends on T-5.x
T-7.x   ── depends on T-1.x, T-4.4, T-4.5
T-8.x   ── depends on T-6.x, T-7.x, T-4.5
T-9.x   ── depends on T-4.7
T-10.x  ── depends on T-3.x, T-4.13, T-4.14
T-11.x  ── depends on T-8.x, T-10.x, T-4.x (selectively)
T-12.x  ── depends on T-10.x, T-11.x
T-13.x  ── depends on T-5.x … T-11.x
T-14.x  ── depends on T-13.x
```

Parallelizable tracks in a single session: T-0 + T-1 + T-2 + T-4 can run in any order. T-5 through T-12 form a chain.
