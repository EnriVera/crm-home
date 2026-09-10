```yaml
schema: gentle-ai.verify-result/v1
evidence_revision: sha256:8f081b201f2a308449d8aa915cfc72538deaa194b335fc5f3ec59e2c261fcf20
verdict: pass
blockers: 0
critical_findings: 0
requirements: 9/9
scenarios: 24/24
test_command: bun test
test_exit_code: 0
test_output_hash: sha256:335ab4d3d0d98d4c3b3478fa50c807da6d2740deb186a27fa4aed967dcd71e94
build_command: bunx turbo typecheck
build_exit_code: 0
build_output_hash: sha256:179de59692a4e78f86e3a07ae327e337ce6765d72439193044da474c779fab7a
```

# Verify Report — transactional-email

## Status

**verdict: PASS** — 9/9 requirements, 24/24 scenarios, 0 critical findings, 0 blockers. Implementation matches `openspec/changes/transactional-email/{proposal,design,tasks,specs}` plus the `apply-progress.md` TDD Cycle Evidence table. Tests + typecheck independent of opportunistic infrastructure (postgres + Mailpit) and gate as expected.

## Executive Summary

| Surface | Result |
| --- | --- |
| `bun test` (workspace root) | **PASS** — 165 pass / 16 skip / 0 fail (730 expect() calls, 1 snapshot) |
| `bunx turbo typecheck` | **PASS** — 6/6 packages (workspace, api, web, email, types, tsconfig) green |
| Task checkboxes | 55/55 implementation tasks `[x]`; 0 unchecked |
| Ports & adapters purity | **PASS** — `src/domain/` and `src/application/` import none of `@octanejs/email`, `nodemailer`, `kysely`, `h3`, `nitro`, `node:crypto` (grep returns empty) |
| PII guard in drain | **PASS** — `drain-email-sending.test.ts` asserts `to`/`subject`/`body` never appear in serialized logs |
| Spec scenarios covered | 24/24 (including 2 escalation rules vacuously satisfied because the spike passed) |
| Review workload | Exceeds 400-line budget (1621 / +54 in `cf1cb59..HEAD`); apply-progress documents the `stacked-to-main` recommendation; this verify does not block on the size decision because the parent's delivery decision is upstream. |

## Spec Coverage

### `openspec/changes/transactional-email/specs/email/spec.md` (NEW domain — full spec copy)

| Requirement | Scenarios | Status | Evidence |
| --- | --- | --- | --- |
| Paquete `@crm/email` con plantillas `.tsrx` precompiladas a JS | Build del paquete produce artifact consumible; turbo respeta la dependencia de build | ✅ | `packages/email/package.json` declares `main`/`exports` → `dist/index.js`; `vite.config.ts` with `octane/compiler/vite` plugin (`ssr: true`) precompiles `.tsrx`. Turbo log shows `@crm/email:build` ran before `@crm/api:build` (`dist/index.js 131.02 kB │ gzip: 34.09 kB`). |
| Tooling de desarrollo y exportación con `@octanejs/email-cli` | Typecheck del paquete aislado; Exportación de la plantilla OTP en desarrollo | ✅ | `package.json` scripts: `build`, `typecheck` (`tsrx-tsc --noEmit -p tsconfig.typecheck.json`), `test`, `export` (`octane-email export -d src/templates --outDir out`); `scripts/export-templates.ts` is the wrapper. `@crm/email:typecheck` cache hit / exit 0 in turbo log. |
| Plantilla OTP con copy en español y fallback de texto plano | Código destacado y copy completo en el HTML; Fallback de texto plano equivalente | ✅ | `packages/email/src/templates/otp-email.tsrx` renders `Tu código de acceso`, `Ingresá el siguiente código para continuar:`, `041283`, `Este código expira en 10 minutos.`, `Si no lo solicitaste, ignorá este mensaje.` `getOtpEmailText` builds the plain fallback. `otp-email.test.ts` asserts all of the above + zero-preservation `001122`. Snapshot file `__snapshots__/otp-email.test.ts.snap` matches. |
| Snapshot del render de la plantilla OTP | Regresión de copy detectada por el snapshot | ✅ | `bun --filter @crm/email test` snapshot is green; future copy drift will fail the snapshot test until `--update-snapshots` is invoked explicitly. |

