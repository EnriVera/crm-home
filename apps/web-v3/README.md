# @crm/web-v3

Nuxt 4 frontend for CRM-HOME. The stack is locked in PRD-v4 §11.1: Nuxt 4, Vue 3.5,
TypeScript strict, Tailwind v4, Pinia, XState, orpc over `@crm/contract`, Zag.js.

## Commands

- `bun run dev` (<http://localhost:5175>)
- `bun run build`
- `bun run test`
- `bun run lint`
- `bun run typecheck`

## Conventions

- Routes live only in `app/router/routes.ts` (PRD-v4 §12); `app/pages/` must not exist.
- Third-party libraries enter only through `app/shared/vendor/` wrappers (PRD-v4 §10.3).
- Raw color values live only in `app/assets/css/tokens.css` (PRD-v4 §11.3).
- `app/domain/` stays pure: no Vue, Nuxt, orpc or TanStack imports (PRD-v4 §11.4).
- Commits use the `web-v3:` prefix (PRD-v4 §15.1).
