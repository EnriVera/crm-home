# Propuesta — transactional-email

> Fundación de email transaccional: plantillas como componentes Octane `.tsrx`
> renderizadas server-side con `@octanejs/email`, envío por adapter SMTP tras el
> puerto `EmailSender` existente, y Mailpit en docker-compose como catch-all de
> desarrollo. Primera plantilla: email OTP de auth.

## 1. Intención

Hoy el pipeline de email de `apps/api` (backend-auth) encola mensajes en
`email_sending` y los "envía" con un adapter de consola: el código OTP se loguea
a stdout y el cuerpo es texto plano compuesto inline en `RequestOtp`. No existe
renderizado de plantillas, ni envío SMTP real, ni bandeja de inspección en
desarrollo.

Este change entrega la fundación mínima y real de email transaccional:

1. **Plantillas como componentes** `.tsrx` en un nuevo paquete compartido
   `packages/email`, con preview/export vía `@octanejs/email-cli`.
2. **Render server-side en enqueue-time** a través de un puerto de render nuevo
   inyectado en `RequestOtp` (el HTML compuesto se persiste en `emse_body`, sin
   migración de schema).
3. **Envío real por SMTP** con un adapter nuevo tras el puerto `EmailSender`,
   seleccionado automáticamente por env (`SMTP_URL` presente → SMTP; si no,
   consola).
4. **Mailpit en docker-compose** como servidor SMTP de desarrollo (catch-all,
   SMTP :1025, UI web :8025).

No es objetivo construir un sistema de plantillas genérico multi-email: el
único email de este change es el OTP de auth. La fundación (puerto de render,
selector de adapter, paquete) queda lista para plantillas futuras.

## 2. Decisiones de producto confirmadas (orchestrator, no re-preguntar)

1. Sin research lane (explore cubrió los hechos de repo y npm).
2. Plantillas en NUEVO paquete compartido `packages/email` (Octane `.tsrx` vía
   `@octanejs/email@0.0.3` + `@octanejs/email-cli`).
3. Cadena de adapters conmuta por env: SMTP (Mailpit) si hay config SMTP;
   adapter consola en caso contrario.
4. SMTP de dev = servicio Mailpit en docker-compose (SMTP :1025, UI :8025).
5. Primera plantilla: email OTP de auth (copy en español, `language_ui: es`).

## 3. Alcance

### Dentro

- **`packages/email`** (nuevo, `@crm/email`): espejo de convenciones de
  `packages/types` (private, ESM, `workspace:*`) + tooling tsrx propio
  (`tsrx-tsc` para typecheck; estrategia de compilación para consumo server
  decidida en design, flag D1). Contiene la plantilla OTP `.tsrx`.
- **Puerto de render nuevo** en `apps/api/src/domain/ports/` (p. ej.
  `EmailTemplateRenderer` con `renderOtp({ code })`) + adapter en
  `src/infrastructure/email/` que usa `@octanejs/email` sobre `@crm/email`.
  Inyectado en `RequestOtp` vía composition root.
- **Adapter SMTP nuevo** (`createSmtpEmailSender`, candidato nodemailer —
  pendiente de verificación npm + smoke test, flag D5) y **factory/selector por
  env** `createEmailSender(env)` consumido por la task de drenaje de nitro
  (hoy autónoma fuera del composition root, flag D6).
- **Firma del mensaje**: soporte HTML en `EmailMessage` — MODIFIED delta sobre
  el Requirement 7 de la spec canónica `api-auth` (la firma
  `send({from,to,subject,body})` está fijada canónicamente; añadir
  `html?`/`text?` o redefinir `body` como HTML exige delta explícito, flag D3).
- **docker-compose**: servicio `mailpit` (`axllent/mailpit`, 1025/8025) +
  integración en Makefile (`db-up` o target propio) y `SMTP_URL` en
  `.env.example`.
- **Tests**: unit-first sin postgres ni SMTP vivo (selector, puerto de render
  con fake, adapter SMTP con transporte inyectado); golden/snapshot de la
  plantilla OTP vía `octane-email export` o `render()`; integración Mailpit
  opt-in (patrón `*.integration.test`). TDD estricto obligatorio
  (`strict_tdd: true`).

### Fuera (non-goals)

- Plantillas adicionales (bienvenida, reset, facturación…): solo OTP.
- Cambios de schema en `email_sending` (columnas template/payload): el render
  ocurre en enqueue-time precisamente para evitarlo.
- Wiring de `EmailSender` en el composition root para envío síncrono: el envío
  sigue siendo asíncrono vía task de drenaje.
- Cola/reintentos avanzados, rate limiting, tracking de aperturas, unsubscribe.
- Sustituir el stack si la verificación npm falla: la spec `workspace` exige
  detenerse y escalar, no decidir por cuenta propia (fallback ReactCompat solo
  como escalación acordada).

## 4. Áreas afectadas

