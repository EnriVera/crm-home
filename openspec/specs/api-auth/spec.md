# Api Auth Specification

> Change: `backend-auth` · Dominio nuevo (spec completa).
> Fuente de verdad: PRD §8.1 (OTP por email + sesiones + registro implícito),
> §6.2 (registro implícito), §8.8 (términos), §10 (puertos), §11 (schema).
> Decisiones de design: D1–D7 (kysely migrator, sesión deslizante 30d con umbral
> 15d, cookie dev sameSite lax / secure configurable, SHA-256 + comparación a
> tiempo constante, tests unit-first + integración opt-in, seed transaccional
> con ARS, `@orpc/client`).

## Purpose

Define el backend de autenticación real de CRM-HOME: contratos RPC de auth en
`@crm/types`, OTP de 6 dígitos enviado por email con reglas de seguridad
server-side (10 minutos, 5 intentos, rate-limit 3 envíos/hora), sesiones
persistentes con cookie httpOnly de 30 días deslizantes, logout con borrado
lógico, registro implícito con seed transaccional del usuario nuevo (PRD §6.2),
cola `email_sending` drenada por una task de nitro tras el puerto `EmailSender`,
la primera migración versionada del repo, y la estrategia de tests que preserva
`bun test` verde sin postgres ni OTLP.

## Requirements

### Requirement: Contratos RPC de auth en @crm/types

`packages/types` DEBE exponer un contrato orpc/zod de auth siguiendo el patrón
del contrato de salud existente, con las operaciones `requestOtp` (POST),
`verifyOtp` (POST), `logout` (POST) y `session` (GET) bajo el prefijo `/auth`.
El código OTP DEBE validarse como string de exactamente 6 dígitos (regex
`^\d{6}$`), preservando ceros a la izquierda; NUNCA DEBE modelarse como número.
`verifyOtp` DEBE devolver el veredicto `valid | invalid | expired` (idéntico al
`Verdict` de la spec `web-auth-ui`); el servidor es la fuente de verdad de
intentos y expiración y el contrato NO DEBE exponer contadores de intentos.

#### Scenario: Código con ceros a la izquierda aceptado por el contrato

- GIVEN el schema de input de `verifyOtp`
- WHEN se valida `{ email: "ana@example.com", code: "041283" }`
- THEN el input es aceptado y el código conserva el cero inicial como string

#### Scenario: Código mal formado rechazado

- GIVEN el schema de input de `verifyOtp`
- WHEN se valida un código de 5 dígitos, con letras, o numérico
- THEN el input es rechazado por validación del contrato

### Requirement: Solicitud de OTP con rate-limit y encolado de email

El caso de uso `RequestOtp` DEBE normalizar el email a minúsculas, rechazar con
error de rate-limit (`RATE_LIMITED`, HTTP 429 en el handler) cuando el email ya
tiene 3 o más solicitudes en la última hora según la tabla `login` (apoyándose
en el índice `idx_login_email_created`), generar un código de 6 dígitos con
posibles ceros a la izquierda vía el puerto `OtpGenerator`, persistirlo en
`login` con `logi_expires_at = ahora + 10 minutos` y `logi_attempts = 0`, y
encolar el email en `email_sending` con referencia al login. La hora actual
DEBE provenir del puerto `Clock` inyectable.

#### Scenario: Cuarto envío dentro de la hora rechazado

- GIVEN el email `ana@example.com` con 3 registros en `login` creados dentro de la última hora
- WHEN se invoca `requestOtp` para ese email
- THEN la operación es rechazada con error de rate-limit (429) y NO se crea un nuevo registro en `login` ni en `email_sending`

#### Scenario: Solicitud válida persiste OTP y encola email

- GIVEN un email sin solicitudes recientes
- WHEN se invoca `requestOtp`
- THEN se crea un registro en `login` con código de 6 dígitos, expiración a 10 minutos y 0 intentos, y un registro pendiente en `email_sending` dirigido a ese email

### Requirement: Verificación de OTP con reglas de seguridad server-side

