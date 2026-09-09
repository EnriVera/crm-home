# Explore — backend-auth

> Fase exploratoria (read-only). Intención: implementar el backend de auth real
> según PRD §8.1 — OTP real por email + sesiones + seed de usuario — reemplazando
> `FakeOtpVerifier` por un verifier real vía RPC sin tocar UI ni máquina OTP.

## 1. Estado actual del backend (`apps/api`)

Scaffold clean architecture, sin lógica de dominio aún:

- **Puertos existentes** (`src/domain/ports/`): solo `Telemetry` y
  `HealthRepository`. No hay puertos de auth, email, usuarios ni sesiones.
- **Composition root** (`src/http/composition-root.ts`): cablea telemetría
  (factory no-op/OTel por `OTEL_EXPORTER_OTLP_ENDPOINT`), `GetHealth`, ruta h3
  `GET /health` y router orpc en `/rpc/*`. Punto único de wiring donde este
  change debe enchufar los casos de uso de auth.
- **Router orpc** (`src/http/router.ts`): patrón establecido — contrato
  compartido en `@crm/types` (`healthContract` con `@orpc/contract` + zod),
  `implement()` + `RPCHandler` con prefix `/rpc`. Los contratos de auth
  (requestOtp, verifyOtp, logout, session) deben seguir este patrón.
- **Kysely** (`src/infrastructure/kysely/database.ts`): adapter lazy (no se
  instancia en arranque), `DatabaseSchema = {}` — **sin tablas ni tooling de
  migraciones**. `DATABASE_URL` es la convención. docker-compose con
  postgres:17 (`crm`/`crm`, db `crm_home`, puerto 5432) ya existe.
- **Deps pineadas**: `kysely` + `pg`, `effect`, `xstate` + `@octanejs/xstate`
  (base fundacional, confinadas a `infrastructure/`/`http/` por spec api).
  **No hay**: tooling de migraciones, SDK de email, ni cliente orpc en web.
- Tests: `bun test` sin DB viva ni OTLP (smoke tests) — patrón a preservar.

## 2. Estado actual del frontend (`apps/web`)

- **Puerto `OtpVerifier`** en `src/lib/otp/otp-machine.ts` (líneas 32–37):
  `verify(code: string): Promise<Verdict>` con
  `Verdict = "valid" | "invalid" | "expired"`. Constantes exportadas:
  `OTP_MAX_ATTEMPTS=5`, `OTP_EXPIRES_MINUTES=10`, `OTP_CODE_LENGTH=6`.
- **Punto de composición a tocar**: `components/organisms/otp-form/otp-form.tsrx`
  (línea 29–31) instancia `createOtpMachine({ verifier: new FakeOtpVerifier() })`.
  Es el ÚNICO sitio donde se inyecta el verifier → el swap es de una línea.
- **Gap**: no existe cliente RPC en web (grep `rpc|fetch(` → ninguno). El
  verifier real necesita un adapter cliente (`@orpc/client` o fetch propio)
  que además capture el `email` del query param `?email=` — el puerto solo
  recibe `code`, así que el email debe vivir en el closure del adapter.
- **`login-form.tsrx`**: hoy valida email client-side y hace
  `location.assign("/login-verification?email=...")` **sin llamar al backend**.
  El paso 2 del PRD (generar OTP + encolar email) exige cablear un
  `requestOtp` antes de navegar — toca UI mínimamente (loading/error) aunque la
  máquina OTP quede intacta.
- **Auth-guard futuro**: `octane.config.ts` documenta `shellRoute()` como punto
  único donde el guard se enchufa como `before` (8 rutas del shell), y el
  `rootRedirect` de `/` comenta "cuando exista sesión, el mismo punto irá a
  /dashboard". Este change debe materializar ese guard (criterio: "recargar
  con sesión activa mantiene logueado").
- Baseline canonical: `openspec/specs/web-auth-ui/spec.md` (máquina tras puerto,
  scenario "Swap del verifier sin tocar UI") y `openspec/specs/api/spec.md`
  (regla de confinamiento de imports — kysely/h3/nitro/effect/xstate solo en
  `infrastructure/` y `http/`).

## 3. Requisitos PRD §8.1 (fuente de verdad)

- OTP 6 dígitos `varchar` (ceros a la izquierda), persistido en tabla `login`;
  email encolado en `email_sending` (task de nitro lo envía).
- Validación: marcar OTP consumido (`logi_consumed_at`), crear sesión
  (registro en `session` + cookie **httpOnly, secure, sameSite=lax, 30 días
  con renovación deslizante**) y redirect a `/dashboard`.
