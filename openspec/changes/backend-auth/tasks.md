# Tasks — backend-auth

> Fase `tasks` del change `backend-auth`. Fuente de verdad:
>
> - `openspec/changes/backend-auth/proposal.md`
> - `openspec/changes/backend-auth/design.md`
> - `openspec/changes/backend-auth/specs/api-auth/spec.md`
> - `openspec/changes/backend-auth/specs/api/spec.md` (delta)
> - `openspec/changes/backend-auth/specs/web-auth-ui/spec.md` (delta)
> - `openspec/changes/backend-auth/specs/web/spec.md` (delta)
> - `openspec/changes/backend-auth/specs/web-shell/spec.md` (delta)
> - `openspec/config.yaml` (strict TDD, runner `bun test`)

## Review Workload Forecast

| Field | Value |
| ------- | ------- |
| Estimated changed lines | 1,600–2,000 (additions + deletions) |
| 400-line budget risk | High |
| Chained PRs recommended | Yes |
| Suggested split | PR 1 → PR 2 → PR 3: (1) `@crm/types` contracts + domain ports + application use cases; (2) crypto adapters + first Kysely migration + Kysely repos + HTTP layer + email task; (3) web RPC client + verifier swap + login-form wiring + shell guards + integration/acceptance verification |
| Delivery strategy | ask-on-risk |
| Chain strategy | pending |

```text
Decision needed before apply: Yes
Chained PRs recommended: Yes
Chain strategy: pending
400-line budget risk: High
```

> **Nota de tamaño:** este change toca contratos compartidos, ~9 puertos de dominio, 4 casos de uso, la primera migración del repo, adapters kysely/crypto/email, handlers HTTP con cookies, task nitro, cliente RPC y guards del shell. Es casi seguro que supera el presupuesto de 400 líneas: se trata como candidato a *chaining* y la decisión de delivery queda pendiente en apply bajo `ask-on-risk`.

---

## Convenciones aplicables

- Cada work unit sigue el ciclo strict TDD: **RED → GREEN → TRIANGULATE → REFACTOR**.
- Los tests unitarios usan repositorios in-memory, `FixedClock` y generadores falsos.
- Los tests de integración son archivos `*.integration.test.ts` que se saltan si no está definida `TEST_DATABASE_URL`.
- Todo archivo de dominio/aplicación debe permanecer libre de imports de `kysely`, `h3`, `nitro` o `node:crypto` (salvo adapters bajo `src/infrastructure/`).
- Después de cada work unit se actualiza `openspec/changes/backend-auth/apply-progress.md` con la evidencia del ciclo TDD.

---

## Work Unit 1 — Contratos compartidos y puertos de dominio

**Entregable:** `packages/types` expone el contrato de auth y `apps/api` define todos los puertos de dominio. No hay lógica de aplicación todavía.

### RED

- [x] Escribir tests fallidos en `packages/types/src/contracts/auth.test.ts` para `emailSchema`, `otpCodeSchema` (código con ceros a la izquierda, código de 5 dígitos, código con letras, tipo numérico) y los schemas de salida de `verifyOtp`/`session`. <!-- sdd-owner: implementation -->

### GREEN

- [x] Implementar `packages/types/src/contracts/auth.ts` con `requestOtp`, `verifyOtp`, `logout`, `session` bajo prefijo `/auth`, usando `oc`/`zod` y manteniendo el `Verdict` `valid | invalid | expired`. <!-- sdd-owner: implementation -->
- [x] Re-exportar el contrato desde `packages/types/src/index.ts`. <!-- sdd-owner: implementation -->

### TRIANGULATE

- [x] Agregar casos de borde en `auth.test.ts`: email con mayúsculas en input, veredicto `expired`, output de `session` con UUID. <!-- sdd-owner: implementation -->

### REFACTOR

