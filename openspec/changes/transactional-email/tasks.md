# SDD Tasks — transactional-email

## Review Workload Forecast

| Field | Value |
| ------- | ------- |
| Estimated changed lines | 700–1100 (nuevo paquete, ports/adapters, task, compose, specs, tests) |
| 400-line budget risk | High |
| Chained PRs recommended | Yes |
| Suggested split | PR 1: packages/email + renderer port + RequestOtp wiring → PR 2: SMTP adapter + selector + task drainage → PR 3: docker-compose/Makefile/env + spec deltas + integración Mailpit |
| Delivery strategy | ask-on-risk |
| Chain strategy | stacked-to-main |

Decision needed before apply: Yes
Chained PRs recommended: Yes
Chain strategy: stacked-to-main
400-line budget risk: High

## TDD Evidence Requirement

Cada work unit DEBE ejecutar el ciclo RED → GREEN → TRIANGULATE → REFACTOR.
Al finalizar la fase `implement` se debe crear/actualizar `apply-progress.md` en
`openspec/changes/transactional-email/` con una tabla de **TDD Cycle Evidence**
que incluya, por work unit:

| Work unit | RED (test/commit que falla) | GREEN (mínimo cambio que pasa) | TRIANGULATE (casos adicionales) | REFACTOR (limpieza) |
|-----------|-----------------------------|--------------------------------|---------------------------------|---------------------|

No se considera la fase apply completa sin esta tabla.

---

## Work Unit 1: Blocking spike — npm verification + .tsrx precompile + nodemailer×bun smoke test

**Objetivo:** Verificar que `@octanejs/email@0.0.3`, `@octanejs/email-cli`,
`octane@0.2.3` peer deps y `nodemailer` resuelven correctamente antes de
commitear cualquier `package.json`; validar que un `.tsrx` precompilado se puede
consumir desde `apps/api` bajo bun 1.4/nitro v3; validar envío SMTP real a
Mailpit con nodemailer. Si alguna verificación falla, se detiene y escala (spec
`workspace` delta).

**Criterios de aceptación del spike:**

- `npm view` confirma existencia y versiones exactas pineadas.
- Peer deps de `@octanejs/email` y `octane@0.2.3` son compatibles con React del workspace.
- El build de `packages/email` genera un artifact ESM importable desde Bun sin vite.
- La task de drenaje de nitro puede importar el artifact compilado.
- nodemailer envía un email vía `smtp://localhost:1025` y se ve en la UI de Mailpit.

### TDD cycle

- **RED:** Ejecutar `npm view` y el spike script base antes de tener la plantilla/build; registrar fallas esperadas (paquete no instalado, import no resuelto, SMTP no responde).
- **GREEN:** `npm view` devuelve metadatos válidos; instalación de prueba exitosa; build de plantilla mínima produce `dist/` consumible.
- **TRIANGULATE:** Probar consumo desde `apps/api` (script Bun y task nitro); probar envío real a Mailpit; verificar compatibilidad de peer deps con React/Octane.
- **REFACTOR:** Consolidar el spike en un reporte de verificación con versiones exactas a pinear; descartar artefactos temporales del spike.

### Tasks

- [x] Crear un directorio temporal de spike (fuera del árbol de producción) o usar un script ad-hoc que no modifique `package.json` de producción. <!-- sdd-owner: implementation -->
- [x] Ejecutar `npm view @octanejs/email@0.0.3`, `npm view @octanejs/email-cli@latest`, `npm view octane@0.2.3 peerDependencies` y `npm view nodemailer versions --json`; documentar versiones exactas y peer deps. <!-- sdd-owner: implementation -->
- [x] Crear provisionalmente `packages/email/package.json`, `packages/email/tsconfig.json`, `packages/email/src/index.ts` y `packages/email/src/templates/spike.tsrx` para probar el build Octane. <!-- sdd-owner: implementation -->
- [x] Ejecutar el script `build` de `packages/email` y verificar que el artifact compilado sea ESM importable por un script `bun` en `apps/api` sin pipeline vite ni registro runtime. <!-- sdd-owner: implementation -->
- [x] Levantar Mailpit (`make mail-up` o `docker compose up -d mailpit`) y ejecutar un script Bun que envíe un email por `smtp://localhost:1025` usando nodemailer; verificar que aparece en `http://localhost:8025`. <!-- sdd-owner: implementation -->
- [x] Probar que la task de drenaje de nitro (`apps/api/tasks/email-sending.ts`) puede importar el template compilado sin romper el bundle. <!-- sdd-owner: implementation -->
- [x] Si cualquier paso falla, detener el change, documentar el hallazgo en el reporte de spike y escalar al usuario; NO sustituir el stack silenciosamente. <!-- sdd-owner: implementation -->
- [x] Escribir el reporte `spike-verification.md` (o equivalente) con versiones pineadas, comandos ejecutados y resultado; este reporte alimenta los `package.json` de producción. <!-- sdd-owner: implementation -->

