# Tasks — monorepo-scaffold

> Fase tasks del change SDD `monorepo-scaffold` (CRM-HOME).
> Inputs leídos: `proposal.md`, `design.md`, `specs/{workspace,api,web}/spec.md`, `openspec/config.yaml`.
> Excepción TDD activa (infra sin lógica de negocio): smoke tests puros según D10, sin ciclo red-green.
> Orden de commits según D11; Conventional Commits obligatorio (husky + commitlint activos).

## Review Workload Forecast

| Field | Value |
| ------- | ------- |
| Estimated changed lines | ~1500–2500 líneas manuscritas (árbol completo de §2 del design: ~45 archivos fuente/config + READMEs) más `bun.lock` regenerado (generado, potencialmente miles de líneas) |
| 400-line budget risk | High (excede el budget con holgura) |
| Chained PRs recommended | No — `size:exception` aceptado explícitamente por el usuario (delivery_strategy `exception-ok` en `openspec/config.yaml`); no se recomienda split |
| Suggested split | PR único (exception-ok) con 3 commits atómicos según D11 para facilitar review |
| Delivery strategy | exception-ok |
| Chain strategy | size-exception |

```text
Decision needed before apply: No
Chained PRs recommended: No
Chain strategy: size-exception
400-line budget risk: High
```

---

## Commit 1 — `chore: configura workspace del monorepo (bun workspaces, turbo, compose, env)`

Verde al cierre: `bun install` resuelve en limpio con lockfile consistente.

- [x] Verificar en registry npm y pinear versiones exactas (sin `^`/`~`) de `turbo` (≥ 2.x, prebuild linux-x64) y `typescript` (propio del workspace, no el transitivo de commitlint); registrar versiones para D2. <!-- sdd-owner: implementation -->
- [x] Ejecutar `bun --version` y registrar el pin exacto para `packageManager` en el `package.json` raíz. <!-- sdd-owner: implementation -->
- [x] Crear/actualizar `package.json` raíz: `workspaces: ["apps/*", "packages/*"]`, `packageManager: "bun@<pin>"`, scripts `dev|build|test|lint|typecheck` delegando en `turbo run <task>`, devDeps pineadas `turbo` + `typescript`. <!-- sdd-owner: implementation -->
- [x] Crear `turbo.json` con sintaxis turbo ≥ 2.x (clave `tasks`) según D1: `build` (dependsOn `^build`, outputs `dist/**` + `.output/**`), `dev` (cache false, persistent), `test`, `lint`, `typecheck`. <!-- sdd-owner: implementation -->
- [x] Ampliar `.gitignore` (sin quitar patrones existentes) con `.turbo/`, `dist/`, `.output/`, `.nitro/`, `.env`, `.env.local`, `*.tsbuildinfo` según D9. <!-- sdd-owner: implementation -->
- [x] Crear `.env.example` con `DATABASE_URL=postgres://crm:crm@localhost:5432/crm_home`, `OTEL_EXPORTER_OTLP_ENDPOINT=` (vacío → no-op), `API_PORT=3000`, `WEB_PORT=5173` según D9. <!-- sdd-owner: implementation -->
- [x] Crear `docker-compose.yml` con servicio `postgres:17-alpine` (`crm-home-postgres`, user/db `crm`/`crm_home`, puerto 5432, volumen `crm_pgdata`, healthcheck `pg_isready`) según D9. <!-- sdd-owner: implementation -->
- [x] Crear `Makefile` raíz con targets `dev`, `build`, `test`, `db-up` (compose up + espera con `pg_isready`), `db-down`, documentando en comentario el fallback `bun --filter` según D1/D9. <!-- sdd-owner: implementation -->
- [x] Crear `packages/tsconfig/package.json` (`@crm/tsconfig`) y bases `base.json` (strict, ES2022, ESNext, bundler, verbatimModuleSyntax, skipLibCheck, noUncheckedIndexedAccess), `server.json` (types bun, sin DOM) y `web.json` (lib ES2022+DOM, jsx react-jsx) según D8. <!-- sdd-owner: implementation -->
- [x] Crear/actualizar README raíz documentando el fallback `bun --filter` para los scripts si turbo falla con `bun.lock` v2 (scenario "Fallback documentado y operativo"). <!-- sdd-owner: implementation -->
- [x] Ejecutar `bun install` y verificar resolución limpia con `bun.lock` regenerado y consistente; commitear todo lo anterior en `develop` con el mensaje del commit 1 (aceptado por commitlint). <!-- sdd-owner: implementation -->

