# ODD — web-v3 scaffold

Feature: `apps/web-v3` según PRD-v4 (approved + round-2). Scope de ESTA feature: el
scaffold completo y verificable (estructura, routing, tokens, guards, tests de
anti-regresión) — NO las pantallas funcionales (vienen en features siguientes).

Workflow: LayerFS (`./lf fork odd-web-v3-scaffold` → implementar contra el Store →
`./lf land odd-web-v3-scaffold` → git commit, prefix `web-v3:` per PRD §15.1).

## Contrato (fuentes normativas)

- `docs/PRD-v4.md` §11.1 stack locked · §11.3 tokens · §11.4 estructura · §12 routing
  en archivo único · §7.2 tabla canónica de rutas · §12.6 anti-regresión
- Monorepo: workspaces `apps/*` (web-v3 entra solo), turbo tasks genéricos (sin cambios),
  bun 1.4 lockfile committed, `@crm/contract` workspace:*, versiones heredadas de
  web-v2 donde el stack se solapa (zod 4.6.5, xstate 5.32.6, pinia 4.0.3, zag 1.44.0,
  tailwind 4.3.3, orpc 1.15.4, tanstack-query 5.104.1, vee-validate 4.15.1, sonner 2.0.9).

## Tasks

1. [ ] Fork LayerFS `odd-web-v3-scaffold` desde Store-main
2. [ ] Base config: `package.json` (stack §11.1 completo, versiones heredadas),
   `nuxt.config.ts` (`ssr: false`, `pages: false`, tailwind v4, pinia, i18n,
   imports acotados), `tsconfig.json`, `components.json` (preset heredado)
3. [ ] Routing contract: `app/router.options.ts`, `app/router/routes.ts` (tabla §7.2
   completa, 16 filas incl. catch-all), `app/router/search-schemas.ts`
4. [ ] Shell: `app/app.vue` (providers), `app/layouts/{default,auth,legal}.vue`
   (`<RouterView />`), `app/middleware/auth.global.ts` (meta.auth/meta.guest +
   `?redirect=`), stubs de `app/ui/views/*` (una por ruta) y `app/ui/templates/*`
5. [ ] Tokens: `app/assets/css/tokens.css` (valores EXACTOS de §11.3 — único archivo
   con hex crudos) + `app/assets/css/main.css` (`@theme` Tailwind v4)
6. [ ] Layers + guards: `domain/`, `application/`, `infrastructure/`, `shared/vendor/`
   (esqueleto con READMEs de reglas), `eslint.config.ts` con `no-restricted-paths`
   (vendors + layers §11.4), `vitest.config.ts`
7. [ ] Anti-regresión §12.6: test que importa `routes` + tabla §7.2 (mismos paths,
   meta.auth/meta.guest, catch-all) y test de estructura (`pages/` ausente)
8. [ ] Verificación: `bun install` + `nuxi typecheck` + `nuxi build` (sandbox vía
   `lf run` si hay red; fallback local)
9. [ ] Land + git commit (`web-v3: scaffold …`), memoria de cierre

## No-goals de esta feature

- Pantallas funcionales, drawers, domain logic, orpc wiring, e2e playwright real.
- Cambios en `apps/web` / `apps/web-v2` / API (frozen salvo CORS ya hecho).

## Decisiones tomadas

- Deps §11.1 completas ahora (una sola resolución de lockfile; evita churn).
- Dials de diseño (antislop): ENERGY 1-2 / RHYTHM 1-2 / MOTION 1 — dirección dada por
  PRD-v4 §11.3 + catálogo (R-37 satisfecho, no es draft sin dirección).
