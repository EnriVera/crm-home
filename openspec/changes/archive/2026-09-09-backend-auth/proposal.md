# Proposal — backend-auth

> Fuente de verdad: PRD §8.1 (OTP real por email + sesiones + seed de usuario),
> §6.2 (registro implícito), §8.8 (términos), §10 (puertos), §11 (schema).
> Baseline canónico a preservar: `openspec/specs/web-auth-ui/spec.md` y
> `openspec/specs/api/spec.md`.
> Decisiones de producto CONFIRMADAS (preproposal, 2026-09-08):
> research lane unselected · `EmailSender` port + adapter console/log en dev ·
> moneda default del seed: ARS.

## 1. Intent

Implementar el backend de autenticación real del PRD §8.1: OTP de 6 dígitos
enviado por email (cola `email_sending` + task nitro), validación con reglas de
seguridad (10 min, 5 intentos, rate-limit 3 envíos/hora), sesiones persistentes
(cookie httpOnly 30 días deslizante), logout con borrado lógico, y registro
implícito con seed transaccional del usuario nuevo.

En el frontend, el `FakeOtpVerifier` se reemplaza por un verifier real vía RPC
en el punto de composición único (`otp-form.tsrx`), **sin tocar la UI, la
máquina OTP, el puerto `OtpVerifier`, el contrato `Verdict` ni las constantes**
(6 dígitos / 5 intentos / 10 min) — requisito del baseline `web-auth-ui`.

## 2. Scope

### In scope

**`packages/types` (@crm/types)**

- Contratos orpc + zod para auth siguiendo el patrón de `healthContract`:
  `requestOtp`, `verifyOtp`, `logout`, `session` (quién soy / estado de sesión).

**`apps/api` — dominio y aplicación (TS puro, sin imports de infra)**

- Puertos nuevos en `src/domain/ports/`: `UserRepository`, `LoginRepository`,
  `SessionRepository`, `EmailSendingRepository` (o repo de cola), `EmailSender`,
  `OtpGenerator`, `TokenHasher`, `IdGenerator` (UUIDv7), `Clock` (inyectable).
- Casos de uso en `src/application/`: RequestOtp (genera OTP, persiste en
  `login`, encola en `email_sending`, aplica rate-limit 3/hora), VerifyOtp
  (valida, consume, crea sesión, registro implícito con seed), Logout (borrado
  lógico de sesión), GetSession (resolución + renovación deslizante).
- Reglas de negocio en dominio: expiración 10 min, máx 5 intentos por código
  (servidor = fuente de verdad), código `varchar(6)` con ceros a la izquierda,
  aceptación de términos en el registro implícito
  (`user_accepted_terms_at` + `user_terms_version`).

**`apps/api` — infraestructura y http**

- Tooling de migraciones (primera migración del repo) + migración inicial con
  las tablas del change: `user`, `login`, `session`, `email_sending`, más las
  tablas de soporte necesarias para seed y FKs (`sino`, `task_state`,
  `currency`, `accounts`, tipos/categorías base según §6.2/§11 — design decide
  el corte exacto).
- Adapters kysely para los repos; adapter `EmailSender` console/log en dev
  (decisión confirmada) dejando el punto de enchufe para proveedor real; task
  de nitro que drena `email_sending` y llama al puerto.
- Handlers orpc en `src/http/` con wiring en `composition-root.ts`; emisión y
  lectura de cookie de sesión (httpOnly, secure, sameSite=lax, 30 días con
  renovación deslizante) vía h3.
- Token de sesión: nunca en claro — solo `sess_token_hash` persistido.

**`apps/web` — toques mínimos**

- Cliente RPC (nuevo; no existe) + adapter `OtpVerifier` real que captura el
  email del query param `?email=` en su closure (el puerto solo recibe `code`).
- Swap de una línea en `components/organisms/otp-form/otp-form.tsrx`.
- Wiring de `requestOtp` en `login-form.tsrx` antes de navegar (mínimo:
  loading/error), sin tocar la máquina OTP.
- Guard de shell: `before` en `shellRoute()` + redirect de `/` a `/dashboard`
  con sesión activa (materializa el punto documentado en `octane.config.ts`).

**Mapeo de contrato (crítico para el baseline)**

- Estados del backend (locked/invalidated/expired) se mapean al `Verdict`
  existente (`valid | invalid | expired`); el servidor es la fuente de verdad
  de intentos/expiración. El contrato no cambia.

### Out of scope / non-goals

- Proveedor real de email (SMTP/SaaS): queda el puerto + adapter dev.
- Cambios de UI de las pantallas auth, del `OtpInput`, de la máquina OTP o del
  puerto/constantes (`web-auth-ui` queda intacto).
- Tabla `logs` (append-only) y métricas de negocio de §12 salvo lo indispensable.
- Recuperación de cuenta, magic links, 2FA, gestión multi-dispositivo de sesiones
  (más allá de logout).
- Páginas legales (`/terms`, `/privacy`, `/cookies`) — los anchors ya existen.

