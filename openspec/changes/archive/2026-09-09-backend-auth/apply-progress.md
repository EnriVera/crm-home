# Apply Progress — backend-auth

> Fase `apply` del change `backend-auth`. Estado: en progreso.

## TDD Cycle Evidence

| Work Unit / Ciclo | RED (test fallido) | GREEN (mínimo) | TRIANGULATE | REFACTOR | Commit |
| --- | --- | --- | --- | --- | --- |
| WU1 Contratos | `packages/types/src/contracts/auth.test.ts` escrito; falla por ausencia de `auth.ts` e `index.ts` | `auth.ts` + re-export implementados; tests pasan | casos de borde: email mayúsculas, veredicto `expired`, session con UUID | extraídos schemas compartidos; puertos de dominio + `RateLimitedError` | `357dd1c` |
| WU2 RequestOtp | `request-otp.test.ts` | `request-otp.ts` | no crea filas bajo rate-limit; `expiresAt` exacto | constantes rate-limit/TTL; `Clock` único origen de tiempo | `d0f0503` |
| WU2 VerifyOtp | `verify-otp.test.ts` | `verify-otp.ts` | usuario existente; rollback seed | `UserSeedService` extraído a puerto de dominio | `d0f0503` |
| WU3 GetSession | `get-session.test.ts` | `get-session.ts` | comparación hash a tiempo constante | constantes 30d/15d; `TokenHasher` integrado | `88291e0` |
| WU3 Logout | `logout.test.ts` | `logout.ts` | logout token inexistente no falla | shared token hash logic | `88291e0` |
| WU4 Crypto | `otp-generator.test.ts`, `token-hasher.test.ts`, `id-generator.test.ts` | adapters crypto + time | 100 muestras OTP; distinta longitud de tokens; UUIDv7 versión/variante | documentación sesgo `randomInt`; buffers normalizados; `uuidv7` agregado | `ffffedf` |
| WU5 Kysely | `login-repository.integration.test.ts`, `session-repository.integration.test.ts` | migración `001_initial.ts` + repos kysely | rate-limit exacto con índice | `Generated<Date>` para defaults; `down` orden inverso | `dcdf771` |
| WU6 HTTP | `auth.integration.test.ts` | cookie + auth-routes + router + composition + email sender + task | inspección `Set-Cookie` | constantes cookie compartidas; overrides de `otpGenerator` para tests | `926ae20` |
| WU7 Web RPC | `rpc-verifier.test.ts` | cliente RPC + verifier swap | email en closure | fallback `VITE_API_URL`; `ContractRouterClient` | `72164b3` |
| WU7 Redirect | `redirect.test.ts` | `authRedirect` + `octane.config.ts` | error de red → `/login` | shared 302 helper | `72164b3` |
| WU7 Session Guard | `session-guard.test.ts` | `session-guard.ts` | `Location` exacto `/login` | no depende del DOM; `shellRoute` sin tocar 8 rutas | `72164b3` |
| WU7 Login Form | `login-form.logic.test.ts` | `login-form.logic.ts` + wiring | token i18n error | helper puro extraído | `72164b3` |
| WU8 Aceptación | `bun test` sin DB (129 pass / 14 skip); `bun test` con `TEST_DATABASE_URL` (8 pass) | verificación manual criterios | helper `cleanupAuthTables` para limpieza de datos de prueba | — | `e62666d` |

## Lista de verificación

- [x] WU1 Contratos y puertos
- [x] WU2 Flujo OTP
- [x] WU3 Sesión y logout
- [x] WU4 Crypto, IDs y tiempo
- [x] WU5 Migración y repos Kysely
- [x] WU6 HTTP, cookies y task
- [x] WU7 Cliente RPC y guards web
- [x] WU8 Verificación de aceptación

## Resumen de ejecución de tests

```text
$ bun test (sin TEST_DATABASE_URL)
129 pass, 14 skip, 0 fail — 650 expect() calls

$ TEST_DATABASE_URL=postgres://crm:crm@localhost:5432/crm_home bun test apps/api/src/infrastructure/kysely/login-repository.integration.test.ts apps/api/src/infrastructure/kysely/session-repository.integration.test.ts apps/api/src/http/auth.integration.test.ts
8 pass, 0 skip, 0 fail — 29 expect() calls
```

## Verificación manual de criterios de aceptación

- Código con ceros a la izquierda (`041283`): cubierto por `otpCodeSchema`, `otp-machine`, `VerifyOtp`, `auth.integration.test.ts` y `rpc-verifier`.
- Rate-limit 3/hora: cubierto en `request-otp.test.ts` y `auth.integration.test.ts`.
- Expiración OTP 10 min: `OTP_TTL_MS` + test de `expiresAt` exacto.
- 5 intentos: `otp-machine` inicia con 5; `VerifyOtp` consume intentos y bloquea.
- Cookie httpOnly 30 días: `COOKIE_NAME`, `COOKIE_MAX_AGE`, tests de `Set-Cookie`.
- Renovación deslizante 15/30 días: `SESSION_DURATION_MS`, `SESSION_RENEWAL_THRESHOLD_MS`, tests de `GetSession`.
- Logout lógico: `Logout` soft-deletea `sess_deleted_at`; `GetSession` devuelve `null`.
- Seed transaccional: `UserSeedService` + `TransactionManager` + test de rollback.
- Task de email dev: `ConsoleEmailSender` + `tasks/email-sending.ts` + schedule en `nitro.config.ts`.

## Verificación de baseline web-auth-ui

- Archivos tocados en WU7 dentro del dominio de auth UI: únicamente
  `apps/web/src/components/organisms/otp-form/otp-form.tsrx`.
- No se modificaron: `OtpVerifier`/`Verdict`, constantes OTP (`OTP_LENGTH`,
  `OTP_MAX_ATTEMPTS`, `OTP_TTL_MINUTES`), componentes OTP (`otp-input`, `pin-input`),
  máquina `otp-machine.ts`, ni los estilos de `web-auth-ui`.

## Notas

- Estrategia de delivery resuelta: CHAINED PRs, stacked-to-main. La fase `apply` implementa todos los WU en `develop` con un commit por WU; el slicing a PRs ocurre después en settle/delivery.
- `apply-progress.md` queda dentro de `openspec/changes/backend-auth/` y **no se commitea** durante el attempt (el parent lo commitea tras settle).