El caso de uso `VerifyOtp` DEBE operar sobre el login más reciente no consumido
del email y aplicar, en el servidor, las reglas del PRD §8.1: código expirado
(`logi_expires_at` superada, 10 minutos) → veredicto `expired`; 5 o más
intentos fallidos → veredicto `invalid` con el código invalidado (debe pedirse
uno nuevo); código incorrecto → incremento de `logi_attempts` y veredicto
`invalid`; código correcto → marca `logi_consumed_at`, resuelve o crea el
usuario (registro implícito), crea la sesión y devuelve veredicto `valid` con
el token de sesión. La comparación del código DEBE ser a tiempo constante
(`crypto.timingSafeEqual` sobre buffers de igual longitud) para prevenir
timing attacks.

#### Scenario: Código con ceros a la izquierda valida end-to-end

- GIVEN un login vigente con código `041283` para `ana@example.com`
- WHEN se invoca `verifyOtp` con el código `"041283"`
- THEN el veredicto es `valid`, el login queda consumido y se crea una sesión con su cookie httpOnly

#### Scenario: Código expirado rechazado

- GIVEN un login cuyo `logi_expires_at` ya pasó (más de 10 minutos)
- WHEN se invoca `verifyOtp` con el código correcto
- THEN el veredicto es `expired` y no se crea sesión

#### Scenario: Quinto intento fallido invalida el código

- GIVEN un login vigente con 4 intentos fallidos acumulados
- WHEN se invoca `verifyOtp` con un código incorrecto
- THEN el veredicto es `invalid`, los intentos llegan a 5 y cualquier intento posterior (incluso con el código correcto) devuelve `invalid` sin crear sesión

#### Scenario: Comparación a tiempo constante

- GIVEN la implementación de `VerifyOtp`
- WHEN se inspecciona la comparación del código OTP
- THEN usa `crypto.timingSafeEqual` sobre buffers normalizados de igual longitud, nunca `===` sobre strings

### Requirement: Sesiones persistentes con cookie httpOnly y renovación deslizante

Al validar un OTP, el sistema DEBE crear un registro en `session` con token de
32 bytes aleatorios codificado en base64url, persistiendo ÚNICAMENTE
`sess_token_hash` (SHA-256, 64 hex chars); el token en claro NUNCA DEBE
persistirse ni loguearse. El handler DEBE emitir la cookie de sesión con
`httpOnly: true`, `sameSite: 'lax'`, `path: '/'`, `maxAge` de 30 días y
`secure` configurable por entorno (`SESSION_COOKIE_SECURE`, default `true`;
`false` permitido en dev http local). La resolución de sesión (`GetSession`)
DEBE devolver `null` (HTTP 401 en el handler) si la sesión no existe, está
borrada o expiró, y DEBE implementar renovación deslizante: cuando falten menos
de 15 días para expirar, extiende `sess_expires_at = ahora + 30 días` y el
handler re-emite la cookie con el MISMO token (sin rotación). La comparación de
hashes DEBE ser a tiempo constante.

#### Scenario: Veredicto válido emite cookie httpOnly

- GIVEN un `verifyOtp` con veredicto `valid`
- WHEN se inspecciona la respuesta HTTP
- THEN incluye `Set-Cookie` con el token de sesión, flags `HttpOnly`, `SameSite=Lax`, `Path=/` y max-age de 30 días

#### Scenario: Token nunca persistido en claro

- GIVEN una sesión creada
- WHEN se inspecciona la fila en `session`
- THEN `sess_token_hash` contiene el hash SHA-256 y el token en claro no aparece en ninguna columna

#### Scenario: Renovación deslizante bajo el umbral de 15 días

- GIVEN una sesión activa cuya expiración queda a menos de 15 días
- WHEN se resuelve la sesión vía `session`
- THEN `sess_expires_at` se extiende a ahora + 30 días y la respuesta re-emite la cookie con el mismo token

#### Scenario: Sesión sin renovación sobre el umbral

- GIVEN una sesión activa cuya expiración queda a más de 15 días
- WHEN se resuelve la sesión
- THEN `sess_expires_at` no cambia y la respuesta NO re-emite la cookie

#### Scenario: Recarga con sesión activa resuelve al usuario

