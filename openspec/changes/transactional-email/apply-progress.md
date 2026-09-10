# SDD Apply Progress — transactional-email

> Tracking del ciclo RED → GREEN → TRIANGULATE → REFACTOR por work unit, con
> evidencia reproducible (commits, comandos, conteos). Este archivo vive en el
> directorio del change (`openspec/changes/transactional-email/`) y queda
> **untracked** mientras el intento de apply sigue abierto; el padre lo commitea
> tras `sdd-attempt settle` para no consumir presupuesto del intento.

## Resumen ejecutivo

- **Estado apply:** ready (todos los tasks de implementación completados).
- **Work units completados:** 6/6 (WU1 spike → WU6 integración + verificación).
- **Tests al cierre (HEAD + untracked):** `165 pass / 14 skip / 0 fail` (36
  suites, 737 expect() calls, 1 snapshot) en modo consola; `167 pass /
  14 skip / 0 fail` cuando `SMTP_URL` apunta a Mailpit local.
- **Typecheck:** `bun run typecheck` (turbo) — 6/6 paquetes successful.
- **Triangulate E2E con Mailpit:** insercción de `email_sending` pending →
  drain via `drainEmailSending` → SMTP via nodemailer → email visible en la
  UI de Mailpit con HTML y destinatario correctos.
- **Regresión consola:** sin `SMTP_URL`, el selector cae al adapter consola
  (`kind: console`) y el log del drain incluye el payload (sin tocar SMTP).
- **Ports & adapters:** `src/domain/` y `src/application/` no importan
  `@octanejs/email`, `nodemailer`, ni el adapter concreto; el wiring vive en
  `src/infrastructure/email/` y `src/http/composition-root.ts`.
- **PII en logs:** los logs del drenador solo registran `id` y `errorName`;
  un test dedicado (`drain-email-sending.test.ts`) verifica que ningún log
  contiene `to`, `subject` ni `body` (PRD §9).

## TDD Cycle Evidence

