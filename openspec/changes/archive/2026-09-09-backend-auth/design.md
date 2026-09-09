# Design — backend-auth

> Resuelve los 7 design flags del proposal §4. Fuente de verdad: PRD §8.1, §6.2,
> §8.8, §10, §11. Baseline a preservar: `openspec/specs/web-auth-ui/spec.md`
> (puerto `OtpVerifier`, `Verdict`, constantes, UI) y `openspec/specs/api/spec.md`
> (confinamiento de imports).
>
> Decisiones de producto confirmadas (preproposal): `EmailSender` port + adapter
> console/log en dev; moneda default del seed: ARS.

## 1. Resumen ejecutivo

Se implementa el backend de autenticación real (OTP por email, sesiones cookie
httpOnly 30 días deslizantes, logout lógico, registro implícito con seed) sin
tocar la UI, máquina OTP ni el contrato `Verdict` de `web-auth-ui`. El cambio
añade contratos orpc/zod en `@crm/types`, puertos y casos de uso puros en
`apps/api`, adapters kysely/crypto/email, la primera migración del repo, una
task nitro de drenaje de email y un cliente RPC mínimo en `apps/web` que
permite el swap de una línea en `otp-form.tsrx`.

## 2. Design flags resueltos

### D1. Tooling de migraciones (primera del repo)

- **Estrategia:** kysely migrator nativo (`FileMigrationProvider`) con archivos
  `.ts` bajo `apps/api/src/infrastructure/kysely/migrations/`.
- **Razón:** mantiene el dialecto y conexión ya cableados (`DATABASE_URL`) y
  permite `up`/`down` versionados en TypeScript.
- **Aplicación:**
  - Script `db:migrate` en `apps/api/package.json`:
    `"db:migrate": "bun src/infrastructure/kysely/migrate.ts"`.
  - En dev: `docker compose up -d` → `bun run db:migrate` → `bun dev`.
  - En CI: mismos pasos antes de los tests de integración opt-in.
  - No se ejecutan migraciones automáticamente al arrancar nitro; el adapter
    kysely sigue siendo lazy y el runner es explícito.