### `openspec/changes/transactional-email/specs/api-auth/spec.md` (MODIFIED — 3 req / 10 scen)

| Requirement | Scenarios | Status | Evidence |
| --- | --- | --- | --- |
| Solicitud de OTP con rate-limit y encolado de email (MODIFIED) | Cuarto envío dentro de la hora rechazado; Solicitud válida persiste OTP y encola email renderizado | ✅ | `request-otp.test.ts` tests: `rechaza el 4.º envío dentro de una hora con RateLimitedError`, `rate-limit no crea filas en login ni email_sending`, `solicitud válida persiste login y encola email`, `asunto y cuerpo del email provienen del renderer`, `el HTML renderizado con markup se persiste en body`. `request-otp.ts` now invokes `emailTemplateRenderer.renderOtp({ code })` and persists `subject`/`html`. |
| Puerto EmailSender con adapters consola/SMTP y task de drenaje (MODIFIED) | OTP encolado drenado por la task en dev; OTP enviado por SMTP con Mailpit; Proveedor real enchufable sin tocar dominio; Fallback a consola sin SMTP_URL; Error transitorio deja el mensaje pendiente; Error permanente marca el mensaje como fallido | ✅ | `email-sender.ts` adds `html?` / `text?` keeping `body` mandatory (back-compat). `drain-email-sending.test.ts` covers retryable/perm/non-EmailSendError/multi-classified paths. `smtp-email-sender.test.ts` covers ECONNREFUSED, ETIMEDOUT, 4xx, 5xx, unknown, multipart with `html+text`, html-only. `create-email-sender.test.ts` covers present/empty/whitespace/undefined SMTP_URL and discrete env ignored. Integration test `smtp-email-sender.integration.test.ts` opts in only with `SMTP_URL` pointing at localhost:1025 and Mailpit reachable — skipped locally as expected (16/16 skipped integration tests + 2 SMTP). PII guard: `los logs no contienen to/subject/body (PRD §9)` test asserts the drain log does not include the message's `to`/`subject`/`body`. Domain/application purity grep returns no `@octanejs/email`/`nodemailer`/`kysely`/`h3`/`nitro`/`node:crypto` imports. |
| Puertos de dominio y casos de uso puros para auth (MODIFIED) | Confinamiento de imports verificable; Renderer inyectado en RequestOtp vía composition root | ✅ | `composition-root.ts` instantiates `new OctaneEmailTemplateRenderer()` and passes it into `new RequestOtp({ ... emailTemplateRenderer })`. The renderer adapter lives in `src/infrastructure/email/`. Purity grep covers both scenarios. |

### `openspec/changes/transactional-email/specs/workspace/spec.md` (MODIFIED — 2 req / 7 scen)

| Requirement | Scenarios | Status | Evidence |
| --- | --- | --- | --- |
| Tooling de entorno (docker-compose, .env.example, .gitignore, Makefile) (MODIFIED) | PostgreSQL de desarrollo levanta vía compose; Mailpit de desarrollo levanta de forma independiente; Artefactos de build no se commitean | ✅ | `docker-compose.yml` carries `postgres:17-alpine` (pre-existing) and the new `mailpit` service (`axllent/mailpit:v1.24@sha256:3ad9483a...`) with `1025:1025`, `8025:8025`, `MP_SMTP_AUTH_ACCEPT_ANY=1`, `MP_SMTP_AUTH_ALLOW_INSECURE=1`, healthcheck `wget --spider http://localhost:8025/`. `Makefile` exposes `mail-up`, `mail-down`, `up` (postgres+mailpit), keeps `db-up` postgres-only. `.env.example` documents `SMTP_URL=smtp://localhost:1025` (commented, optional). `.gitignore` lists `.turbo/`, `dist/`, `.output/`, `.nitro/`, `.env`, `.env.local`, `*.tsbuildinfo`. Spike-verification.md documents the spike container responding `220 Mailpit ESMTP Service ready`. |
| Verificación y pinning de versiones (bloqueante) (MODIFIED) | Versiones verificadas y pineadas; Dependencias de email verificadas antes del commit; Escalación si octanejs no resuelve; Escalación si las dependencias de email no resuelven | ✅ (vacuously for escalations) | `packages/email/package.json` pins `@octanejs/email@0.0.3` exact and `@octanejs/email-cli@0.0.3` exact. `apps/api/package.json` pins `nodemailer@6.10.1` exact and `@types/nodemailer@6.4.17` exact. `docs/transactional-email/spike-verification.md` records the `npm view` results, peer-dep compatibility analysis, and the build-smoke + nodemailer × Bun × Mailpit smoke test (Mailpit UI reflected the message). The two escalation scenarios describe what MUST happen IF the verification fails; since the spike passed, the escalation did not fire — vacuously satisfied, no override needed. |