| WU | RED (test/commit que falla) | GREEN (mínimo cambio que pasa) | TRIANGULATE (casos adicionales) | REFACTOR (limpieza) |
| ---- | ----------------------------- | -------------------------------- | --------------------------------- | --------------------- |
| WU1 spike (`ab6ba60`) | `npm view` documentando ausencia/incompatibilidad esperada de paquetes Octane; script Bun de smoke sin `@crm/email` instalado. | `npm view @octanejs/email@0.0.3` y `@octanejs/email-cli@0.0.3` confirman versiones exactas; spike envía email real a Mailpit vía `smtp://localhost:1025` con `nodemailer`. | Compatibilidad de peer deps con React del workspace; render `.tsrx` precompilado importable desde script Bun; task nitro importa el template compilado. | `docs/transactional-email/spike-verification.md` con versiones exactas a pinear; cleanup de artefactos temporales. |
| WU2 foundation (`538873d`) | `packages/email/src/templates/otp-email.test.ts` falla porque `OtpEmail` y el snapshot no existen; `package.json` sin scripts build/typecheck/test/export. | `OtpEmail` `.tsrx` con copy en español, snapshot golden del render, `build` (vite) produce `dist/index.js`, `typecheck` (tsrx-tsc), `test`, `export` (octane-email-cli). | Fallback de texto plano (`getOtpEmailText`); preservación de ceros a la izquierda (`code: "041283"`); turbo respeta `^build` antes de `apps/api` build. | Limpieza del markup, copy en constantes (`OTP_EMAIL_SUBJECT`), wrapper `export-templates.ts`. |
| WU3 renderer (`6af90cc`) | `apps/api/src/domain/ports/email-template-renderer.ts` creado pero `RequestOtp` aún no lo inyecta; `request-otp.test.ts` falla al pasar `FakeEmailTemplateRenderer`. | `RequestOtp` invoca `renderOtp({ code })` y persiste `subject`/`html`; `EmailMessage` extendida con `html?`/`text?`; `OctaneEmailTemplateRenderer` en infra; `composition-root.ts` lo inyecta. | `octane-email-template-renderer.test.ts` con fake y render real (verifica disclaimer); test en `request-otp.test.ts` del HTML renderizado persistido en `body`. | Verificación de imports: `src/domain/` y `src/application/` sin `@octanejs/email`; adapter y composition root en infra/http. |
| WU4 SMTP (`ad30797`) | `email-send-error.ts`, `parse-smtp-url.ts`, `smtp-email-sender.test.ts`, `create-email-sender.test.ts` fallan por archivos inexistentes (módulos no resueltos). | `smtp-email-sender.ts` con `nodemailer@6.10.1` + `@types/nodemailer@6.4.17` pinneados, `pool: true`, `maxConnections: 2`, timeouts 5/5/10s; `create-email-sender.ts` con selector por `SMTP_URL` (trim) y `kind: "smtp" \| "console"`; `tasks/email-sending.ts` usa selector y maneja `EmailSendError` (retryable → pending, otros → failed). | Errores `ECONNREFUSED`/`ETIMEDOUT`/4xx (retryable), 5xx (no retryable), unknown (no retryable), multipart `html+text`, html-only, `SMTP_URL=""` → consola, `SMTP_URL="   "` → consola. | `EmailSenderEnv` consolidado en `create-email-sender.ts`; `drainEmailSending` extraído de la task para testear política de reintento; tests dedicados confirman ausencia de PII en logs. |
| WU5 docker (`530bd22`) | `docker compose config` con servicio `mailpit` agregado y digest pineado (`axllent/mailpit:v1.24@sha256:3ad9483a...`); sintaxis validada. | Servicio `mailpit` con puertos `1025:1025`/`8025:8025`, `MP_SMTP_AUTH_ACCEPT_ANY=1`, `MP_SMTP_AUTH_ALLOW_INSECURE=1`, healthcheck UI; targets `mail-up`/`mail-down`/`up`/`down`; `db-up` mantiene contrato postgres-only; `SMTP_URL=smtp://localhost:1025` documentado (comentado) en `.env.example`; spec `workspace` MODIFIED con escenarios nuevos. | `make mail-up` → `healthy`; `curl http://localhost:8025/` → 200 (776 bytes); banner SMTP `220 Mailpit ESMTP Service ready`; `make up` → `postgres` + `mailpit` healthy juntos. | Comentarios en `Makefile` y `.env.example` sobre override de puertos (`docker-compose.override.yml`, no versionado); spec canónica actualizada. |
| WU6 integración (`3a762b6`) | `smtp-email-sender.integration.test.ts` se salta si no hay Mailpit; en entorno sin `TEST_SMTP_URL` no se ejecuta (no es un fail). | Con `SMTP_URL=smtp://localhost:1025` y Mailpit healthy, el test envía email real y aparece en `/api/v1/messages`; cleanup vía `DELETE /api/v1/messages/{ID}`. | Multipart: además del envío simple, test dedicado verifica que `/api/v1/message/{ID}` expone `HTML` con markup y `Text` con el cuerpo plano. | Verificación final: `bun test` (167/0/0 con SMTP, 165/0/0 sin), `bun run typecheck` 6/6, triangulate E2E end-to-end (insert pending → drain → Mailpit HTML), regresión consola (sin SMTP_URL sigue funcionando). |

## Comandos ejecutados (evidencia reproducible)

| WU | Comando | Resultado |
| ---- | --------- | ----------- |
| WU1 | `npm view @octanejs/email@0.0.3`, `@octanejs/email-cli@0.0.3`, `octane@0.2.3 peerDependencies`, `nodemailer versions --json` | versiones exactas documentadas en `docs/transactional-email/spike-verification.md` |
| WU1 | script Bun con `nodemailer` contra `smtp://localhost:1025` | email visible en UI Mailpit (WU1 healthy spike container) |
| WU2 | `bun --filter @crm/email run build` | `dist/index.js` + `dist/index.d.ts` escritos |
| WU2 | `bun --filter @crm/email run typecheck` | exit 0 |
| WU2 | `bun --filter @crm/email test` | snapshot verde |
| WU3 | `bun --filter @crm/api test src/application/auth/request-otp.test.ts` | 5/5 verde con `FakeEmailTemplateRenderer` |
| WU3 | `bun --filter @crm/api test src/infrastructure/email/octane-email-template-renderer.test.ts` | 2/2 verde (fake + render real) |
| WU4 | `bun install` tras pinear `nodemailer@6.10.1` + `@types/nodemailer@6.4.17` | `bun.lock` actualizado |
| WU4 | `bun test apps/api/src/infrastructure/email/` | 30/30 verde |
| WU4 | `bun test` (raíz) | 165 pass / 14 skip / 0 fail |
| WU4 | `bun run typecheck` | 6/6 paquetes successful |
| WU5 | `docker compose config` | servicios `postgres` + `mailpit`, digest preservado |
| WU5 | `make mail-up` | `Container crm-home-mailpit Started`, healthy |
| WU5 | `curl http://localhost:8025/` | HTTP 200 (776 bytes) |
| WU5 | `bash -c 'exec 3<>/dev/tcp/localhost/1025; cat <&3 & cat >&3'` | banner `220 Mailpit ESMTP Service ready` |
| WU5 | `make up` | `postgres` + `mailpit` healthy juntos |
| WU6 | `SMTP_URL=smtp://localhost:1025 bun test apps/api/src/infrastructure/email/smtp-email-sender.integration.test.ts` | 2/2 verde |
| WU6 | `SMTP_URL=smtp://localhost:1025 bun test` | 167 pass / 14 skip / 0 fail |
| WU6 | `bun run typecheck` | 6/6 paquetes successful |
| WU6 | Triangulate E2E (script `/tmp/e2e-drain.ts`): insert `email_sending` pending → `drainEmailSending` → Mailpit | `processed: 1, sent: 1`; HTML contiene el stamp; `to` correcto |
| WU6 | Regresión consola (script `/tmp/e2e-console.ts`): mismo drain con `createEmailSender({})` | `kind: "console"`, `sent: 1`, log contiene el payload, sin tocar SMTP |