## Commit 2 — `feat(api): scaffold de @crm/api con clean architecture, health y OTel no-op`

Verde al cierre: `turbo run build test` (o fallback `bun --filter`), `GET /health` → 200 en dev sin OTLP. El mensaje del commit documenta el resultado del spike D3.

- [x] Spike acotado (≤ 30 min) D3: instalar pin exacto de nitro v3, levantar dev con ruta h3 `GET /health`, montar handler fetch de orpc y correr `nitro build` bajo bun; si falla cualquier criterio, pinear nitro v2 estable; documentar el resultado para el mensaje del commit. <!-- sdd-owner: implementation -->
- [x] Verificar en registry npm y pinear versiones exactas de `nitro` (resultado del spike), `h3` (si se importa directo), `@orpc/server`, `@orpc/contract`, `zod`, `kysely`, `pg`, `@types/pg` y los paquetes OTel (`@opentelemetry/api`, `@opentelemetry/sdk-node`, `@opentelemetry/exporter-trace-otlp-http`, `@opentelemetry/resources`, `@opentelemetry/semantic-conventions`); sin node-gyp según D2. <!-- sdd-owner: implementation -->
- [x] Crear `packages/types` (`@crm/types`): `package.json`, `tsconfig.json` (extends `@crm/tsconfig/base`), `src/index.ts` y `src/contracts/health.ts` con `healthOutputSchema` (zod: `status` literal "ok" + `timestamp` ISO), `healthContract` vía `oc.output` y tipo `HealthOutput` inferido según §4.2 del design. <!-- sdd-owner: implementation -->
- [x] Crear `apps/api/package.json` (`@crm/api`) con deps pineadas y scripts `dev|build|test|lint|typecheck`, `apps/api/tsconfig.json` (extends `@crm/tsconfig/server`) y `apps/api/nitro.config.ts` según D3/D4. <!-- sdd-owner: implementation -->
- [x] Crear `apps/api/src/domain/README.md` (regla §10: TS puro, sin imports externos) y `apps/api/src/domain/ports/telemetry.ts` + `health-repository.ts` con los contratos exactos de §4.1 del design. <!-- sdd-owner: implementation -->
- [x] Crear `apps/api/src/application/health/get-health.ts`: caso de uso `GetHealth` que recibe `HealthRepository` + `Telemetry` por inyección y depende solo de `domain/` según D4. <!-- sdd-owner: implementation -->
- [x] Crear `apps/api/src/infrastructure/otel/`: `otel-telemetry.ts` (adapter OTel, único import del SDK, exportador OTLP HTTP por env) y `noop-telemetry.ts`, con factory `createTelemetry(env)` que devuelve no-op si `OTEL_EXPORTER_OTLP_ENDPOINT` está vacía/ausente sin inicializar el SDK según D4. <!-- sdd-owner: implementation -->
- [x] Crear `apps/api/src/infrastructure/kysely/database.ts` con `createDatabase(url)` lazy (Kysely + PostgresDialect de `pg`, lee `DATABASE_URL`, sin instanciar en arranque, sin migraciones) según D4. <!-- sdd-owner: implementation -->
- [x] Crear `apps/api/src/infrastructure/health/static-health-repository.ts`: adapter trivial que responde `{ status: "ok" }` sin tocar BD según D4. <!-- sdd-owner: implementation -->
- [x] Crear `apps/api/src/http/composition-root.ts` (único wiring: factory telemetry + health repository + caso de uso, expone `createAppFetch()`), `apps/api/src/http/routes.ts` (ruta h3 `GET /health`) y `apps/api/src/http/router.ts` (router orpc con procedimiento `health` sobre `healthContract` de `@crm/types`, montado en `/rpc/*`) según D4/D5; ambos delegan en el mismo `GetHealth`. <!-- sdd-owner: implementation -->
- [x] Crear smoke test puro `apps/api/src/http/router.test.ts` según D10: composition root con `NoopTelemetry` + `StaticHealthRepository`, `await handler(new Request("http://localhost/health"))` → 200 y body `{ status: "ok", … }`, más caso sin `OTEL_EXPORTER_OTLP_ENDPOINT` verificando que `createTelemetry` devuelve el no-op; sin DOM, red ni BD. <!-- sdd-owner: implementation -->
- [x] Verificar: `bun test` verde en `apps/api` sin postgres ni OTLP; `GET /health` → 200 en dev; `grep` de imports de `kysely|h3|nitro|@opentelemetry` bajo `src/domain` y `src/application` → cero resultados (auditoría §7 del design). <!-- sdd-owner: implementation -->
- [x] Ejecutar `bun install` (lockfile consistente), `turbo run build typecheck test` (o fallback) verdes para `@crm/types` + `@crm/api`, y commitear en `develop` con el mensaje del commit 2 incluyendo el resultado del spike nitro. <!-- sdd-owner: implementation -->