---

## Work Unit 2: Foundation — packages/email con plantilla OTP .tsrx

**Objetivo:** Crear el paquete `@crm/email`, la plantilla OTP en español, su
snapshot test, scripts de build/typecheck/export y asegurar que `turbo run build`
genere el artifact consumible por `apps/api`.

### TDD cycle

- **RED:** Escribir `packages/email/src/templates/otp-email.test.ts` que renderiza `OtpEmail({ code: "041283" })` y compara contra snapshot; falla porque el template no existe.
- **GREEN:** Crear `packages/email/package.json`, `tsconfig.json`, `src/index.ts`, `src/templates/otp-email.tsrx` y el script `build`; correr build y actualizar snapshot.
- **TRIANGULATE:** Añadir test de fallback de texto plano; añadir test de que el código conserva ceros a la izquierda; ejecutar `bun run typecheck` aislado.
- **REFACTOR:** Limpiar markup de la plantilla, extraer copy a constantes si aplica, validar que el script `export-templates.ts` funciona.

### Tasks

- [x] RED: Escribir `packages/email/src/templates/otp-email.test.ts` que importe `OtpEmail` desde `src/index.ts`, lo renderice con `render()` de `@octanejs/email` y falle por archivos inexistentes. <!-- sdd-owner: implementation -->
- [x] RED: Escribir `packages/email/package.json` con scripts `build`, `typecheck`, `test`, `export`; declarar `@octanejs/email` y `@octanejs/email-cli` con versiones exactas del spike. <!-- sdd-owner: implementation -->
- [x] GREEN: Crear `packages/email/tsconfig.json` extendiendo `@crm/tsconfig/base.json` (o una variante server si aplica). <!-- sdd-owner: implementation -->
- [x] GREEN: Crear `packages/email/src/index.ts` que re-exporte `OtpEmail`. <!-- sdd-owner: implementation -->
- [x] GREEN: Crear `packages/email/src/templates/otp-email.tsrx` con asunto "Tu código de acceso", código destacado, expiración de 10 minutos y disclaimer "Si no lo solicitaste, ignorá este mensaje.". <!-- sdd-owner: implementation -->
- [x] GREEN: Implementar `packages/email/scripts/export-templates.ts` como wrapper sobre `@octanejs/email-cli`. <!-- sdd-owner: implementation -->
- [x] GREEN: Ejecutar `bun run build` en `packages/email` y generar el snapshot del render. <!-- sdd-owner: implementation -->
- [x] TRIANGULATE: Añadir test del fallback de texto plano (`text` alternativo) en `packages/email/src/templates/otp-email.test.ts`. <!-- sdd-owner: implementation -->
- [x] TRIANGULATE: Verificar que `turbo run build` en raíz construye `@crm/email` antes que `@crm/api` y que `apps/api` puede importar `@crm/email`. <!-- sdd-owner: implementation -->
- [x] REFACTOR: Limpiar la plantilla, revisar estilos/copia y asegurar que `bun run typecheck` pase en `packages/email`. <!-- sdd-owner: implementation -->

---

## Work Unit 3: Renderer port + delta EmailMessage + wiring en RequestOtp

**Objetivo:** Definir el puerto de dominio `EmailTemplateRenderer`, extender
`EmailMessage` con `html?`/`text?` (delta MODIFIED spec `api-auth` req 7),
inyectar el renderer en `RequestOtp` y cablear el adapter Octane en el
composition root.

### TDD cycle