- **Formato de archivo:** `NNN_descripcion.ts` exportando `up(db: Kysely<any>)`
  y `down(db: Kysely<any>)`. La primera migración usa SQL raw vía
  `sql`\`...\``.execute(db)` para claridad del schema.

### D2. Renovación deslizante de sesión

- **Cookie:** max-age = 30 días.
- **DB:** `session.sess_expires_at` actualizado solo cuando la sesión está a
  menos de 15 días de expirar (umbral = 50 % de la vida útil).
- **Mecánica:**
  1. `GetSession` recibe el token hash de la cookie.
  2. Si la sesión no existe, está borrada o `sess_expires_at < now`, devuelve
     `null`.
  3. Si `sess_expires_at - now < 15 días`, extiende
     `sess_expires_at = now + 30 días` y marca `renewed = true`.
  4. El handler HTTP re-emite la cookie con el **mismo token** cuando
     `renewed = true`.
- **Token:** no rota en la renovación deslizante; solo cambia la fecha límite.

### D3. Cookie en dev cross-origin web↔api

- **Flags:** `httpOnly: true`, `sameSite: 'lax'`, `path: '/'`, `maxAge: 30 días`.
- **secure:** `true` en producción; `false` en dev mediante variable
  `SESSION_COOKIE_SECURE` (default `true`). Localhost con distintos puertos es
  same-site, por lo que `sameSite: 'lax'` funciona para navegaciones y POST
  same-site.
- **Cliente web:** el cliente RPC configura `credentials: 'include'` para que
  el navegador envíe y reciba la cookie.
- **Sin proxy:** no se introduce proxy local; se acepta `secure: false` en dev.

### D4. Hashing de token y comparación de OTP a tiempo constante

- **Token:** 32 bytes aleatorios (`crypto.randomBytes`), codificados en
  base64url (43 chars). Hash con **SHA-256** → 64 hex chars persistido en
  `sess_token_hash`.
- **Comparación token:** `crypto.timingSafeEqual` sobre buffers del hash
  almacenado y recalculado.
- **OTP:** comparación con `crypto.timingSafeEqual` después de normalizar ambos
  códigos a buffers de igual longitud (6 bytes/utf8). Esto previene timing
  attacks sin depender de la duración del string.

### D5. Estrategia de tests con postgres

- **Tests unitarios:** primero (strict TDD), con repositorios fake, clock fijo,
  otp/token/ID mock. Cubren los 4 casos de uso.
- **Tests de infraestructura opt-in:** archivos `*.integration.test.ts` que se
  saltan si no está definida `TEST_DATABASE_URL`.
- **Setup de integración:**
  1. `docker compose up -d` (postgres:17, puerto 5432).
  2. `DATABASE_URL=$TEST_DATABASE_URL bun run db:migrate`.
  3. Cada test suite crea un usuario/escenario y hace rollback de transacción
     o limpia tablas afetadas en `afterAll`.
- **Smoke test:** sigue verde sin postgres ni OTLP.

### D6. Corte de tablas de soporte para el seed

La migración inicial incluye **solo** las tablas necesarias para que el auth y
el seed mínimo del registro implícito funcionen:

- Tablas de auth: `user`, `login`, `session`, `email_sending`.
- Lookups globales seedeados en la misma migración: `sino`, `apps`, `currency`.
- Tablas de negocio necesarias para el seed transaccional: `task_state`,
  `accounts`, `types`, `categories`.
- **NO** se incluyen tablas fuera del alcance de este change (`client`,
  `task`, `schedule*`, `income`, `expenses`, `transfers`, `attachments`,
  `logs`, etc.).

Seed de la migración:

- `sino`: `(0, 0)` → No/Inactive/Pending; `(1, 1)` → Yes/Active/Sent.
- `currency`: una fila ARS (`Peso argentino`, `$`, 2 decimales).
- `apps`: una fila "Core" para el módulo base (`apps_id` fijo generado en la
  migración como UUIDv7). `apps` es lookup global sin `deleted_at`.

Seed transaccional del registro implícito (dentro de `VerifyOtp` cuando no
existe el usuario):

- `user`: email, nombre derivado de la parte local del email, tema `system`,
  `user_sino_emailverificado = 1`, términos aceptados (`user_accepted_terms_at`,
  `user_terms_version = '1.0'`).
- `task_state`: `Pendiente` (orden 1), `En progreso` (orden 2),
  `Completado` (orden 3).
- `accounts`: `Efectivo`, icono/color por default, `acco_curr_id` = ARS,
  `acco_initial_amount = 0`.
- `types`/`categories`: seed mínimo por módulo (Tasks, Schedule, Clients).
  Cantidad y títulos exactos se definen en la fase de implementación; el design
  exige que sean lo suficientemente mínimos como para no bloquear el registro
  implícito ni exceder el scope de auth.

### D7. Cliente RPC en web

- **Librería:** `@orpc/client` (misma familia que `@orpc/server`/`contract`).
- **Nueva dependencia:** `@orpc/client` en `apps/web/package.json`.
- **Cliente:** `src/lib/api/rpc.ts` exporta `createRpcClient(baseURL)` usando
  `createORPCClient(authContract, { baseURL, fetch: credentials: 'include' })`.
- **Adapter `OtpVerifier`:** `src/lib/otp/rpc-verifier.ts` exporta
  `createRpcOtpVerifier(email): OtpVerifier`. Captura el email en closure; el
  puerto solo recibe `code`.
- **Swap:** en `otp-form.tsrx` se reemplaza `new FakeOtpVerifier()` por
  `createRpcOtpVerifier(emailFromQuery)`.
- **Login-form:** llama a `rpc.auth.requestOtp.mutate({ email })` antes de
  navegar; gestiona loading y error inline sin tocar la máquina OTP.

## 3. Arquitectura y data flow

### 3.1 Capas (PRD §10 / spec api)

```
packages/types
  └─ authContract (orpc/zod)

apps/api/src/domain/ports
  ├─ user-repository.ts
  ├─ login-repository.ts
  ├─ session-repository.ts
  ├─ email-sending-repository.ts
  ├─ email-sender.ts
  ├─ otp-generator.ts
  ├─ token-hasher.ts
  ├─ id-generator.ts
  └─ clock.ts

apps/api/src/application/auth
  ├─ request-otp.ts
  ├─ verify-otp.ts
  ├─ logout.ts
  └─ get-session.ts