## Commit 3 — `feat(web): scaffold de @crm/web con atomic design, vendor/ e i18n es`

Verde al cierre: `bun test` raíz verde, dev renderiza la página de humo en español. **No se commitea antes de la verificación D6.**

- [x] **[BLOQUEANTE — D6, primera tarea del grupo]** Verificar en registry npm el nombre/scope real de `octanejs`/`tsrx`, su existencia, última versión y peer deps (React, vite); si no existe bajo ningún nombre/scope razonable o las peer deps son incompatibles con el stack pineado: DETENER el trabajo sobre `apps/web`, documentar el hallazgo en el change y escalar al usuario sin sustituir el framework (criterio vinculante D6/spec workspace). <!-- sdd-owner: implementation -->
- [x] Tras la verificación D6: pinear versión exacta de `octanejs`/`tsrx` y resolver las decisiones contingentes — router (`@tanstack/react-router` si es React-compatible, variante equivalente del ecosistema si no) e i18n (`react-i18next` vía wrapper en `vendor/i18n/`, o variante equivalente ajustando solo `vendor/i18n/`) según D6. <!-- sdd-owner: implementation -->
- [x] Verificar en registry npm y pinear versiones exactas de `vite`, `tailwindcss` (v4, oxide con prebuilds linux-x64), `@tailwindcss/vite`, `@fontsource/poppins` (pesos 400/500/600/700), `i18next` (+ wrapper elegido) y el router; sin node-gyp según D2. <!-- sdd-owner: implementation -->
- [x] Crear `apps/web/package.json` (`@crm/web`) con deps pineadas y scripts, `apps/web/tsconfig.json` (extends `@crm/tsconfig/web`), `apps/web/vite.config.ts` e `apps/web/index.html` siguiendo la convención del meta-framework verificado en D6. <!-- sdd-owner: implementation -->
- [x] Crear `apps/web/src/components/vendor/README.md` con la regla §9 (ninguna lib de UI de terceros se importa fuera de `vendor/`) y `apps/web/src/components/vendor/i18n/`: `provider.tsx` (I18nProvider, único import de i18next/react-i18next) e `index.ts` (re-export `t()`/`useT`) según D7. <!-- sdd-owner: implementation -->
- [x] Crear carpetas atomic design `apps/web/src/components/{atoms,molecules,organisms,templates}/` con al menos un atom y un molecule de ejemplo que consuman solo `../vendor`, y `apps/web/src/components/base-view/README.md` (placeholder; BaseView real llega con su feature §9) según D7. <!-- sdd-owner: implementation -->
- [x] Crear `apps/web/src/lib/i18n/`: `config.ts` (init options, default `es`, importa SOLO `../components/vendor/i18n`), `locales/es.json` (catálogo inicial con `app.title` y claves del smoke page) según D7. <!-- sdd-owner: implementation -->
- [x] Crear `apps/web/src/styles/tokens.css` con tokens semánticos claro/oscuro (`--color-primary-50…900` verde — claro `#16a34a`, oscuro `#22c55e` —, `--color-background`, `--color-surface`, `--color-border`, `--color-text-primary`, `--color-text-secondary`), tema oscuro por clase `.dark`, consumidos por tailwind v4 vía `@theme` según D7. <!-- sdd-owner: implementation -->
- [x] Crear `apps/web/src/components/pages/smoke-page.tsx` (compone al menos un atom y un molecule, textos exclusivamente del catálogo i18n `es`), `apps/web/src/routes/__root.tsx` y `apps/web/src/routes/index.tsx` (base tanstack router que monta la smoke page) y `apps/web/src/main.tsx` (entry: framework + router + i18n + tokens + `@fontsource/poppins`) según D7. <!-- sdd-owner: implementation -->
- [x] Crear smoke test puro `apps/web/src/lib/i18n/i18n.test.ts` según D10: idioma default `es`, `t("app.title")` y claves del smoke page devuelven las cadenas del catálogo, y chequeo estático de que las claves usadas en la página de humo existen en el catálogo; sin DOM ni red. <!-- sdd-owner: implementation -->
- [x] Verificar: `bun test` verde en `apps/web`; dev server levanta y la ruta inicial renderiza textos del catálogo `es` (sin cadenas hardcodeadas en inglés); `grep` de imports de libs de UI fuera de `apps/web/src/components/vendor/` → cero resultados; `apps/web` no importa `apps/api/src` (auditoría §7 del design). <!-- sdd-owner: implementation -->
- [x] Ejecutar `bun install` (lockfile consistente), `turbo run build typecheck test` (o fallback) verdes incluyendo `@crm/web`, y commitear en `develop` con el mensaje del commit 3. <!-- sdd-owner: implementation -->