- **RED:** Escribir `apps/api/src/domain/ports/email-template-renderer.ts`; actualizar `request-otp.test.ts` para inyectar `FakeEmailTemplateRenderer` y fallar porque `RequestOtp` no lo acepta.
- **GREEN:** Extender `EmailMessage` en `apps/api/src/domain/ports/email-sender.ts`; modificar `RequestOtp` para llamar `renderOtp({ code })` y persistir `subject`/`html`; crear `apps/api/src/infrastructure/email/octane-email-template-renderer.ts`; cablear en `apps/api/src/http/composition-root.ts`.
- **TRIANGULATE:** Añadir test de `octane-email-template-renderer.test.ts` con fake de `render()` y con render real; añadir test de que `RequestOtp` usa el `subject` devuelto.
- **REFACTOR:** Asegurar que ningún archivo de `src/domain/` ni `src/application/` importe `@octanejs/email`; validar que el adapter vive solo en infraestructura.

### Tasks

- [x] RED: Crear `apps/api/src/domain/ports/email-template-renderer.ts` con `RenderedEmail` y `EmailTemplateRenderer`. <!-- sdd-owner: implementation -->
- [x] RED: Modificar `apps/api/src/domain/ports/email-sender.ts` añadiendo `html?: string` y `text?: string` manteniendo `body` obligatorio. <!-- sdd-owner: implementation -->
- [x] RED: Actualizar `apps/api/src/application/auth/request-otp.test.ts` para inyectar `FakeEmailTemplateRenderer` y assertar que `body` y `subject` provienen del renderer. <!-- sdd-owner: implementation -->
- [x] GREEN: Actualizar `apps/api/src/application/auth/request-otp.ts`: añadir `emailTemplateRenderer` a dependencias, invocar `renderOtp({ code })` y persistir `subject`/`html`. <!-- sdd-owner: implementation -->
- [x] GREEN: Crear `apps/api/src/infrastructure/email/octane-email-template-renderer.ts` que importe `OtpEmail` desde `@crm/email`, llame a `render()` y devuelva `{ subject, html, text }`. <!-- sdd-owner: implementation -->
- [x] GREEN: Actualizar `apps/api/src/http/composition-root.ts` para construir el renderer y pasarlo a `RequestOtp`; extender `AppEnv` con `SMTP_URL*` si aplica. <!-- sdd-owner: implementation -->
- [x] GREEN: Actualizar `openspec/specs/api-auth/spec.md` con el requirement 7 MODIFIED y sus scenarios (firma extendida, renderer inyectado, proveedor enchufable). <!-- sdd-owner: implementation -->
- [x] TRIANGULATE: Escribir `apps/api/src/infrastructure/email/octane-email-template-renderer.test.ts` con fake de render y con render real. <!-- sdd-owner: implementation -->
- [x] TRIANGULATE: Añadir test en `request-otp.test.ts` de que el HTML renderizado (con markup) se persiste en `body`. <!-- sdd-owner: implementation -->
- [x] REFACTOR: Revisar imports; confirmar que `src/domain/` y `src/application/` no importan `@octanejs/email`. <!-- sdd-owner: implementation -->

---

## Work Unit 4: SMTP adapter + selector por env + task de drenaje

**Objetivo:** Implementar `createSmtpEmailSender` con nodemailer, mapeo de errores
retryable/no-retryable, parser de `SMTP_URL`, factory `createEmailSender(env)` y
actualizar `apps/api/tasks/email-sending.ts` para usar el selector y respetar la
semántica de reintento.

### TDD cycle

- **RED:** Escribir `apps/api/src/infrastructure/email/email-send-error.ts`, `parse-smtp-url.ts` y sus tests; escribir `smtp-email-sender.test.ts` con transporte fake inyectado; fallan.
- **GREEN:** Implementar `smtp-email-sender.ts` con nodemailer, timeouts conservadores, `pool: true`, mapeo de errores a `EmailSendError` retryable.
- **TRIANGULATE:** Añadir tests para error 4xx (retryable), 5xx (no retryable), `ECONNREFUSED` (retryable), envío con `html` y `text`.
- **RED:** Escribir `create-email-sender.test.ts` esperando consola sin `SMTP_URL` y SMTP con `SMTP_URL`.
- **GREEN:** Implementar `create-email-sender.ts`.
- **GREEN:** Actualizar `apps/api/tasks/email-sending.ts` para usar `createEmailSender(process.env)`; dejar pending en errores retryable; marcar failed en errores no retryable u otros.
- **REFACTOR:** Consolidar tipos de env (`EmailSenderEnv`), extraer helpers de error mapping, evitar logs con PII.