- [x] Eliminar duplicación en los schemas; asegurar que el OTP nunca se modele como número. <!-- sdd-owner: implementation -->
- [x] Crear los puertos de dominio en `apps/api/src/domain/ports/`: `user-repository.ts`, `login-repository.ts`, `session-repository.ts`, `email-sending-repository.ts`, `email-sender.ts`, `otp-generator.ts`, `token-hasher.ts`, `id-generator.ts`, `clock.ts`. <!-- sdd-owner: implementation -->
- [x] Definir `RateLimitedError` en `apps/api/src/application/auth/errors.ts`. <!-- sdd-owner: implementation -->
- [x] Registrar la evidencia del ciclo TDD de la Work Unit 1 en `openspec/changes/backend-auth/apply-progress.md`. <!-- sdd-owner: implementation -->

---

## Work Unit 2 — Casos de uso: flujo OTP

**Entregable:** `RequestOtp` y `VerifyOtp` implementados y testeados con repositorios in-memory.

### RED

- [x] Escribir tests fallidos para `RequestOtp` en `apps/api/src/application/auth/request-otp.test.ts`: solicitud válida, rate-limit en el 4.º envío dentro de una hora, email normalizado a minúsculas, límite exacto en 3 envíos/hora. Usar repositorios in-memory definidos en el mismo archivo o en un helper local. <!-- sdd-owner: implementation -->

### GREEN

- [x] Implementar `apps/api/src/application/auth/request-otp.ts` que normalice email, aplique rate-limit, genere OTP, persista `login` y encole `email_sending`. <!-- sdd-owner: implementation -->

### TRIANGULATE

- [x] Agregar test de que un rate-limit no cree filas en `login` ni `email_sending`, y que `expiresAt` sea exactamente `now + 10 min`. <!-- sdd-owner: implementation -->

### REFACTOR

- [x] Extraer constantes de ventana de rate-limit y TTL de OTP; asegurar que `Clock` sea el único origen de tiempo. <!-- sdd-owner: implementation -->
- [x] Registrar la evidencia del ciclo TDD de la Work Unit 2 en `openspec/changes/backend-auth/apply-progress.md`. <!-- sdd-owner: implementation -->

### RED

- [x] Escribir tests fallidos para `VerifyOtp` en `apps/api/src/application/auth/verify-otp.test.ts`: código con ceros a la izquierda válido, código expirado, 5 intentos fallidos bloquean el login, código incorrecto incrementa intentos, comparación a tiempo constante. <!-- sdd-owner: implementation -->

### GREEN

- [x] Implementar `apps/api/src/application/auth/verify-otp.ts` con búsqueda del login más reciente no consumido, reglas de expiración/intentos, comparación `timingSafeEqual`, registro implícito con seed y creación de sesión. <!-- sdd-owner: implementation -->

### TRIANGULATE

- [x] Agregar tests de usuario existente (no re-seed) y de rollback transaccional del seed (simular fallo en una inserción y verificar que no quedan datos parciales). <!-- sdd-owner: implementation -->

### REFACTOR

- [x] Si el seed transaccional crece, extraerlo a un colaborador privado o puerto `UserSeedService` manteniendo la transacción como parámetro opcional. <!-- sdd-owner: implementation -->
- [x] Registrar la evidencia del ciclo TDD del flujo OTP en `openspec/changes/backend-auth/apply-progress.md`. <!-- sdd-owner: implementation -->

---

## Work Unit 3 — Casos de uso: sesión y logout

**Entregable:** `GetSession` (con renovación deslizante) y `Logout` (borrado lógico) implementados y testeados.

### RED

- [x] Escribir tests fallidos para `GetSession` en `apps/api/src/application/auth/get-session.test.ts`: sesión inexistente/devuelta/expirada → `null`; sesión activa → usuario; expiración a < 15 días → extensión a `now + 30 días` y `renewed = true`; expiración > 15 días → sin cambios. <!-- sdd-owner: implementation -->

### GREEN

- [x] Implementar `apps/api/src/application/auth/get-session.ts`. <!-- sdd-owner: implementation -->