## Cierre del change (verificación integral, criterios de éxito §6 de la proposal)

- [x] Verificación final desde clone limpio conceptual: `bun install` resuelve con lockfile commitado; `turbo run build` (o fallback `bun --filter` documentado) compila `apps/api`, `apps/web` y `packages/*`; `bun test` verde desde la raíz del workspace. <!-- sdd-owner: implementation -->
- [x] Verificación de entorno: `make db-up` (o `docker compose up -d`) deja `postgres:17-alpine` healthy y accesible con la `DATABASE_URL` de `.env.example`; `apps/api` en dev responde `GET /health` → 200 sin `OTEL_EXPORTER_OTLP_ENDPOINT` (no-op); `apps/web` en dev renderiza la página de humo en español. <!-- sdd-owner: implementation -->
- [x] Auditoría final por path: dominio/aplicación de api sin imports de kysely/h3/nitro/SDKs; SDK OTel solo bajo `infrastructure/otel/`; libs de UI solo bajo `components/vendor/`; web sin imports de `apps/api/src`; artefactos de build (`.turbo/`, `dist/`, `.output/`, `.nitro/`, `.env`) ausentes de `git status`. <!-- sdd-owner: implementation -->
- [x] Confirmar que los 3 commits D11 están en `develop`, aceptados por commitlint (Conventional Commits), sin modificar `.husky/` ni `commitlint.config.mjs`; rollback documentado = `git revert` de los 3 commits. <!-- sdd-owner: implementation -->