- GIVEN un navegador con cookie de sesión vigente
- WHEN se invoca `session` (GET)
- THEN responde 200 con `{ user: { id, email, name } }` del dueño de la sesión

### Requirement: Logout con borrado lógico

El caso de uso `Logout` DEBE resolver el hash del token de la cookie y marcar
`sess_deleted_at` (borrado lógico) en la sesión correspondiente, y el handler
DEBE borrar la cookie del navegador. Una sesión con `sess_deleted_at` DEBE ser
inválida de inmediato: reutilizar la cookie después del logout DEBE fallar.

#### Scenario: Cookie reutilizada después del logout falla

- GIVEN un usuario que ejecutó `logout` (sesión con `sess_deleted_at`)
- WHEN se invoca `session` con la misma cookie
- THEN la respuesta es 401 (sin sesión)

#### Scenario: Logout borra la cookie del navegador

- GIVEN una sesión activa
- WHEN se invoca `logout`
- THEN la respuesta incluye la expiración/borrado de la cookie de sesión

### Requirement: Registro implícito con seed transaccional

Cuando `VerifyOtp` valida el primer OTP de un email sin usuario existente, DEBE
crear el usuario y sembrar sus datos por defecto (PRD §6.2) en UNA transacción:
usuario con email verificado (`user_sino_emailverificado = 1`), nombre derivado
de la parte local del email, tema `system`, aceptación de términos
(`user_accepted_terms_at` + `user_terms_version = '1.0'`, PRD §8.8); tres
estados de tarea (`Pendiente` orden 1, `En progreso` orden 2, `Completado`
orden 3); una cuenta `Efectivo` en moneda ARS con `acco_initial_amount = 0`; y
tipos/categorías base mínimas. Si cualquier paso falla, la transacción DEBE
revertirse completa (no quedan filas parciales). Si el usuario ya existe, NO
DEBE repetirse el seed.

#### Scenario: Primer OTP válido siembra el usuario completo

- GIVEN un email sin usuario registrado y un OTP válido
- WHEN `verifyOtp` devuelve `valid`
- THEN existen, para el nuevo usuario, los 3 estados de tarea en orden, la cuenta `Efectivo` con `acco_curr_id` apuntando a la moneda ARS, las tipos/categorías base y la aceptación de términos con versión `1.0`

#### Scenario: Fallo del seed revierte la transacción

- GIVEN un error al insertar cualquier fila del seed
- WHEN `VerifyOtp` ejecuta el registro implícito
- THEN la transacción hace rollback y no quedan usuario ni datos sembrados parciales (el login consumido tampoco persiste fuera de la transacción si forma parte de ella)

#### Scenario: Usuario existente no re-siembra

- GIVEN un email con usuario ya registrado y seed completo
- WHEN valida un nuevo OTP
- THEN se crea únicamente la sesión; no se duplican estados, cuenta ni catálogos

### Requirement: Puerto EmailSender con adapter de desarrollo y task de drenaje

El envío de emails DEBE realizarse tras el puerto de dominio `EmailSender`
(`send({ from, to, subject, body })`), con un adapter de desarrollo que emite el
mensaje por consola/log (decisión de producto confirmada) dejando el punto de
enchufe para un proveedor real sin tocar el dominio. Una task de nitro DEBE
drenar periódicamente los registros pendientes de `email_sending`, invocar el
puerto y marcar cada mensaje como enviado o fallido.

#### Scenario: OTP encolado drenado por la task en dev

- GIVEN un registro pendiente en `email_sending` generado por `requestOtp`
- WHEN corre la task de drenaje en entorno dev
- THEN el adapter consola emite el email (destinatario, asunto y código) y el registro queda marcado como enviado

#### Scenario: Proveedor real enchufable sin tocar dominio

- GIVEN el puerto `EmailSender`
- WHEN se inspeccionan los casos de uso y la task
- THEN dependen de la interfaz del puerto y ningún archivo de dominio/aplicación importa el adapter concreto

### Requirement: Migración inicial versionada con tooling explícito