### TRIANGULATE

- [x] Agregar test de que la comparación de hashes usa siempre comparación a tiempo constante. <!-- sdd-owner: implementation -->

### REFACTOR

- [x] Extraer constantes de duración total (30 días) y umbral de renovación (15 días). <!-- sdd-owner: implementation -->
- [x] Registrar la evidencia del ciclo TDD de `GetSession` en `openspec/changes/backend-auth/apply-progress.md`. <!-- sdd-owner: implementation -->

### RED

- [x] Escribir tests fallidos para `Logout` en `apps/api/src/application/auth/logout.test.ts`: sesión activa queda marcada con `sess_deleted_at`; posterior `GetSession` devuelve `null`. <!-- sdd-owner: implementation -->

### GREEN

- [x] Implementar `apps/api/src/application/auth/logout.ts`. <!-- sdd-owner: implementation -->

### TRIANGULATE

- [x] Agregar test de que logout con token inexistente no falla. <!-- sdd-owner: implementation -->

### REFACTOR

- [x] Compartir la lógica de hash de token entre `VerifyOtp`, `GetSession` y `Logout`. <!-- sdd-owner: implementation -->
- [x] Registrar la evidencia del ciclo TDD de `Logout` en `openspec/changes/backend-auth/apply-progress.md`. <!-- sdd-owner: implementation -->

---

## Work Unit 4 — Adapters de crypto, IDs y tiempo

**Entregable:** adapters concretos para aleatoriedad, hashing, identificadores y reloj.

### RED

- [x] Escribir tests fallidos en `apps/api/src/infrastructure/crypto/otp-generator.test.ts` para longitud 6, dígitos y posibilidad de ceros a la izquierda. <!-- sdd-owner: implementation -->

### GREEN

- [x] Implementar `apps/api/src/infrastructure/crypto/otp-generator.ts` usando `crypto.randomInt`. <!-- sdd-owner: implementation -->

### TRIANGULATE

- [x] Agregar test de 100 muestras que verifique longitud y rango `[000000, 999999]`. <!-- sdd-owner: implementation -->

### REFACTOR

- [x] Revisar que no haya sesgo por módulo; documentar por qué `randomInt` es adecuado. <!-- sdd-owner: implementation -->
- [x] Registrar la evidencia del ciclo TDD del OTP generator en `openspec/changes/backend-auth/apply-progress.md`. <!-- sdd-owner: implementation -->

### RED

- [x] Escribir tests fallidos en `apps/api/src/infrastructure/crypto/token-hasher.test.ts` para hash SHA-256, verificación positiva/negativa y comparación a tiempo constante. <!-- sdd-owner: implementation -->

### GREEN

- [x] Implementar `apps/api/src/infrastructure/crypto/token-hasher.ts` con SHA-256 y `crypto.timingSafeEqual`. <!-- sdd-owner: implementation -->

### TRIANGULATE

- [x] Agregar test de que tokens de distinta longitud no verifican. <!-- sdd-owner: implementation -->

### REFACTOR

- [x] Normalizar buffers a igual longitud antes de `timingSafeEqual`. <!-- sdd-owner: implementation -->
- [x] Registrar la evidencia del ciclo TDD del token hasher en `openspec/changes/backend-auth/apply-progress.md`. <!-- sdd-owner: implementation -->

### RED

- [x] Escribir tests fallidos en `apps/api/src/infrastructure/crypto/id-generator.test.ts` para formato UUIDv7. <!-- sdd-owner: implementation -->

### GREEN

- [x] Agregar `uuidv7` a `apps/api/package.json` e implementar `apps/api/src/infrastructure/crypto/id-generator.ts`. <!-- sdd-owner: implementation -->

### TRIANGULATE

- [x] Validar versión/variante del UUID generado. <!-- sdd-owner: implementation -->

### REFACTOR

- [x] Registrar la evidencia del ciclo TDD del ID generator en `openspec/changes/backend-auth/apply-progress.md`. <!-- sdd-owner: implementation -->