## Task Completion Status

`openspec/changes/transactional-email/tasks.md`:

- 55 implementation tasks all marked `[x]`. **0 unchecked `- [ ]`** lines remain (verified by `grep -c '^- \[ \]' tasks.md` = 0).
- Implementation ownership markers (`<!-- sdd-owner: implementation -->`) parse cleanly; no malformed/missing owners detected.
- Deferred parent lifecycle actions: 0 (per status JSON).
- Review Workload Forecast acknowledged in `tasks.md` (`stacked-to-main`, `ask-on-risk`); the change was delivered as 6 atomic commits (WU1 → WU6) preserving TDD traceability; PR boundary decision is upstream of verify.

## Structured Status & `actionContext` Findings

| Field | Value | Notes |
| --- | --- | --- |
| `schemaName` | `gentle-pi.sdd-status` | Native engine authoritative |
| `changeName` | `transactional-email` | Match |
| `artifactStore` | `openspec` | Native OpenSpec directory present and authoritative |
| `applyState` | `all_done` | 55/55 implementation tasks complete |
| `dependencies.verify` | `ready` | ✅ matched |
| `dependencies.sync` | `blocked` (waits on this verify) | This report enables sync |
| `dependencies.archive` | `blocked` (waits on sync + verify) | This report enables archive after sync |
| `actionContext.mode` | `repo-local` | ✅ |
| `actionContext.allowedEditRoots` | `/run/media/enri/DISCO DURO/crm-home/crm` | Read-only over implementation; write only to `verify-report.md` |
| `nextRecommended` | `sdd-verify` | Active when verify was invoked |
| `isNonAuthoritative` | `false` | Native engine authoritative for OpenSpec |
| Warnings | none | |

## Test & Validation Commands

### `bun test` (workspace root, expected ~165/~16/0)

- Exit: **0**
- 165 pass / 16 skip / 0 fail across 35 files / 181 tests. 1 snapshot, 730 expect() calls. Total runtime ~960 ms.
- Skipped integration tests (16 total): 7 auth HTTP endpoints + 2 SMTP × Mailpit + 4 KyselyLoginRepository + 3 KyselySessionRepository. All are explicit `*.integration.test.ts` opt-in suites that skip when their infrastructure is absent — exactly the by-design behavior specified in `apply-progress.md` and confirmed by the parent prompt.
- Output hash: `sha256:335ab4d3d0d98d4c3b3478fa50c807da6d2740deb186a27fa4aed967dcd71e94`

### `bunx turbo typecheck` (expected 6/6 green)

- Exit: **0**
- 6 packages green: `@crm/api`, `@crm/email`, `@crm/tsconfig`, `@crm/types`, `@crm/web` (+ `@crm/types:build`, `@crm/email:build` as `^build` deps). All cache hits; `vite build` for `@crm/email` produced `dist/index.js 131.02 kB │ gzip: 34.09 kB` and `dist/index.d.ts`.
- Output hash: `sha256:179de59692a4e78f86e3a07ae327e337ce6765d72439193044da474c779fab7a`

### Spot-checks confirmed against the codebase