## Archivos cambiados (consolidado `cf1cb59..HEAD`)

```diff
 .env.example                                       |   7 +
 Makefile                                           |  36 ++-
 apps/api/package.json                              |   3 +
 apps/api/src/application/auth/request-otp.test.ts  |  50 +++++
 apps/api/src/application/auth/request-otp.ts       |   8 +-
 apps/api/src/domain/ports/email-sender.ts          |   2 +
 apps/api/src/domain/ports/email-template-renderer.ts |   9 +
 apps/api/src/http/composition-root.ts              |  10 +
 apps/api/src/infrastructure/email/create-email-sender.test.ts |  45 ++++
 apps/api/src/infrastructure/email/create-email-sender.ts |  53 +++++
 apps/api/src/infrastructure/email/drain-email-sending.test.ts | 243 +++++++++++++++++++++
 apps/api/src/infrastructure/email/drain-email-sending.ts |  91 ++++++++
 apps/api/src/infrastructure/email/email-send-error.ts |  10 +
 apps/api/src/infrastructure/email/octane-email-template-renderer.test.ts |  31 +++
 apps/api/src/infrastructure/email/octane-email-template-renderer.ts |  29 +++
 apps/api/src/infrastructure/email/parse-smtp-url.test.ts |  51 +++++
 apps/api/src/infrastructure/email/parse-smtp-url.ts |  51 +++++
 apps/api/src/infrastructure/email/smtp-email-sender.test.ts | 219 +++++++++++++++++++
 apps/api/src/infrastructure/email/smtp-email-sender.ts | 138 ++++++++++++
 apps/api/src/infrastructure/email/smtp-email-sender.integration.test.ts | 173 +++++++++++++++
 apps/api/tasks/email-sending.ts                    |  45 ++--
 bun.lock                                           |  37 ++++
 docker-compose.yml                                 |  20 ++
 docs/transactional-email/spike-verification.md     | 115 ++++++++++
 openspec/specs/api-auth/spec.md                    |  90 ++++++--
 openspec/specs/workspace/spec.md                   |  30 ++-
 packages/email/package.json                        |  28 +++
 packages/email/scripts/export-templates.ts         |   9 +
 packages/email/scripts/write-types.ts              |  15 ++
 packages/email/src/index.ts                        |   7 +
 packages/email/src/otp-email.ts                    |  29 +++
 packages/email/src/templates/__snapshots__/otp-email.test.ts.snap |   3 +
 packages/email/src/templates/otp-email.test.ts     |  32 +++
 packages/email/src/templates/otp-email.tsrx        |  53 +++++
 packages/email/src/types/octane-email.d.ts         |  29 +++
 packages/email/src/types/tsrx.d.ts                 |   4 +
 packages/email/tsconfig.json                       |  11 +
 packages/email/tsconfig.typecheck.json             |  14 ++
 packages/email/vite.config.ts                      |  18 ++
 38 files changed, 1621 insertions(+), 54 deletions(-)
```

## Commits del change (ordenados)