- [x] Implementar `apps/api/src/infrastructure/time/system-clock.ts` y `apps/api/src/infrastructure/time/fixed-clock.ts` (este último para tests). <!-- sdd-owner: implementation -->

---

## Work Unit 5 — Migración inicial y repositorios Kysely

**Entregable:** primera migración versionada, runner explícito y adapters kysely de los repositorios de auth.

### RED

- [x] Escribir tests de integración fallidos en `apps/api/src/infrastructure/kysely/login-repository.integration.test.ts` y `session-repository.integration.test.ts` que se salten si falta `TEST_DATABASE_URL` y verifiquen CRUD básico + índice de rate-limit. <!-- sdd-owner: implementation -->

### GREEN

- [x] Implementar `apps/api/src/infrastructure/kysely/migrations/001_initial.ts` creando `sino`, `apps`, `currency`, `user`, `login`, `session`, `email_sending`, `task_state`, `accounts`, `types`, `categories`, índices y FKs según design D6/D1. <!-- sdd-owner: implementation -->
- [x] Implementar `down` de la migración en orden inverso y documentar que es destructivo y solo para este stage. <!-- sdd-owner: implementation -->
- [x] Extender `apps/api/src/infrastructure/kysely/database.ts` con `DatabaseSchema` que refleje las tablas de la migración. <!-- sdd-owner: implementation -->
- [x] Implementar `apps/api/src/infrastructure/kysely/migrate.ts` con `FileMigrationProvider` y `Migrator`, y agregar el script `db:migrate` en `apps/api/package.json`. <!-- sdd-owner: implementation -->
- [x] Implementar adapters kysely: `apps/api/src/infrastructure/kysely/user-repository.ts`, `login-repository.ts`, `session-repository.ts`, `email-sending-repository.ts`; todos los métodos de escritura aceptan un `trx` opcional. <!-- sdd-owner: implementation -->
- [x] Ejecutar `bun run db:migrate` contra una base de test y verificar que los tests de integración pasan. <!-- sdd-owner: implementation -->

### TRIANGULATE

- [x] Agregar test de integración que valide rate-limit exacto usando el índice `idx_login_email_created`. <!-- sdd-owner: implementation -->

### REFACTOR

- [x] Extraer helpers de timestamps/IDs en los repos kysely; validar que `down` dropee tablas en orden correcto sin errores de FK. <!-- sdd-owner: implementation -->
- [x] Registrar la evidencia del ciclo TDD de la Work Unit 5 en `openspec/changes/backend-auth/apply-progress.md`. <!-- sdd-owner: implementation -->

---

## Work Unit 6 — HTTP, cookies, composition root y task de email

**Entregable:** handlers orpc para auth, helpers de cookie, wiring en composition root, sender dev y task nitro de drenaje.

### RED

- [x] Escribir tests de integración fallidos en `apps/api/src/http/auth.integration.test.ts` (skip sin `TEST_DATABASE_URL`): `requestOtp` devuelve 200 y encola email; 4.º envío devuelve 429; `verifyOtp` con código `041283` devuelve `valid` y setea cookie httpOnly; `session` devuelve 401 sin cookie y 200 con cookie; `logout` borra la cookie y deja `session` en 401. <!-- sdd-owner: implementation -->

### GREEN

