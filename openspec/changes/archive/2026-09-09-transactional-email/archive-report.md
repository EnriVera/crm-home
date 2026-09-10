# Archive Report — transactional-email

> Change: `transactional-email` · Repository:
> `/run/media/enri/DISCO DURO/crm-home/crm` · Branch: `develop` ·
> Archive date: 2026-09-09 · Artifact store: openspec

## Archive status

- **Status:** ✅ archived
- **Verification:** PASS (9/9 requirements, 24/24 scenarios, 0 blockers/criticals)
- **Implementation tasks:** 55/55 complete, 0 unchecked
- **Sync:** archive-time fallback completed successfully (`sync-report.md` presente)
- **Move target:** `openspec/changes/archive/2026-09-09-transactional-email/`

## Artifacts read

- [x] `openspec/changes/transactional-email/proposal.md`
- [x] `openspec/changes/transactional-email/design.md`
- [x] `openspec/changes/transactional-email/tasks.md`
- [x] `openspec/changes/transactional-email/apply-progress.md` (referenced; no editado)
- [x] `openspec/changes/transactional-email/verify-report.md`
- [x] `openspec/changes/transactional-email/specs/email/spec.md` (dominio nuevo)
- [x] `openspec/changes/transactional-email/specs/api-auth/spec.md` (delta)
- [x] `openspec/changes/transactional-email/specs/workspace/spec.md` (delta)
- [x] `openspec/changes/transactional-email/sync-report.md` (archive-time fallback)
- [x] `openspec/config.yaml`

## Dominios sincronizados a specs canónicas

| Dominio | Operación | Spec canónica |
| -------- | ----------- | ---------------- |
| `email` | NEW full spec | `openspec/specs/email/spec.md` |
| `api-auth` | 3 requirements MODIFIED (no-op: ya en sync semántico por los commits `6af90cc` y `ad30797` de apply) | `openspec/specs/api-auth/spec.md` |
| `workspace` | 1 requirement MODIFIED (`Verificación y pinning de versiones`) extendido con escenarios de email; 1 requirement MODIFIED (`Tooling de entorno`) ya en sync por commit `530bd22` | `openspec/specs/workspace/spec.md` |

## Requirement deltas aplicados

### ADDED (en canónica)

- `email` (dominio nuevo, 4 requirements):
  - Paquete @crm/email con plantillas .tsrx precompiladas a JS
  - Tooling de desarrollo y exportación con @octanejs/email-cli
  - Plantilla OTP con copy en español y fallback de texto plano
  - Snapshot del render de la plantilla OTP

### MODIFIED (en canónica)

- `api-auth`: Solicitud de OTP con rate-limit y encolado de email
- `api-auth`: Puerto EmailSender con adapters consola/SMTP y task de drenaje
- `api-auth`: Puertos de dominio y casos de uso puros para auth
- `workspace`: Verificación y pinning de versiones (bloqueante)
- `workspace`: Tooling de entorno (docker-compose, .env.example, .gitignore, Makefile)

### REMOVED

- Ninguno.

## Advertencias de active same-domain change

- Ninguna. `openspec/changes/` solo contiene `transactional-email/` y `archive/`.

## Final Task Completion Gate

- Re-leído `openspec/changes/transactional-email/tasks.md` inmediatamente
  antes de escribir `archive-report.md` y mover el change.
- 0 marcadores `- [ ]` de tareas de implementación.
- Native status: `taskProgress.total = 55`, `complete = 55`, `remaining = 0`,
  `unchecked = []`.
- No se requirió stale-checkbox reconciliation.

## Structured status y action context

- `artifactStore`: openspec
- `apply`: all_done (55/55)
- `verify`: ready / PASS (9/9, 24/24, 0 crit, 0 blockers)
- `sync`: blocked → ready (archive-time fallback ejecutado con aprobación)
- `archive`: ready → archived
- `actionContext.mode`: repo-local
- `allowedEditRoots`: `/run/media/enri/DISCO DURO/crm-home/crm`
- Todas las ediciones confinadas a `openspec/` (bookkeeping solamente).
- Native engine authoritative (`isNonAuthoritative: false`).

## Destructive merge guard