### Tasks

- [x] RED: Crear `apps/api/src/infrastructure/email/email-send-error.ts` con `retryable: boolean`. <!-- sdd-owner: implementation -->
- [x] RED: Crear `apps/api/src/infrastructure/email/parse-smtp-url.ts` y `parse-smtp-url.test.ts` (o test dentro del mismo archivo) con casos válidos e inválidos. <!-- sdd-owner: implementation -->
- [x] RED: Crear `apps/api/src/infrastructure/email/smtp-email-sender.test.ts` con un transporte nodemailer fake; testear envío y errores. <!-- sdd-owner: implementation -->
- [x] GREEN: Crear `apps/api/src/infrastructure/email/smtp-email-sender.ts` usando nodemailer pinneado, `pool: true`, `maxConnections: 2`, timeouts, y mapeo de errores retryable. <!-- sdd-owner: implementation -->
- [x] RED: Crear `apps/api/src/infrastructure/email/create-email-sender.test.ts` testeando selector por env. <!-- sdd-owner: implementation -->
- [x] GREEN: Crear `apps/api/src/infrastructure/email/create-email-sender.ts` con firma `createEmailSender(env)` que devuelva SMTP o consola. <!-- sdd-owner: implementation -->
- [x] GREEN: Actualizar `apps/api/tasks/email-sending.ts` para importar `createEmailSender`, instanciarlo con `process.env`, y manejar `EmailSendError` (retryable → pending; no retryable → failed). <!-- sdd-owner: implementation -->
- [x] TRIANGULATE: Añadir tests de error `ECONNREFUSED`, respuesta SMTP 4xx, respuesta SMTP 5xx y envío multipart con `html` + `text`. <!-- sdd-owner: implementation -->
- [x] TRIANGULATE: Añadir test de `createEmailSender` con `SMTP_URL=""` (vacía) → consola. <!-- sdd-owner: implementation -->
- [x] REFACTOR: Consolidar `EmailSenderEnv` en un solo tipo, revisar que no se loguee `to`/`subject`/`body`, y verificar coverage básica. <!-- sdd-owner: implementation -->

---

## Work Unit 5: Docker-compose + Makefile + .env.example + spec deltas workspace

**Objetivo:** Añadir Mailpit a `docker-compose.yml`, targets al `Makefile`,
documentar `SMTP_URL` en `.env.example` y aplicar el delta MODIFIED en la spec
`workspace`.

### TDD cycle

- **RED:** Ejecutar `docker compose config` tras añadir el servicio `mailpit`; fallará hasta que la config sea válida.
- **GREEN:** Añadir servicio `mailpit` con imagen pinneada (`axllent/mailpit`), puertos `1025:1025` y `8025:8025`, y variables de auth-any/insecure.
- **GREEN:** Añadir targets `mail-up` y `up` al `Makefile`; mantener `db-up` solo postgres.
- **GREEN:** Añadir `SMTP_URL` (opcional) a `.env.example` con comentario explicativo.
- **TRIANGULATE:** Ejecutar `make mail-up` y verificar UI/SMTP; ejecutar `make up` y verificar postgres + mailpit.
- **REFACTOR:** Documentar en Makefile/.env.example cómo cambiar puertos vía compose override; actualizar `openspec/specs/workspace/spec.md` con el requirement MODIFIED.

### Tasks