- [x] Implementar `apps/api/src/http/auth/cookie.ts` con `getSessionToken`, `setSessionCookie` y `deleteSessionCookie`; usar flags `httpOnly`, `sameSite: 'lax'`, `path: '/'`, `maxAge` 30 días y `secure` desde `SESSION_COOKIE_SECURE`. <!-- sdd-owner: implementation -->
- [x] Implementar `apps/api/src/http/auth/auth-routes.ts` con handlers para `requestOtp`, `verifyOtp`, `logout` y `session` usando h3. <!-- sdd-owner: implementation -->
- [x] Actualizar `apps/api/src/http/router.ts` para exponer `authContract` junto al `healthContract` existente. <!-- sdd-owner: implementation -->
- [x] Actualizar `apps/api/src/http/composition-root.ts` para instanciar `createDatabase`, repositorios kysely, adapters crypto/email/time y casos de uso, y montar `/rpc/**`. <!-- sdd-owner: implementation -->
- [x] Implementar `apps/api/src/infrastructure/email/console-email-sender.ts` (adapter dev). <!-- sdd-owner: implementation -->
- [x] Implementar `apps/api/tasks/email-sending.ts` para drenar `email_sending` y programarla en `apps/api/nitro.config.ts`. <!-- sdd-owner: implementation -->
- [x] Asegurar que `apps/api/src/http/router.test.ts` sigue pasando sin postgres ni OTLP. <!-- sdd-owner: implementation -->

### TRIANGULATE

- [x] Agregar test de integración que inspeccione `Set-Cookie` y verifique `HttpOnly`, `SameSite=Lax`, `Path=/` y `Max-Age` de 30 días. <!-- sdd-owner: implementation -->

### REFACTOR

- [x] Extraer nombre y duración de la cookie a constantes compartidas entre `cookie.ts` y tests. <!-- sdd-owner: implementation -->
- [x] Registrar la evidencia del ciclo TDD de la Work Unit 6 en `openspec/changes/backend-auth/apply-progress.md`. <!-- sdd-owner: implementation -->

---

## Work Unit 7 — Cliente RPC web, swap del verifier, login-form y guards del shell

**Entregable:** web consume el backend real sin tocar UI, máquina OTP ni contratos, y las rutas del shell quedan protegidas.

### RED

- [x] Escribir tests fallidos en `apps/web/src/lib/otp/rpc-verifier.test.ts` mockeando el cliente orpc y verificando que `valid`, `invalid` y `expired` se devuelven sin transformación. <!-- sdd-owner: implementation -->

### GREEN

- [x] Agregar `@orpc/client` a `apps/web/package.json`. <!-- sdd-owner: implementation -->
- [x] Implementar `apps/web/src/lib/api/rpc.ts` con `createRpcClient(baseURL)` usando `credentials: 'include'`. <!-- sdd-owner: implementation -->
- [x] Implementar `apps/web/src/lib/otp/rpc-verifier.ts` con `createRpcOtpVerifier(email)` que capture el email en closure. <!-- sdd-owner: implementation -->
- [x] Reemplazar `new FakeOtpVerifier()` por `createRpcOtpVerifier(email)` en `apps/web/src/components/organisms/otp-form/otp-form.tsrx`. <!-- sdd-owner: implementation -->

### TRIANGULATE

- [x] Agregar test de que el email cerrado en la closure se envía en el payload de `verifyOtp`. <!-- sdd-owner: implementation -->

### REFACTOR

- [x] Asegurar que `VITE_API_URL` tenga fallback razonable (`/rpc` o similar). <!-- sdd-owner: implementation -->
- [x] Registrar la evidencia del ciclo TDD del verifier RPC en `openspec/changes/backend-auth/apply-progress.md`. <!-- sdd-owner: implementation -->

### RED

- [x] Escribir tests fallidos en `apps/web/src/lib/nav/redirect.test.ts` para `authRedirect`: sin sesión → `/login`; con sesión → `/dashboard`. <!-- sdd-owner: implementation -->

### GREEN

- [x] Refactorizar `apps/web/src/lib/nav/redirect.ts` de `rootRedirect` a `authRedirect` con la consulta de sesión inyectada. <!-- sdd-owner: implementation -->
- [x] Actualizar `apps/web/octane.config.ts` para usar `authRedirect` en `/` y añadir `requireSession` como `before` en `shellRoute`. <!-- sdd-owner: implementation -->

### TRIANGULATE

- [x] Agregar test de que un error de red en la consulta de sesión redirige a `/login`. <!-- sdd-owner: implementation -->