| Spot-check | Method | Result |
| --- | --- | --- |
| `parse-smtp-url` retryable classification | `parse-smtp-url.test.ts` (7 cases) + `smtp-email-sender.test.ts` retryable mapping | ✅ all green; 4xx → retryable, 5xx → not retryable, ECONNREFUSED/ETIMEDOUT → retryable, unknown → not retryable |
| `drain-email-sending` retry-state mapping | `drain-email-sending.test.ts` (7 cases including the PII guard) | ✅ retryable → pending (no transition, warn log); non-retryable + unknown → failed; "mezcla" test mixes all three in a single run |
| OTP template render output | `packages/email/src/templates/otp-email.test.ts` (4 cases including snapshot) | ✅ snapshot green; copy and zero-preservation verified |
| Mailpit docker-compose + `.env.example` | `docker-compose.yml` service + `.env.example` `SMTP_URL` (commented) + spike-verification.md smoke | ✅ image pinned by digest, ports mapped, healthcheck present, env documented |
| PII guard test | `drain-email-sending.test.ts` "los logs no contienen to/subject/body (PRD §9)" | ✅ JSON.stringify(logs) excludes `user@example.com`, `Tu código de acceso`, `<p>Hola</p>` |
| No `@octanejs/email` or `nodemailer` in `apps/api/src/{domain,application}` | `grep -rn "@octanejs/email\|nodemailer" apps/api/src/domain apps/api/src/application` | ✅ empty result |

## Strict TDD Compliance

| Check | Result | Details |
| --- | --- | --- |
| TDD Cycle Evidence table reported | ✅ | `apply-progress.md` § TDD Cycle Evidence, 6 WU rows (WU1 spike → WU6 integration) |
| All tasks have tests | ✅ | 55/55 tasks reference a test or spike evidence; spike is documented in `docs/transactional-email/spike-verification.md` |
| RED confirmed (test files exist) | ✅ | 8 test files cross-referenced; all exist on disk |
| GREEN confirmed (tests pass) | ✅ | `bun test` exits 0; snapshot green |
| Triangulation adequate | ✅ | Each WU has 2+ test cases per requirement; smoke + fake + (where applicable) integration |
| Safety Net for modified files | ✅ | `request-otp.ts` modified — its test was extended with `FakeEmailTemplateRenderer`; old assertions preserved. All other WU files are NEW, so N/A. |
| **TDD Compliance** | **6/6 checks passed** | |

## Assertion Quality Audit

No `expect(true).toBe(true)` tautologies. No ghost loops. No type-only assertions used alone. No empty-collection assertions. Each test exercises production code with concrete expectations.

| Layer | Tests | Files | Tools |
| --- | --- | --- | --- |
| Unit | 161 (incl. snapshot) | 7 unit test files (`request-otp.test.ts`, `parse-smtp-url.test.ts`, `create-email-sender.test.ts`, `smtp-email-sender.test.ts`, `drain-email-sending.test.ts`, `octane-email-template-renderer.test.ts`, `otp-email.test.ts` in `packages/email`) | `bun test` |
| Integration | 16 skipped | `auth.integration.test.ts` (7), `smtp-email-sender.integration.test.ts` (2), `login-repository.integration.test.ts` (4), `session-repository.integration.test.ts` (3) | `bun test` with infra opt-in |
| E2E | n/a | No playwright/cypress in scope for this change | |
| **Total** | 165 pass + 16 skip | 35 files | |

Notable quality points:

- `request-otp.test.ts` "asunto y cuerpo del email provienen del renderer" tests behavioral coupling between the renderer port and `RequestOtp` (asserts `message.body === rendered.html` and `message.subject === rendered.subject`).
- `drain-email-sending.test.ts` mixes retryable/perm/success in one run, exercising the policy without enumerating permutations.
- `smtp-email-sender.test.ts` injects a structural-typed `SmtpTransporter` fake and inspects `transporter.calls[0]` to assert real observable behavior (no nodemailer mock).
- The snapshot in `packages/email/src/templates/__snapshots__/otp-email.test.ts.snap` is a non-trivial XHTML document (HTML attributes, body content); not a trivial empty golden.
- Coverage: no `bun test --coverage` was run because coverage is not in the cache capabilities and is informational only; the parent does not require it.