- Seguridad obligatoria: expira a 10 min; máx 5 intentos por código (luego
  invalidado, pedir uno nuevo); **rate limit 3 envíos/hora por email**
  (cubrible con `idx_login_email_created`).
- Registro implícito (§6.2): primer OTP válido crea el usuario y siembra
  defaults (estados `Pendiente`/`En progreso`/`Completado`, cuenta `Efectivo`,
  tipos/categorías base) + aceptación de términos
  (`user_accepted_terms_at` + `user_terms_version`, §8.8).
- Logout = borrado lógico de `session` (`sess_deleted_at`); cookie inválida de
  inmediato.
- Criterios: código con ceros valida; expirado/5 intentos rechazado con mensaje
  claro; reload mantiene sesión; logout invalida cookie reutilizada.

## 4. Schema PRD §11 (tablas del change)

- `user` (email UNIQUE, theme CHECK, terms, soft delete; FK a `sino`).
- `login` (`logi_code varchar(6)`, `logi_attempts`, `logi_expires_at`,
  `logi_consumed_at`; índice `(logi_email, logi_created_at)` para rate-limit).
- `session` (`sess_token_hash` UNIQUE — nunca token en claro; `sess_expires_at`;
  `sess_deleted_at`).
- `email_sending` (from/to/title/description, `emse_logi_id` link al login,
  `emse_sino_sending` estado vía lookup `sino`).
- Dependencias de seed: `sino` (lookup global), y para el seed de usuario se
  necesitan `task_state`, `accounts` + `currency` (§6.2 dice cuenta `Efectivo`
  "en su moneda" — **la moneda por defecto no está especificada**: pregunta
  abierta para design/proposal).
- Convenciones: UUIDv7, prefijos 4 letras, FKs hijo→padre, `created/updated/
  deleted_at` (`logs` es append-only y NO es necesario para este change).
- Puertos §10 a crear: `EmailSender` (cola `email_sending` + task nitro),
  `OtpGenerator`/`TokenHasher` (crypto de bun), `IdGenerator` (UUIDv7),
  `Clock` (inyectable para tests), repos kysely por entidad.

## 5. Gaps y decisiones que design debe resolver

1. **Tooling de migraciones inexistente** — primera tabla del repo: elegir
   kysely migrator vs SQL plano + cómo se aplica en dev/CI.
2. **Proveedor de email no especificado** en el PRD — solo cola + task nitro.
   Se necesita al menos un adapter de envío real o la decisión explícita de
   dev-adapter (log/consola) con el `EmailSender` tras puerto.
3. **Cliente RPC en web** — no existe; crear adapter + contratos en
   `@crm/types`. El email debe capturarse del query param en el closure del
   verifier (el puerto solo pasa `code`).
4. **Doble conteo de intentos**: la máquina cuenta 5 en cliente y
   `logi_attempts` en servidor — el servidor debe ser la fuente de verdad;
   mapear estados del backend (locked/invalidated) al `Verdict` existente
   (posiblemente `invalid` hasta agotar, `expired` para código muerto).
5. **Cookie httpOnly desde orpc/h3** y dev-cross-origin web↔api (no hay proxy
   configurado visible) — definir cómo viaja la cookie en dev.
6. **Renovación deslizante**: mecánica exacta (cuándo se extiende
   `sess_expires_at` y se re-emite cookie).
7. **Guard de shell**: implementar `before` en `shellRoute` + redirect de `/`
   a `/dashboard` con sesión (hoy siempre a `/login`).
8. **Tests con DB**: el patrón actual es `bun test` sin postgres; decidir
   estrategia (unit con repos fake + integración opt-in con docker-compose).
9. **Seed transaccional**: creación de user + estados + cuenta + tipos en una
   transacción; moneda default sin especificar (ver §4).

## 6. Riesgos

- **Tamaño**: migraciones + 4 tablas + seeds + 5 puertos/adapters + cola de
  email + task nitro + sesiones/cookies + contratos RPC + cliente web + guard.
  Muy probablemente supera el review budget de 400 líneas → candidato a
  chaining; la decisión de delivery corresponde a plan/apply (ask-on-risk).
- **Ambiguous-scope**: proveedor de email y moneda default del seed no están
  especificados en el PRD — requieren decisión documentada en design o
  pregunta al product owner.
- **Seguridad**: token en claro, timing attacks en verificación, y cookies en
  dev (secure+sameSite con http local) son puntos delicados a diseñar.
- La spec `web-auth-ui` exige preservar puerto/constantes/UI intactos —
  cualquier cambio de contrato `Verdict`/`OtpVerifier` rompe el baseline.

## 7. Skill resolution

`none` — exploración read-only de repo; ninguna skill especializada requerida
y no se inyectaron paths de skills por el padre.