- [x] RED: Preparar cambio en `docker-compose.yml` y ejecutar `docker compose config` para validar sintaxis antes de levantar. <!-- sdd-owner: implementation -->
- [x] GREEN: Añadir servicio `mailpit` a `docker-compose.yml` con imagen `axllent/mailpit:<pinneada>`, puertos 1025/8025, `MP_SMTP_AUTH_ACCEPT_ANY: 1` y `MP_SMTP_AUTH_ALLOW_INSECURE: 1`. <!-- sdd-owner: implementation -->
- [x] GREEN: Añadir target `mail-up` a `Makefile` que levante solo Mailpit. <!-- sdd-owner: implementation -->
- [x] GREEN: Añadir/actualizar target `up` a `Makefile` que levante postgres + mailpit. <!-- sdd-owner: implementation -->
- [x] GREEN: Añadir `SMTP_URL=smtp://localhost:1025` (comentado u opcional) a `.env.example` junto con documentación de fallback a consola. <!-- sdd-owner: implementation -->
- [x] GREEN: Actualizar `openspec/specs/workspace/spec.md` con el requirement MODIFIED de tooling de entorno y verificación de versiones. <!-- sdd-owner: implementation -->
- [x] TRIANGULATE: Ejecutar `make mail-up` y comprobar que `http://localhost:8025` responde y SMTP en `localhost:1025` acepta conexiones. <!-- sdd-owner: implementation -->
- [x] TRIANGULATE: Ejecutar `make up` y verificar que postgres y mailpit están healthy. <!-- sdd-owner: implementation -->
- [x] REFACTOR: Añadir comentarios en Makefile/.env.example sobre override de puertos y configuración de Mailpit. <!-- sdd-owner: implementation -->

---

## Work Unit 6: Integración Mailpit + verificación final

**Objetivo:** Ejecutar smoke test end-to-end (requestOtp → task de drenaje →
Mailpit), asegurar `bun test` verde en raíz y preparar `apply-progress.md`.

### TDD cycle

- **RED:** Escribir `apps/api/src/infrastructure/email/smtp-email-sender.integration.test.ts` que se salta si no hay `TEST_SMTP_URL`; inicialmente falla al no tener Mailpit.
- **GREEN:** Con Mailpit levantado, el test envía un email real y pasa.
- **TRIANGULATE:** Ejecutar flujo OTP completo: llamar endpoint `requestOtp`, correr task `email-sending`, verificar email en UI de Mailpit.
- **REFACTOR:** Revisar conteo de líneas cambiadas; si un PR excede ~400 líneas, aplicar el split recomendado en la sección de Review Workload Forecast.

### Tasks

- [x] RED: Crear `apps/api/src/infrastructure/email/smtp-email-sender.integration.test.ts` que se ejecute solo si `TEST_SMTP_URL` o `SMTP_URL` apunta a localhost:1025 y Mailpit responde. <!-- sdd-owner: implementation -->
- [x] GREEN: Levantar Mailpit (`make mail-up`) y ejecutar el integration test; confirmar que el email llega visible a `http://localhost:8025`. <!-- sdd-owner: implementation -->
- [x] GREEN: Ejecutar `bun test` en la raíz del workspace y verificar que todos los tests pasan. <!-- sdd-owner: implementation -->
- [x] GREEN: Ejecutar `bun run typecheck` en la raíz del workspace y verificar que no hay errores. <!-- sdd-owner: implementation -->
- [x] TRIANGULATE: Ejecutar flujo OTP end-to-end con base de datos y Mailpit: llamar RPC `requestOtp`, correr `nitro task run email-sending`, verificar email HTML en Mailpit. <!-- sdd-owner: implementation -->
- [x] TRIANGULATE: Ejecutar el mismo flujo sin `SMTP_URL` configurada y verificar que el adapter consola sigue funcionando (sin regresión). <!-- sdd-owner: implementation -->
- [x] REFACTOR: Medir líneas cambiadas (`git diff --stat`) y decidir, según presupuesto de 400 líneas, si se entrega como PRs encadenados siguiendo el split sugerido. <!-- sdd-owner: implementation -->
- [x] REFACTOR: Crear/actualizar `openspec/changes/transactional-email/apply-progress.md` con la tabla de TDD Cycle Evidence por work unit. <!-- sdd-owner: implementation -->

---

## Rollback plan rápido

- Sin `SMTP_URL`, el selector `createEmailSender` cae al adapter consola: comportamiento actual preservado.
- Si el render de plantillas falla en producción, revertir `RequestOtp` a composición inline de texto plano y quitar el renderer del composition root.
- Si `packages/email` causa problemas de build, eliminar el paquete y su dependencia en `apps/api/package.json`.
- Mailpit es un servicio independiente; `db-up`/`db-down` no se ven afectados por su presencia/ausencia.