apps/api/src/infrastructure
  ├─ kysely/migrations/001_initial.ts
  ├─ kysely/migrate.ts
  ├─ kysely/database.ts (extiende DatabaseSchema)
  ├─ kysely/*-repository.ts
  ├─ crypto/otp-generator.ts
  ├─ crypto/token-hasher.ts
  ├─ crypto/id-generator.ts
  ├─ time/system-clock.ts
  ├─ time/fixed-clock.ts
  └─ email/console-email-sender.ts

apps/api/src/http
  ├─ composition-root.ts (wiring)
  ├─ router.ts (health + auth)
  ├─ auth/auth-routes.ts
  └─ auth/cookie.ts (get/set/delete session cookie)

apps/api/tasks (nitro v3)
  └─ email-sending.ts

apps/web/src
  ├─ lib/api/rpc.ts
  ├─ lib/otp/rpc-verifier.ts
  ├─ components/organisms/otp-form/otp-form.tsrx (swap de 1 línea)
  ├─ components/organisms/login-form/login-form.tsrx (wiring requestOtp)
  ├─ lib/nav/session-guard.ts
  └─ lib/nav/redirect.ts (modificado)
```

### 3.2 Flujo OTP

```
/login
  login-form → rpc.auth.requestOtp.mutate({ email })
             → RequestOtp (domain/app)
                 - rate-limit (3/hora vía idx_login_email_created)
                 - OtpGenerator → 6 dígitos
                 - LoginRepository.create
                 - EmailSendingRepository.create
             → 200 { ok: true }
  login-form → navigate /login-verification?email=...

/login-verification
  otp-form → createRpcOtpVerifier(emailFromQuery)
  OtpInput onComplete → machine.submit(code)
                      → rpc.auth.verifyOtp.mutate({ email, code })
                      → VerifyOtp
                          - busca login más reciente no consumido
                          - expired? → Verdict 'expired'
                          - attempts >= 5? → Verdict 'invalid' (locked)
                          - timingSafeEqual(code)
                              - mismatch: increment attempts → 'invalid'
                              - match: mark consumed, find/create user + seed,
                                       create session + cookie → 'valid'
  machine recibe Verdict → success/error/expired
  on success → redirect /dashboard
```

### 3.3 Flujo sesión

```
Cualquier request autenticado / shell guard / GET /session
  → cookie raw token → hash → SessionRepository.findByTokenHash
  → GetSession
       - no found/deleted/expired → null / redirect /login
       - found y within renewal threshold → update expires_at
  → handler re-emite cookie si renewed
       - shell guard continúa
       - / redirige a /dashboard si hay sesión
```

## 4. Contratos (`packages/types/src/contracts/auth.ts`)

```ts
import { oc } from "@orpc/contract";
import { z } from "zod";

export const emailSchema = z.string().email();
export const otpCodeSchema = z.string().length(6).regex(/^\d{6}$/);

export const requestOtpInputSchema = z.object({ email: emailSchema });
export const requestOtpOutputSchema = z.object({ ok: z.literal(true) });

export const verifyOtpInputSchema = z.object({
  email: emailSchema,
  code: otpCodeSchema,
});
export const verifyOtpOutputSchema = z.object({
  verdict: z.enum(["valid", "invalid", "expired"]),
});

export const sessionOutputSchema = z.object({
  user: z.object({
    id: z.string().uuid(),
    email: z.string().email(),
    name: z.string(),
  }),
});

export const logoutOutputSchema = z.object({ ok: z.literal(true) });

export const authContract = oc.prefix("/auth").router({
  requestOtp: oc
    .route({ method: "POST", path: "/request-otp" })
    .input(requestOtpInputSchema)
    .output(requestOtpOutputSchema),
  verifyOtp: oc
    .route({ method: "POST", path: "/verify-otp" })
    .input(verifyOtpInputSchema)
    .output(verifyOtpOutputSchema),
  logout: oc
    .route({ method: "POST", path: "/logout" })
    .output(logoutOutputSchema),
  session: oc
    .route({ method: "GET", path: "/session" })
    .output(sessionOutputSchema),
});
```

**Notas:**

- `verifyOtp` devuelve directamente el `Verdict` de la máquina; no se toca el
  puerto `OtpVerifier` ni su contrato.
- `requestOtp` dispara errores orpc (`RATE_LIMITED`) que el login-form captura y
  muestra inline.
- `session` devuelve 401 (sin body) cuando no hay sesión, mapeado a `null` en
  el cliente web.

## 5. Puertos y casos de uso (`apps/api/src`)

### 5.1 Puertos de dominio

| Puerto | Métodos principales |
| --- | --- |
| `UserRepository` | `findByEmail(email)`, `create(user)`, `markEmailVerified(id)` |
| `LoginRepository` | `create(login)`, `findLatestByEmail(email)`, `incrementAttempts(id)`, `markConsumed(id)`, `countRecentByEmail(email, since)` |
| `SessionRepository` | `create(session)`, `findByTokenHash(hash)`, `softDelete(hash)`, `updateExpiresAt(id, date)` |
| `EmailSendingRepository` | `create(message)`, `findPending(limit)`, `markSent(id)`, `markFailed(id)` |
| `EmailSender` | `send(message: { to, from, subject, body })` |
| `OtpGenerator` | `generate(): string` // 6 dígitos, ceros a la izquierda |
| `TokenHasher` | `hash(token): string`, `verify(token, hash): boolean` |
| `IdGenerator` | `generate(): string` // UUIDv7 |
| `Clock` | `now(): Date` |

### 5.2 Casos de uso

#### `RequestOtp`

- Input: `{ email }`.
- Normaliza email a minúsculas.
- Rate-limit: `countRecentByEmail(email, now - 1h) >= 3` → throw
  `RateLimitedError`.
- Genera código con `OtpGenerator`.
- `LoginRepository.create({ id, email, code, expiresAt: now + 10 min,
  attempts: 0 })`.
- `EmailSendingRepository.create({ id, from, to: email, subject, body, loginId,
  status: pending })`.
- Output: `{ ok: true }`.

#### `VerifyOtp`

- Input: `{ email, code }`.
- Busca login más reciente no consumido (`logi_consumed_at IS NULL`) para ese
  email.
- Si no existe → `{ verdict: 'invalid' }`.
- Si `logi_expires_at < now` → `{ verdict: 'expired' }`.
- Si `logi_attempts >= 5` → `{ verdict: 'invalid' }`.
- Compara código a tiempo constante.
- Si no coincide: `incrementAttempts(id)` → `{ verdict: 'invalid' }`.
- Si coincide:
  1. `markConsumed(id)`.
  2. Busca usuario por email; si no existe, ejecuta seed transaccional:
     - crea usuario (términos aceptados),
     - 3 task_state,
     - cuenta Efectivo en ARS,
     - tipos/categorías base mínimas.
  3. Crea sesión: token raw, hash SHA-256, expiresAt = now + 30 días.
  4. Output: `{ verdict: 'valid', sessionToken }`.

#### `Logout`

- Input: token hash (o raw token).
- `TokenHasher.hash(rawToken)` → hash.
- `SessionRepository.softDelete(hash)` (`sess_deleted_at = now`).
- Output: `{ ok: true }`.

#### `GetSession`

- Input: token hash.
- Busca sesión activa.
- Si no existe/deleted/expired → `null`.
- Si `expires_at - now < 15 días` → `updateExpiresAt(id, now + 30 días)` y
  marca `renewed`.
- Output: `{ user: { id, email, name }, renewed?: boolean }`.

## 6. Infraestructura y adapters

### 6.1 Migración inicial (`001_initial.ts`)

Crea, en orden de dependencias:

1. Lookups globales: `sino`, `apps`, `currency` (con seed ARS y apps Core).
2. Auth: `user` (con FK a `sino`), `login`, `session`, `email_sending`.
3. Seed transaccional: `task_state`, `accounts`, `types`, `categories`.
4. Índices: `idx_login_email_created`, `idx_session_user`, etc.
5. FKs del hijo al padre según PRD §11.

`down` dropea tablas en orden inverso. Se documenta explícitamente que es
destructivo y solo aplica en este stage sin datos productivos.

### 6.2 Crypto adapters

- `crypto/otp-generator.ts`: `crypto.randomInt(0, 1_000_000).toString().padStart(6, '0')`.
- `crypto/token-hasher.ts`: SHA-256 con comparación `timingSafeEqual`.
- `crypto/id-generator.ts`: UUIDv7 vía paquete `uuidv7` (nueva dependencia en
  `@crm/api`).

### 6.3 Email

- `email/console-email-sender.ts`: implementa `EmailSender`; imprime
  `console.info` con from/to/subject/body en dev.
- `email/email-sending-task.ts`: task nitro que corre periódicamente (cada 60s
  en dev) y drena `email_sending` con estado pending, llamando al adapter.

### 6.4 Kysely

- `DatabaseSchema` se extiende con las tablas del change.
- Repositorios implementan los puertos usando kysely.
- Todos los métodos que modifican datos aceptan un `trx` opcional para el seed
  transaccional de `VerifyOtp`.

## 7. HTTP y cookies

### 7.1 Router

`createRpcFetchHandler` en `src/http/router.ts` pasa de recibir solo
`getHealth` a recibir un objeto `{ getHealth, requestOtp, verifyOtp, logout,
getSession }` e implementar tanto `health` como `auth` sobre sus contratos.

### 7.2 Cookie helpers (`src/http/auth/cookie.ts`)

- `getSessionToken(event): string | undefined` usando `getCookie(event,
  COOKIE_NAME)`.
- `setSessionCookie(event, token, maxAge)` usando `setCookie(event, COOKIE_NAME,
  token, { httpOnly, secure, sameSite, path, maxAge })`.
- `deleteSessionCookie(event)` usando `deleteCookie`.

### 7.3 Handlers

- `requestOtp`: llama al caso de uso; en `RATE_LIMITED` devuelve 429.
- `verifyOtp`: llama al caso de uso; si `verdict === 'valid'`, setea la cookie
  con `sessionToken`.
- `logout`: lee cookie, llama al caso de uso, borra cookie.
- `session`: lee cookie, llama al caso de uso; si `renewed`, re-setea cookie.
  Sin sesión devuelve 401.

## 8. Frontend

### 8.1 Cliente RPC (`apps/web/src/lib/api/rpc.ts`)

```ts
import { createORPCClient } from "@orpc/client";
import { authContract } from "@crm/types";

export function createRpcClient(baseURL: string) {
  return createORPCClient(authContract, {
    baseURL,
    fetch: (input, init) => fetch(input, { ...init, credentials: "include" }),
  });
}
```

### 8.2 OtpVerifier real (`apps/web/src/lib/otp/rpc-verifier.ts`)

```ts
import type { OtpVerifier, Verdict } from "./otp-machine";
import { createRpcClient } from "../api/rpc";

export function createRpcOtpVerifier(email: string): OtpVerifier {
  const rpc = createRpcClient(import.meta.env.VITE_API_URL ?? "/rpc");
  return {
    async verify(code: string): Promise<Verdict> {
      const result = await rpc.auth.verifyOtp.mutate({ email, code });
      return result.verdict;
    },
  };
}
```

### 8.3 Swap en `otp-form.tsrx`

```ts
import { createRpcOtpVerifier } from "../../../lib/otp/rpc-verifier";

// dentro del componente, con email desde props o query:
const email = props.email; // ya se lee del query en la página
machineRef.current = createOtpMachine({
  verifier: createRpcOtpVerifier(email),
});
```

### 8.4 Login-form

- Estados locales `isLoading` y `requestError`.
- `handleSubmit` válida email, setea loading, llama
  `rpc.auth.requestOtp.mutate({ email })`.
- En éxito navega a `/login-verification?email=...`.
- En error (rate-limit, network) muestra `StatusMessage` con
  `t("auth.login.errorRequestOtp")`.

### 8.5 Shell guard

- Nuevo `src/lib/nav/session-guard.ts` exporta `requireSession` (Middleware de
  Octane) que consulta `/rpc/auth/session` con `credentials: 'include'`.
  - Sin sesión: 302 a `/login`.
  - Con sesión: continúa.
- `rootRedirect` se reemplaza por `authRedirect`:
  - Si hay sesión → 302 a `/dashboard`.
  - Si no → 302 a `/login`.
- En `octane.config.ts`:
  - `/` mantiene `before: [authRedirect]`.
  - `shellRoute` añade `before: [requireSession]`.

## 9. Tests

### 9.1 Unitarios (obligatorios, primero)

- `apps/api/src/application/auth/request-otp.test.ts`
- `apps/api/src/application/auth/verify-otp.test.ts`
- `apps/api/src/application/auth/logout.test.ts`
- `apps/api/src/application/auth/get-session.test.ts`
- `apps/api/src/infrastructure/crypto/token-hasher.test.ts`
- `apps/web/src/lib/otp/rpc-verifier.test.ts` (mock del cliente orpc).

Usan repositorios in-memory, `FixedClock`, `FakeOtpGenerator`,
`FakeTokenHasher`, `FakeIdGenerator`.

### 9.2 Integración opt-in

- `apps/api/src/infrastructure/kysely/login-repository.integration.test.ts`
- `apps/api/src/infrastructure/kysely/session-repository.integration.test.ts`
- `apps/api/src/http/auth.integration.test.ts` (end-to-end con cookie).

Se ejecutan solo si `TEST_DATABASE_URL` está definida. Cada suite levanta el
schema con `bun run db:migrate` contra la URL de test.

### 9.3 Smoke test existente

`apps/api/src/http/router.test.ts` sigue pasando sin postgres ni OTLP; se
mantiene el patrón del repo.

## 10. Seguridad

- **Token nunca en claro en DB:** solo `sess_token_hash`.
- **Comparaciones constant-time:** OTP y token hash.
- **Cookie httpOnly + sameSite lax**; secure según entorno.
- **Rate-limit por email** basado en índice `(logi_email, logi_created_at)`.
- **OTP:** 6 dígitos, expira a 10 min, máx 5 intentos; el servidor es fuente de
  verdad; la máquina solo refleja.
- **Logout:** borrado lógico inmediato; reutilizar cookie falla.

## 11. Riesgos y mitigaciones

| Riesgo | Mitigación |
| --- | --- |
| **size > 400 líneas** | La fase `plan`/apply evalúa chaining bajo `ask-on-risk`; design no decide delivery. |
| **Baseline web-auth-ui** | No se tocan `OtpVerifier`, `Verdict`, constantes, UI ni máquina; solo swap de 1 línea. |
| **Cookie cross-origin dev** | `secure: false` en dev; sameSite lax es viable en localhost same-site. |
| **Seed transaccional frágil** | Tests de integración opt-in; transacción kysely con rollback en tests. |
| **Rate-limit sin índice** | Migración incluye `idx_login_email_created` explícitamente. |

## 12. Success criteria mapping

| Criterio | Cómo se satisface |
| --- | --- |
| 1. Código con ceros valida | `otpCodeSchema` string + `VerifyOtp` con timing-safe compare + crea sesión/cookie. |
| 2. Expirado / 5 intentos | Backend mapea a `Verdict` (`expired` / `invalid`); UI usa mensajes existentes. |
| 3. Rate-limit 3/hora | `RequestOtp` cuenta logins recientes y rechaza el 4.º. |
| 4. Reload mantiene sesión | Guard de shell + `/` redirige a `/dashboard` con sesión activa. |
| 5. Logout invalida cookie | `Logout` soft-delete + borra cookie; reutilización falla. |
| 6. Registro implícito con seed | `VerifyOtp` ejecuta transacción: user + task_state + Efectivo/ARS + tipos/categorías base. |
| 7. Email encolado y task dev | `EmailSendingRepository` + task nitro + `ConsoleEmailSender`. |
| 8. `bun test` verde sin DB | Smoke + unitarios con fakes; integración opt-in. |
| 9. Swap sin tocar UI | `otp-form.tsrx` cambia 1 línea de inyección del verifier. |

## 13. Archivos a crear/modificar (resumen)

### Nuevos

- `packages/types/src/contracts/auth.ts`
- `packages/types/src/index.ts` (exporta auth)
- `apps/api/src/domain/ports/{user,login,session,email-sending}-repository.ts`
- `apps/api/src/domain/ports/{email-sender,otp-generator,token-hasher,id-generator,clock}.ts`
- `apps/api/src/application/auth/{request-otp,verify-otp,logout,get-session}.ts`
- `apps/api/src/application/auth/*.test.ts`
- `apps/api/src/infrastructure/kysely/migrations/001_initial.ts`
- `apps/api/src/infrastructure/kysely/migrate.ts`
- `apps/api/src/infrastructure/kysely/*-repository.ts`
- `apps/api/src/infrastructure/crypto/{otp-generator,token-hasher,id-generator}.ts`
- `apps/api/src/infrastructure/time/{system-clock,fixed-clock}.ts`
- `apps/api/src/infrastructure/email/console-email-sender.ts`
- `apps/api/src/http/auth/{auth-routes,cookie}.ts`
- `apps/api/tasks/email-sending.ts` (nitro task)
- `apps/web/src/lib/api/rpc.ts`
- `apps/web/src/lib/otp/rpc-verifier.ts`
- `apps/web/src/lib/nav/session-guard.ts`

### Modificados

- `apps/api/package.json` (+ `uuidv7`, script `db:migrate`)
- `apps/api/src/infrastructure/kysely/database.ts` (DatabaseSchema extendido)
- `apps/api/src/http/composition-root.ts` (wiring auth)
- `apps/api/src/http/router.ts` (auth contract)
- `apps/api/nitro.config.ts` (task schedule)
- `apps/web/package.json` (+ `@orpc/client`)
- `apps/web/src/components/organisms/otp-form/otp-form.tsrx` (swap verifier)
- `apps/web/src/components/organisms/login-form/login-form.tsrx` (requestOtp)
- `apps/web/src/lib/nav/redirect.ts` (authRedirect)
- `apps/web/octane.config.ts` (before guards)