- Sin REMOVED requirements.
- Sin bloques MODIFIED grandes destructivos (sólo extensiones y reemplazos
  semánticamente equivalentes al delta).
- Aprobación de merge destructivo: no requerida más allá de la aprobación del
  parent para archive-time sync fallback.

## Decisiones y hechos de handoff (outrank stale snapshots)

- Implementación: 6 commits en develop (`ab6ba60..3a762b6`).
- Tests: `bun test` 165 pass / 0 fail / 16 skip (14 DB integration + 2 SMTP
  Mailpit, ambos opt-in). `bunx turbo typecheck` 6/6. Triangulación E2E
  contra Mailpit con HTML visible en :8025.
- Ports & adapters: ningún import de `@octanejs/email` ni `nodemailer` en
  `src/domain/` ni `src/application/` (verificado por grep en
  verify-report).
- PII guard: test estructural que asegura que `to`/`subject`/`body` nunca
  aparecen en logs serializados del drain.
- Decisiones de design D1–D6 resueltas:
  - D1 — `.tsrx` precompile vía `packages/email` vite lib-mode +
    `octane/compiler/vite`.
  - D2 — versiones `@octanejs/email@0.0.3`, `@octanejs/email-cli@0.0.3`,
    `nodemailer@6.10.1`, `@types/nodemailer@6.4.17` pinneadas tras
    `npm view` (reporte en `docs/transactional-email/spike-verification.md`).
  - D3 — `EmailMessage` extendida con `html?`/`text?` (delta MODIFIED sobre
    `api-auth` req 7); `body` obligatorio preserva back-compat.
  - D4 — Puerto de dominio `EmailTemplateRenderer` con `renderOtp({ code })`;
    adapter `OctaneEmailTemplateRenderer` en `src/infrastructure/email/`.
  - D5 — `createSmtpEmailSender` con `nodemailer@6.10.1` exacto, timeouts
    conservadores (`connectionTimeout: 5000`, `socketTimeout: 10000`),
    `pool: true`, `maxConnections: 2`. Mapeo de errores →
    `EmailSendError { retryable, cause }`; transitorio deja `pending`,
    permanente marca `failed`. Limitación conocida: sin contador de
    reintentos/backoff (dependencia de cron `*/1`).
  - D6 — `createEmailSelector(env)` selecciona SMTP (`SMTP_URL` trim) o
    consola; ningún archivo de dominio/aplicación toca el adapter.
  - Mailpit pineado: `axllent/mailpit:v1.24@sha256:3ad9483a...` en
    `docker-compose.yml`.
- Decisión de delivery registrada: chained PRs, stacked-to-main. PR slicing
  todavía PENDING (3 PRs por cluster WU; no parte de este archive).
- Follow-ups no bloqueantes:
  - Sin contador de reintentos/backoff (dependencia de cron `*/1` para
    retry).
  - Tamaño excede el budget de 400 líneas (1621 líneas; PR slicing diferido a
    settle/delivery posterior al archive).

## Notas

- `sync-report.md` no existía antes de este archive; el archive-time sync
  fallback fue ejecutado con aprobación explícita del parent/orchestrator.
- El commit `6af90cc` (apply de WU3) modificó directamente
  `openspec/specs/api-auth/spec.md`, y el commit `530bd22` (apply de WU5)
  modificó directamente `openspec/specs/workspace/spec.md`. Para archive,
  esto significa que dos de los tres MODIFIED deltas estaban ya en sync
  semántico en la canónica al inicio del archive; sólo se aplicó escritura
  nueva sobre la canónica `workspace/spec.md` para extender
  "Verificación y pinning de versiones (bloqueante)" con los escenarios de
  dependencias de email, y se creó `openspec/specs/email/spec.md` desde
  cero. Los marcadores `(Previously: ...)` del delta se omitieron de la
  canónica por convención del repo de no arrastrar metadatos de delta al
  estado estable.
- `pi-lens` Markdown cleaner aplicó formato automático a los archivos
  tocados (canónicas y reportes); el contenido semántico no cambió.
- Ningún archivo de `apps/` ni `packages/` fue editado, formateado o
  commiteado por esta fase de archive.

## Ruta archivada

```text
openspec/changes/transactional-email/
  -> openspec/changes/archive/2026-09-09-transactional-email/
```