```text
3a762b6 test(api): mailpit integration test for smtp-email-sender     (WU6, +173)
530bd22 chore(workspace): mailpit compose, mail targets and SMTP_URL env (WU5, +84/-9)
ad30797 feat(api): smtp adapter, env selector and retry-aware drain task (WU4, +932/-22)
6af90cc feat(api): wire EmailTemplateRenderer port into RequestOtp    (WU3)
538873d feat(email): add OTP template, build tooling and tests        (WU2)
ab6ba60 feat(email): add packages/email spike and verification report  (WU1)
```

## Desviaciones del design

- **No se añadió `EmailSenderEnv` separado en la task**: se reutiliza
  `EmailSenderEnv` desde `create-email-sender.ts` (es la única fuente de verdad).
  El design tenía dos definiciones conceptuales; consolidarlas evita drift.
- **Drain extraído como función pura**: la spec menciona la task de nitro como
  punto de integración, pero para testear la política de reintento sin nitro se
  extrajo `drainEmailSending(deps)` y la task solo hace wiring + delegate. Esto
  preserva el contrato observable y mejora la cobertura.
- **`apps/api/tasks/email-sending.ts` ya no destruye la DB en caso de error**:
  se simplificó para usar `db.destroy()` en happy path y se documenta que en
  flujos con SMTP_URL+errores el mensaje queda en `pending` (no se rompe la
  transacción). No hay cambio de comportamiento observable para `RequestOtp`.

## Remaining tasks

- `- [x]` para todos los checkboxes `<!-- sdd-owner: implementation -->` del
  change. 0 tasks de implementación pendientes.

## Workload / PR boundary

| Métrica | Valor |
| --------- | ------- |
| Total líneas añadidas | 1621 |
| Total líneas borradas | 54 |
| Archivos cambiados | 38 |
| Budget 400 líneas | excedido (forecast tasks.md: 700-1100; real +1621) |
| `Decision needed before apply` | Yes (ask-on-risk) |
| `Chained PRs recommended` en tasks.md | Yes (`stacked-to-main`) |
| Split sugerido en tasks.md | PR1 packages/email+renderer+wiring / PR2 SMTP adapter+selector+drain / PR3 compose+Makefile+env+spec deltas + integración Mailpit |

La distribución por commit se acerca al split sugerido (PR1=WU1-WU3,
PR2=WU4, PR3=WU5-WU6), pero `ad30797` (WU4) por sí solo son 932 insertions en
12 archivos, muy por encima del budget. Recomendación:

- **Mantener los 6 commits tal cual** (el historial atómico preserva la
  trazabilidad TDD y simplifica el rebase).
- **Entregar como 3 PRs stacked-to-main**, alineados con el split sugerido en
  tasks.md §Review Workload Forecast.
- Si la política de merge prefiere 1 PR por branch de release, **recomendar
  `size:exception`** al mantenedor con justificación (cambio fundacional:
  paquetes nuevos + spec deltas + tooling, divisible solo en costuras
  gruesas).

## Status consumido/producido

- **Status consumido (parent-recovered, authoritative):** `applyState: ready`,
  `artifactStore: openspec`, `nextRecommended: sdd-apply`, `28/55` implement
  tasks complete al inicio del resume (28 cerrados en WU1-WU3; tras WU4-WU6
  son 55/55).
- **Status que se devuelve al padre:** `applyState: ready`, `dependencies.verify:
  ready`, `nextRecommended: sdd-verify`. La fase `sdd-apply` no modifica el
  JSON nativo; el padre relee `openspec/changes/transactional-email/tasks.md`
  para confirmar 0 unchecked implementation tasks.
- **`actionContext` warnings:** ninguno; `allowedEditRoots` cubre todo el
  workspace del cambio.

## Riesgos residuales

- **Limitación conocida (D5):** no hay contador de reintentos ni backoff para
  mensajes que quedan `pending` por errores retryable; documentado en design.
- **Mailpit `MP_SMTP_AUTH_ACCEPT_ANY=1` y `MP_SMTP_AUTH_ALLOW_INSECURE=1` son
  aceptables solo en dev local**; no se promueve a staging/prod.
- **Imagen pineada por digest (v1.24):** se documenta en docker-compose para
  reproducibilidad; upgrade requiere pull explícito y bump del digest.
- **`octane-email` no se usa en runtime de `apps/api`**: el render se hace en
  `packages/email` durante build y `apps/api` consume el artifact precompilado,
  evitando bundling de `.tsrx` dentro de nitro.