El change DEBE introducir el tooling de migraciones del repo con kysely
migrator nativo (`FileMigrationProvider`) y archivos `.ts` bajo
`src/infrastructure/kysely/migrations/`, ejecutados mediante un script
explícito (`db:migrate`); las migraciones NUNCA DEBEN correr automáticamente al
arrancar el servidor. La migración inicial DEBE crear, en orden de
dependencias, los lookups globales seedeados (`sino` con No/Yes, `currency` con
la fila ARS, `apps` con el módulo Core), las tablas de auth (`user`, `login`,
`session`, `email_sending`) y las tablas de soporte del seed (`task_state`,
`accounts`, `types`, `categories`), con el índice `idx_login_email_created` y
las FKs del hijo al padre según PRD §11; NO DEBE incluir tablas fuera del
alcance del change. La migración DEBE tener `down` que dropee las tablas del
change, documentado como destructivo y válido solo en este stage sin datos
productivos.

#### Scenario: db:migrate crea el schema del change

- GIVEN una base postgres vacía y `DATABASE_URL` definida
- WHEN se ejecuta `bun run db:migrate`
- THEN existen las tablas del change con sus índices y FKs, y los lookups `sino`, `currency` (ARS) y `apps` (Core) quedan seedeados

#### Scenario: Sin migración automática al arrancar

- GIVEN el servidor nitro arrancado sin ejecutar `db:migrate`
- WHEN se inspecciona el ciclo de arranque
- THEN ninguna migración corre implícitamente; el runner es siempre el script explícito

#### Scenario: down revierte el schema

- GIVEN el schema migrado
- WHEN se ejecuta el `down` de la migración inicial
- THEN las tablas del change quedan dropeadas y `DatabaseSchema` puede volver a su estado previo

### Requirement: Puertos de dominio y casos de uso puros para auth

Los casos de uso de auth (`RequestOtp`, `VerifyOtp`, `Logout`, `GetSession`)
DEBEN vivir en `src/application/` en TypeScript puro y depender únicamente de
puertos definidos en `src/domain/ports/`: `UserRepository`, `LoginRepository`,
`SessionRepository`, `EmailSendingRepository`, `EmailSender`, `OtpGenerator`,
`TokenHasher`, `IdGenerator` (UUIDv7) y `Clock`. Ningún archivo de
dominio/aplicación DEBE importar kysely, h3, nitro ni `node:crypto`
directamente (el hashing y la aleatoriedad se consumen tras puertos); los
adapters concretos DEBEN vivir bajo `src/infrastructure/` y el wiring en el
composition root de `src/http/`. Los métodos de repositorio que participan en
el seed DEBEN aceptar una transacción opcional.

#### Scenario: Confinamiento de imports verificable

- GIVEN el árbol `src/` de `apps/api` tras el change
- WHEN se inspeccionan los imports de `src/domain/` y `src/application/`
- THEN ninguno importa kysely, h3, nitro ni `node:crypto`; esos imports aparecen únicamente bajo `src/infrastructure/` y `src/http/`

### Requirement: Estrategia de tests unit-first con integración opt-in

El change DEBE seguir strict TDD con tests unitarios primero para los cuatro
casos de uso y los adapters de crypto, usando repositorios in-memory,
`FixedClock` y generadores falsos. Los tests de integración con postgres DEBEN
ser opt-in: archivos `*.integration.test.ts` que se saltan cuando
`TEST_DATABASE_URL` no está definida. `bun test` en el workspace DEBE seguir
verde sin postgres viva ni endpoint OTLP (patrón del repo preservado).

#### Scenario: bun test verde sin postgres ni OTLP

- GIVEN el workspace instalado, sin postgres levantado y sin `OTEL_EXPORTER_OTLP_ENDPOINT`
- WHEN se ejecuta `bun test`
- THEN todos los tests unitarios y smoke pasan y los de integración se saltan

#### Scenario: Integración opt-in con TEST_DATABASE_URL

- GIVEN `TEST_DATABASE_URL` definida y el schema migrado contra esa base
- WHEN se ejecuta `bun test`
- THEN los tests `*.integration.test.ts` corren contra postgres real y limpian/revierten sus datos