### REFACTOR

- [x] Compartir helper de respuesta 302 si se duplica entre `authRedirect` y `requireSession`. <!-- sdd-owner: implementation -->
- [x] Registrar la evidencia del ciclo TDD del redirect en `openspec/changes/backend-auth/apply-progress.md`. <!-- sdd-owner: implementation -->

### RED

- [x] Escribir tests fallidos en `apps/web/src/lib/nav/session-guard.test.ts` para `requireSession`: sin sesión → 302 a `/login`; con sesión → continúa (devuelve `undefined`/`next`). <!-- sdd-owner: implementation -->

### GREEN

- [x] Implementar `apps/web/src/lib/nav/session-guard.ts` con la consulta de sesión inyectada y `credentials: 'include'`. <!-- sdd-owner: implementation -->

### TRIANGULATE

- [x] Agregar test de que el header `Location` es exactamente `/login`. <!-- sdd-owner: implementation -->

### REFACTOR

- [x] Verificar que `requireSession` no depende del DOM y que `shellRoute` lo aplica a todas las rutas del shell sin modificar las 8 declaraciones. <!-- sdd-owner: implementation -->
- [x] Registrar la evidencia del ciclo TDD del session guard en `openspec/changes/backend-auth/apply-progress.md`. <!-- sdd-owner: implementation -->

### RED

- [x] Escribir tests fallidos para la lógica de envío de `login-form` (puede extraerse una función pura o testearse sobre el componente si el repo lo permite): email inválido no navega; `requestOtp` exitoso navega a `/login-verification?email=...`; rate-limit muestra error sin navegar. <!-- sdd-owner: implementation -->

### GREEN

- [x] Actualizar `apps/web/src/components/organisms/login-form/login-form.tsrx` para llamar a `rpc.auth.requestOtp.mutate`, manejar `isLoading`/`requestError` y navegar solo en éxito. <!-- sdd-owner: implementation -->

### TRIANGULATE

- [x] Agregar test/verificación de que el mensaje de error usa el token de i18n `auth.login.errorRequestOtp`. <!-- sdd-owner: implementation -->

### REFACTOR

- [x] Si el componente crece, extraer la llamada a `requestOtp` a un hook o helper puro. <!-- sdd-owner: implementation -->
- [x] Registrar la evidencia del ciclo TDD del login-form en `openspec/changes/backend-auth/apply-progress.md`. <!-- sdd-owner: implementation -->

---

## Work Unit 8 — Verificación de aceptación y cierre

**Entregable:** `bun test` verde en workspace raíz, integración opt-in verificada y criterios de aceptación cubiertos.

- [x] Ejecutar `bun test` en la raíz del workspace sin postgres levantado ni `OTEL_EXPORTER_OTLP_ENDPOINT`; confirmar que todos los tests unitarios y smoke pasan y los `*.integration.test.ts` se saltan. <!-- sdd-owner: implementation -->
- [x] Ejecutar `bun test` con `TEST_DATABASE_URL` y la base migrada; confirmar que los tests de integración pasan y limpian/revierten sus datos. <!-- sdd-owner: implementation -->
- [x] Verificar manualmente los criterios de aceptación de `openspec/changes/backend-auth/specs/api-auth/spec.md`: código con ceros a la izquierda, rate-limit 3/hora, expiración 10 min, 5 intentos, cookie httpOnly, renovación deslizante 15/30 días, logout lógico, seed transaccional, task de email dev. <!-- sdd-owner: implementation -->
- [x] Verificar que `OtpVerifier`, `Verdict`, constantes OTP, UI y máquina OTP de `web-auth-ui` no cambiaron; solo hay swap de verifier en `otp-form.tsrx`. <!-- sdd-owner: implementation -->
- [x] Completar `openspec/changes/backend-auth/apply-progress.md` con la tabla final de evidencia TDD, lista de verificación y enlaces/resumen de ejecución de tests. <!-- sdd-owner: implementation -->
