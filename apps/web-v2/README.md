# @crm/web-v2

Vue 3 + TypeScript rewrite of the CRM-Home frontend. Implements the same
Phase 1 product as `apps/web` (octane) with a stricter architecture:
domain / application / infrastructure / ui, vendor encapsulation, and
shadcn-vue + ReUI on top.

## Stack (locked, see `docs/PRD-v3.md` §3)

- Vue 3.5 + TypeScript 5.9 (strict)
- Vite 8 + bun
- Tailwind CSS v4 (CSS-variable tokens; `src/shared/ui/tokens.css`)
- shadcn-vue preset: **luma / zinc / green / roboto / phosphor / large / solid / bold**
- ReUI as the second component layer (data-grid, kanban, event-calendar, gantt)
- Pinia (app state) + XState v5 (workflows: timer, auth)
- TanStack Query (data) + TanStack Router (typed routes)
- @orpc/client + @orpc/tanstack-query against `@crm/contract`
- vee-validate + zod (forms)
- vue-i18n (i18n)
- vue-sonner (toasts)
- Vitest + @vue/test-utils + Playwright

## Folder layout (PRD-v3 §5)

```
src/
├── domain/        # pure business model (no Vue, no orpc, no zod from a non-shared place)
│   ├── task/
│   ├── schedule/
│   ├── client/
│   ├── auth/
│   ├── config/
│   ├── finance/
│   └── shared/    # Result, DomainError, identifiers
├── application/   # use cases (composable, framework-agnostic)
├── infrastructure/# adapters (the only layer that imports orpc, ws, storage)
├── ui/            # atomic design with domain focus
├── shared/
│   ├── vendor/    # THE ONLY place UI libs are imported
│   ├── ui/        # design tokens, cn, theme
│   └── composables/
├── machine/       # XState v5 machines
├── router/        # TanStack Router
├── stores/        # Pinia stores
└── app/           # bootstrap, providers, styles
```

## Commands

```bash
# from the repo root
bun install                    # installs all workspaces
bun --filter @crm/web-v2 dev   # run on http://localhost:5174
bun --filter @crm/web-v2 build
bun --filter @crm/web-v2 test
bun --filter @crm/web-v2 lint
bun --filter @crm/web-v2 typecheck
```

## Environment

Add to `apps/web-v2/.env.local` (gitignored):

```bash
VITE_API_URL=http://localhost:3000
```

The backend lives in `apps/api/`; the default port is `3000` and the
orpc procedures are mounted at `/rpc`.

## Development rules

1. `domain/` must not import Vue, Pinia, orpc, TanStack Query, vee-validate,
   xstate, or effect. (Lint-enforced.)
2. `application/` must not import Vue, Pinia, orpc, TanStack Query, or
   vee-validate. (Lint-enforced.)
3. `src/shared/vendor/<tool>/` is the only place that imports a third-party
   UI/framework package. (Lint-enforced.)
4. Design tokens are the only file with raw color values. (PR review rule.)
5. State machines are designed in Stately first; the behavior review
   markdown is attached to the PR.

See `docs/PRD-v3.md` for the full architecture rationale and the
coexistence / cutover plan with `apps/web`.