| Área | Cambio |
| --- | --- |
| `packages/email/` | Nuevo paquete (plantilla OTP `.tsrx`, tooling tsrx, scripts) |
| `apps/api/src/domain/ports/` | Puerto de render nuevo; posible extensión de `EmailMessage` |
| `apps/api/src/application/auth/request-otp.ts` | Inyección del renderer; body compuesto por plantilla |
| `apps/api/src/infrastructure/email/` | Adapter de render (Octane) + adapter SMTP + factory selector por env |
| `apps/api/tasks/email-sending.ts` | Usa `createEmailSender(env)` en vez de consola hardcoded |
| `apps/api/src/http/composition-root.ts` | Cablea renderer en `RequestOtp`; `AppEnv` + `SMTP_URL` |
| `docker-compose.yml`, `Makefile`, `.env.example` | Servicio Mailpit, target/wait, `SMTP_URL` |
| Spec canónica `api-auth` | MODIFIED delta sobre req 7 (firma del puerto / adapters) |
| Spec `workspace` | Verificación npm bloqueante de `@octanejs/email@0.0.3` + `@octanejs/email-cli` vs `octane@0.2.3` |

## 5. Riesgos

- **Verificación npm bloqueante (D2)**: `@octanejs/email@0.0.3` y
  `@octanejs/email-cli` no están instalados ni verificados; si no existen o sus
  peer deps chocan con `octane@0.2.3`, se detiene y escala (spec `workspace`).
- **`.tsrx` bajo el bundle de nitro v3 (D1, riesgo técnico principal)**:
  importar plantillas `.tsrx` desde código bundlado por nitro no está probado;
  design decide entre `octane/compiler/register` en runtime vs precompilar
  `packages/email` a JS (encaja con turbo `^build`) vs híbrido. Spike/smoke test
  temprano recomendado en apply.
- **Compatibilidad nodemailer × bun 1.4 × nitro v3 (D5)**: no verificada; smoke
  test antes de comprometer el adapter. Alternativa de último recurso: cliente
  SMTP mínimo sobre `Bun.connect`/TLS.
- **Delta sobre spec canónica `api-auth` req 7 (D3)**: extender el mensaje toca
  spec fijada y el adapter consola existente; no hacerlo deja al adapter SMTP
  adivinando content-type y pierde fallback de texto plano.
- **Review budget 400 líneas**: paquete nuevo + tooling + puertos/adapters +
  compose + plantilla + tests probablemente ronda o supera el presupuesto →
  decisión de delivery vía `ask-on-risk` en plan/apply (no se asume chain ni
  exception ahora).
- **Bindings beta (0.0.3)**: features del port React Email sin evidencia local;
  la plantilla OTP es simple (texto + código destacado), bajo riesgo.
- **Puertos locales 1025/8025**: posible colisión en máquinas dev; documentar.
- **PII/telemetría**: mantener emails fuera de spans/atributos (regla PRD §9).

## 6. Rollback

- Todo el cambio es aditivo salvo el delta de spec `api-auth` y la
  reconfiguración de la task de drenaje. Rollback = revert del change:
  - Sin `SMTP_URL` definida, el selector cae al adapter consola → comportamiento
    actual preservado incluso con el código desplegado (feature-flag por env de
    facto).
  - `packages/email` es un paquete nuevo aislado; eliminarlo no afecta al resto
    del workspace.
  - Mailpit es un servicio compose nuevo e independiente; `db-up`/`db-down` no
    rompen si se retira.
  - Si el render falla en runtime, el camino de degradación documentado es
    volver al body plano inline actual de `RequestOtp` (un commit de revert
    localizado).

## 7. Criterios de éxito

1. `bun test` verde en raíz (gate de verify, `strict_tdd`) con tests unitarios
   del selector, del renderer (fake) y del adapter SMTP (transporte inyectado),
   más snapshot de la plantilla OTP.
2. Con `SMTP_URL=smtp://localhost:1025` y Mailpit levantado, `RequestOtp` encola
   un email cuyo HTML renderizado desde la plantilla `.tsrx` llega visible a la
   UI de Mailpit (:8025) tras el drenaje de la task.
3. Sin `SMTP_URL`, el flujo OTP completo sigue funcionando con el adapter
   consola (sin regresión).
4. `packages/email` typecheckea con tooling tsrx y es consumido por `apps/api`
   sin pipeline vite (estrategia D1 validada con smoke test).
5. `@octanejs/email@0.0.3`, `@octanejs/email-cli` y el cliente SMTP elegido
   verificados en npm (existencia + peer deps) antes de commitear
   `package.json`, conforme a spec `workspace`.
6. Delta MODIFIED sobre `api-auth` req 7 escrito con scenarios actualizados;
   specs en español; copy del email OTP en español.
7. Dominio/aplicación sin imports de `@octanejs/email` ni nodemailer (solo
   puertos); toda dependencia SDK vive en `infrastructure/email/` y
   `packages/email`.

## 8. Skill resolution

`none` — fase de propuesta sobre artefactos ya explorados; no se inyectaron
paths de skills por el padre y ninguna skill especializada era requerida.