## 3. Affected areas

| Área | Naturaleza del impacto |
| --- | --- |
| `packages/types` | Nuevos contratos orpc/zod de auth (patrón existente) |
| `apps/api/src/domain/ports` | ~9 puertos nuevos |
| `apps/api/src/application` | 4 casos de uso + reglas OTP/sesión/seed |
| `apps/api/src/infrastructure` | Migraciones, adapters kysely, EmailSender dev, task nitro, crypto |
| `apps/api/src/http` | Router/composition root + cookies |
| `apps/web` (cliente RPC, otp-form, login-form, shell guard) | Toques acotados; UI y máquina OTP intactas |
| `openspec/specs` | Nuevas specs de capacidad backend-auth (design las define); specs `api` y `web-auth-ui` se respetan sin relajar reglas |
| Infra dev | postgres via docker-compose existente; `DATABASE_URL` |

## 4. Design flags heredados (resolver en sdd-design)

1. Tooling de migraciones (kysely migrator vs SQL plano) y cómo se aplica en dev/CI.
2. Mecánica exacta de renovación deslizante (cuándo se extiende `sess_expires_at` y se re-emite cookie).
3. Cookie en dev cross-origin web↔api (secure+sameSite sobre http local; ¿proxy?).
4. Hashing de token (algoritmo) y comparación a tiempo constante en verificación.
5. Estrategia de tests con postgres (unit con fakes + integración opt-in con docker-compose).
6. Corte exacto de tablas de soporte para el seed (¿migración mínima de `currency`/`task_state`/tipos o seeds SQL?).
7. Forma del cliente RPC en web (`@orpc/client` vs fetch propio).

## 5. Risks

- **size**: migraciones + tablas + seeds + puertos/adapters + cola email + task
  nitro + sesiones + contratos + cliente web + guard superan casi con certeza el
  review budget de 400 líneas → candidato a chaining; la decisión de delivery se
  toma en plan/apply bajo `ask-on-risk` (no en esta fase).
- **Seguridad**: token en claro, timing attacks en comparación de OTP, y cookies
  secure/sameSite en dev http son puntos delicados; design debe explicitarlos.
- **Baseline**: cualquier cambio en `OtpVerifier`/`Verdict`/constantes/UI rompe
  `web-auth-ui` — prohibido por este change.
- **Registro implícito**: seed transaccional multi-tabla es el camino más
  frágil (FKs hijo→padre, UUIDv7, lookup `sino`); tests de integración opt-in
  lo cubren.
- **Rate-limit**: debe apoyarse en `idx_login_email_created` (índice
  `(logi_email, logi_created_at)`) — sin índice, el chequeo degrada.

## 6. Rollback

- Todo el comportamiento nuevo vive tras wiring nuevo (composition root,
  contratos nuevos, cliente RPC nuevo). Rollback = revertir el/los commits del
  change y restaurar `FakeOtpVerifier` en `otp-form.tsrx` (swap de una línea).
- La migración debe tener `down` (o script SQL de reversión) que dropee las
  tablas del change; `DatabaseSchema` vuelve a `{}`.
- Sin datos productivos (backend aún scaffold): el riesgo de rollback de datos
  es nulo; la cookie vieja queda inválida al no existir `session`.
- La UI auth y la máquina OTP nunca se tocan → no requieren rollback.

## 7. Success criteria

Derivados de PRD §8.1 (criterios de aceptación):

1. Un código con ceros a la izquierda (`"041283"`) valida end-to-end y crea
   sesión + cookie httpOnly.
2. Código expirado (>10 min) o con 5 intentos agotados es rechazado con
   mensaje claro mapeado al `Verdict` existente, sin cambios de UI/máquina.
3. Rate-limit: un 4.º `requestOtp` para el mismo email dentro de la hora es
   rechazado.
4. Recargar el navegador con sesión activa mantiene al usuario logueado
   (guard de shell + `/` redirige a `/dashboard`).
5. Logout invalida la sesión: reutilizar la cookie después falla
   (`sess_deleted_at`).
6. Registro implícito: primer OTP válido crea el usuario con seed completo
   (estados de tarea, cuenta `Efectivo` en ARS, tipos/categorías base,
   aceptación de términos) en una transacción.
7. Email del OTP queda encolado en `email_sending` y el adapter dev lo emite
   por consola/log vía task nitro.
8. `bun test` verde sin postgres viva ni OTLP (patrón del repo preservado);
   tests de integración con DB son opt-in.
9. El escenario canónico "Swap del verifier sin tocar UI" sigue cumpliéndose:
   puerto, `Verdict` y constantes intactos.

## 8. Proposal question round

No aplica en esta ejecución: el pre-proposal handoff llegó con las decisiones
de producto CONFIRMADAS por el product owner (email provider dev-adapter,
moneda ARS, research lane unselected). Las incógnitas restantes son técnicas y
quedan explícitamente delegadas a sdd-design (§4).
