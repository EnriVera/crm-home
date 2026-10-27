---
type: "Referencia"
title: "Autenticación OTP y ciclo de vida de la sesión"
openwiki_generated: true
verified:
  - by: openwiki/0.7.2
    at: 2026-10-27T02:48:33.191Z
sources:
  - id: openwiki-source-b69d315031be9fbf10064f22
    resource: repo://apps/api/src/application/auth/constants.ts
  - id: openwiki-source-38959eaa1e497b24b918ade9
    resource: repo://apps/api/src/application/auth/get-session.ts
  - id: openwiki-source-1da1d25de1713c2cd5bcc3cf
    resource: repo://apps/api/src/application/auth/logout.ts
  - id: openwiki-source-c3753f41378893be433b928e
    resource: repo://apps/api/src/application/auth/request-otp.ts
  - id: openwiki-source-9e0d7a12c089cb29b8641197
    resource: repo://apps/api/src/application/auth/verify-otp.ts
  - id: openwiki-source-021ec0b86569d905aa49e1ee
    resource: repo://apps/api/src/http/auth/auth-routes.ts
  - id: openwiki-source-90698db31d3217565a7cef93
    resource: repo://apps/api/src/http/auth/cookie.ts
  - id: openwiki-source-d0f5255a69eff7ac2cf80b4c
    resource: repo://apps/api/src/infrastructure/crypto/otp-generator.ts
  - id: openwiki-source-ecc1ede31ccb8fc3e0bb1528
    resource: repo://apps/api/src/infrastructure/crypto/secure-comparator.ts
  - id: openwiki-source-31008f51b8a724cc2bad3772
    resource: repo://apps/api/src/infrastructure/crypto/token-hasher.ts
  - id: openwiki-source-f7a78c049892f94aa6d960fc
    resource: repo://apps/api/src/infrastructure/kysely/migrations/001_initial.ts
  - id: openwiki-source-4f7411e87488d02403205188
    resource: repo://apps/api/src/infrastructure/kysely/session-repository.ts
generated: { by: "pi", at: "2026-10-27T02:48:33.191Z" }
---


# Autenticación OTP y ciclo de vida de la sesión

La autenticación no usa contraseñas: es un código OTP de seis dígitos enviado
por email, que se canjea por una sesión de 30 días. Todo el flujo vive en el
bounded context `auth` del backend y sigue la misma forma que el resto de los
casos de uso: clase con inyección de puertos + `execute(input)`.

## Constantes del dominio

| Constante | Valor | Significado |
| --- | --- | --- |
| `RATE_LIMIT_MAX_ATTEMPTS` | 3 | códigos enviados por email y hora |
| `RATE_LIMIT_WINDOW_MS` | 1 h | ventana del rate limit |
| `OTP_TTL_MS` | 10 min | vigencia del código |
| `SESSION_TTL_MS` | 30 días | vigencia de la sesión |
| `SESSION_RENEWAL_THRESHOLD_MS` | 15 días | margen bajo el cual la sesión se renueva |

## Solicitar el código

`RequestOtp.execute` normaliza el email (`trim().toLowerCase()`), cuenta los
logins recientes para esa dirección y, si ya hubo tres o más en la última
hora, lanza `RateLimitedError`. El handler HTTP lo traduce a **429** con el
cuerpo `{ code: "RATE_LIMITED", message }`.

Si pasa el rate limit, persiste una fila en `login` con el código, la
expiración (ahora + 10 minutos) y `attempts` en cero, renderiza la plantilla
de email y encola el mensaje en `email_sending` con estado `pending` y
remitente `auth@crmhome.app`. La respuesta al cliente es `{ ok: true }` en
todos los casos válidos: el backend no revela si el email existe.

El código se genera con `crypto.randomInt(0, 1_000_000)` formateado a seis
dígitos con ceros a la izquierda, de modo que los códigos que empiezan con 0
se conservan.

## Verificar el código

`VerifyOtp.execute` devuelve un *verdict* en lugar de lanzar errores, y el
handler solo escribe la cookie cuando el verdict es `valid`:

| Situación | Verdict |
| --- | --- |
| no hay login para ese email | `invalid` |
| el código expiró | `expired` |
| se agotaron los 5 intentos | `invalid` |
| el código no coincide | `invalid` (y se incrementa `attempts`) |
| coincide | `valid` |

La comparación del código es **tiempo constante**: `SecureComparator` compara
los buffers con `timingSafeEqual` y devuelve `false` de inmediato si las
longitudes difieren, sin filtrar información por temporización.

En el camino válido, todo ocurre dentro de **una transacción**: se marca el
login como consumido, se busca el usuario por email —y si no existe se crea
uno nuevo, es decir, el registro es implícito en el primer login exitoso— y se
crea la sesión. Si algo falla, no queda ni un login consumido ni una sesión
huérfana.

## El token de sesión

El token se genera con UUIDv7 y se devuelve **en claro una sola vez**: en el
body de la respuesta de verificación. Lo que se persiste es su hash SHA-256 en
hexadecimal, en la columna `sess_token_hash`; la base de datos nunca guarda el
token utilizable. La verificación posterior recalcula el hash del token
recibido y lo compara con `timingSafeEqual`, de modo que ni la comparación
contra el valor almacenado introduce una fuga de temporización.

La tabla `session` tiene un índice único parcial sobre `sess_token_hash`
filtrando por `sess_deleted_at IS NULL`, de modo que un token no puede estar
activo dos veces y los tokens dados de baja no bloquean el reuso del hash.

## La cookie

El handler escribe la cookie `crm_session` con:

- `httpOnly: true` — el JavaScript de la página no puede leerla;
- `sameSite: "lax"`;
- `path: "/"`;
- `maxAge` de 30 días;
- `secure` salvo que `SESSION_COOKIE_SECURE=false` (necesario en desarrollo
  local sobre HTTP).

El logout borra la cookie replicando los mismos atributos y, en paralelo,
marca la sesión con `sess_deleted_at` (soft delete): el registro queda para
trazabilidad, pero deja de ser resoluble.

## Resolver y renovar la sesión

`GetSession.execute` hashea el token, busca la sesión por hash, descarta las
que están soft-deleted o expiradas, re-verifica el hash con comparación
segura, y devuelve el usuario asociado (id, email, nombre y tema).

Si a la sesión le queda menos de 15 días, se renueva su expiración a 30 días
y el handler vuelve a escribir la cookie para extenderla en el navegador. El
endpoint `GET|POST /auth/session` responde 401 sin cookie o con cookie
inválida, y `{ user }` en caso contrario.

## Cambio de tema

`updateTheme` es una procedure autenticada que valida el tema pedido; un
valor inválido produce `InvalidThemeError` y el handler responde 400 con
`{ code, message }`. Sin cookie válida, responde 401.

## Persistencia

- `login`: código, expiración, contador de intentos y marca de consumo, con
  índice por `(email, created_at)` que soporta el conteo de la ventana de
  rate limit.
- `session`: id, `user_id`, `sess_token_hash`, expiración y borrado lógico.
- El adaptador Kysely resuelve la transacción opcional con el patrón
  `(trx as Database) ?? this.db`, de modo que los casos de uso pueden correr
  dentro o fuera de una transacción sin cambiar el contrato del puerto.

## Tests relacionados

- `apps/api/src/application/auth/request-otp.test.ts`: rate limit, encolado
  del email y TTL.
- `apps/api/src/application/auth/verify-otp.test.ts`: veredictos, incremento
  de intentos, creación transaccional de la sesión y del usuario implícito.
- `apps/api/src/application/auth/get-session.test.ts`: rechazo de sesiones
  expiradas o borradas, y renovación.
- `apps/api/src/http/auth.integration.test.ts` (requiere base de datos): 429
  en el cuarto envío, cookie con `HttpOnly`/`SameSite=Lax`/`Max-Age`, 401 sin
  cookie y borrado de cookie en el logout.
- `apps/api/src/infrastructure/crypto/*.test.ts`: hashing, comparación
  segura, generación de OTP e IDs.