**Assertion quality: ✅ All assertions verify real behavior** (0 CRITICAL, 0 WARNING).

One minor cosmetic note (not a defect): the snapshot test prints Octane dev warnings about `cellPadding`/`cellSpacing` prop casing. Those are warning logs from the renderer's prop-passthrough heuristic; the snapshot still matches and the test passes. Future hardening could silence them by lowercasing the props, but this is non-blocking and outside the strict TDD scope.

## Review Workload / PR Boundary

| Metric | Value |
| --- | --- |
| Total insertions in `cf1cb59..HEAD` | 1621 |
| Total deletions in `cf1cb59..HEAD` | 54 |
| Files changed | 38 |
| 400-line budget | Exceeded (forecast 700–1100, real +1621) |
| Split | `apply-progress.md` documents the recommended 3-PR `stacked-to-main` split (PR1 packages/email+renderer+wiring / PR2 SMTP+selector+drain / PR3 compose+Makefile+env+spec deltas + integración Mailpit). 6 atomic commits `ab6ba60..3a762b6` preserve TDD traceability. |
| `size:exception` recorded | No. Delivery is `ask-on-risk` (no `exception-ok` inferred). |

**Verdict on workload**: WARNING — implementation respected the forecast ("Chained PRs recommended: Yes") and the parent's ask-on-risk strategy. This verify report does not re-decide delivery; it surfaces the budget status so the parent can decide between `stacked-to-main` (3 PRs) and `size:exception` (single PR) at archive time. Not a verification blocker.

## Blockers

None.

## Status consumed / produced

- **Consumed**: `applyState: all_done`, `taskProgress: 55/55`, `dependencies.verify: ready`, `nextRecommended: sdd-verify`, `actionContext.mode: repo-local`, `allowedEditRoots: [/run/media/enri/DISCO DURO/crm-home/crm]`.
- **Produced** (after parent settles): `verifyReport: done`, `requirements: 9/9`, `scenarios: 24/24`, `blockers: 0`, `critical_findings: 0`, `verdict: pass`. `dependencies.sync` will move from `blocked` → `ready` once this report is settled by the parent.

## Skill Resolution

`paths-injected` — phase work used the strict-TDD verify support file injected by the parent (`/home/enri/.pi/agent/gentle-ai/support/strict-tdd-verify.md`) and the status contract (`/home/enri/.pi/gentle-ai/support/sdd-status-contract.md`). No fallbacks triggered.

## Next Recommended

`sdd-sync` — delta specs (`api-auth`, `workspace`) are ready to be merged into canonical `openspec/specs/{api-auth,workspace}/spec.md` once the parent settles this verify report.

## Key Learnings

1. The `tsrx-tsc` toolchain emits `.tsrx` extensions in import paths that Bun cannot resolve at runtime, so `packages/email` switched to `vite` library-mode with the `octane/compiler/vite` plugin and an explicit `dist/index.d.ts` writer — this is the durable build strategy for any future `packages/*-email` work.
2. Draining the `email_sending` queue as a pure function (`drainEmailSending(deps)`) separable from the nitro `defineTask` wrapper made the retryable/non-retryable policy testable without booting nitro, and let the PII guard test live next to the policy it guards.
3. Mapping SMTP errors to a single `EmailSendError { retryable, cause }` shape is what made the drain's "leave pending vs mark failed" decision a one-line branch; without that type the drain would have needed a brittle string classifier.
4. PII guard in the drain is a structural test (`JSON.stringify(logs)` excludes `to`/`subject`/`body`), not a behavioral one — this is the cheapest assertion that prevents a future log helper from re-introducing PII by accident.
5. The spike-verification.md report is the load-bearing artifact that justified the `.tsrx` precompile-via-vite decision before any production `package.json` was committed; treating it as a phase deliverable (not an afterthought) is what kept `workspace` spec §2 honest.
