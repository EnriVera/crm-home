# Delta for api-auth

> Change: `transactional-email` · Spec canónica: `openspec/specs/api-auth/spec.md`.
> Fuente: design D3 (firma `EmailMessage`), D4 (puerto `EmailTemplateRenderer`),
> D5 (adapter SMTP + mapeo de errores), D6 (selector por env) y §5 (delta sobre
> req 7).

## MODIFIED Requirements

### Requirement: Solicitud de OTP con rate-limit y encolado de email

El caso de uso `RequestOtp` DEBE normalizar el email a minúsculas, rechazar con
error de rate-limit (`RATE_LIMITED`, HTTP 429 en el handler) cuando el email ya
tiene 3 o más solicitudes en la última hora según la tabla `login` (apoyándose
en el índice `idx_login_email_created`), generar un código de 6 dígitos con
posibles ceros a la izquierda vía el puerto `OtpGenerator`, persistirlo en
`login` con `logi_expires_at = ahora + 10 minutos` y `logi_attempts = 0`, y
encolar el email en `email_sending` con referencia al login. La hora actual
DEBE provenir del puerto `Clock` inyectable. El cuerpo y asunto del email
encolado DEBEN provenir del puerto de dominio `EmailTemplateRenderer`
(`renderOtp({ code })`), invocado en enqueue-time: `RequestOtp` DEBE persistir
el HTML renderizado en el cuerpo del mensaje (`emse_body`) y el asunto renderizado
en `emse_subject`, sin componer el cuerpo inline ni requerir migración del
schema `email_sending`.
(Previously: el cuerpo del email era texto plano compuesto inline en
`RequestOtp`; no existía puerto de render.)

#### Scenario: Cuarto envío dentro de la hora rechazado

- GIVEN el email `ana@example.com` con 3 registros en `login` creados dentro de la última hora
- WHEN se invoca `requestOtp` para ese email
- THEN la operación es rechazada con error de rate-limit (429) y NO se crea un nuevo registro en `login` ni en `email_sending`

#### Scenario: Solicitud válida persiste OTP y encola email renderizado

- GIVEN un email sin solicitudes recientes y un `EmailTemplateRenderer` que devuelve `{ subject, html, text }` para el código generado
- WHEN se invoca `requestOtp`
- THEN se crea un registro en `login` con código de 6 dígitos, expiración a 10 minutos y 0 intentos, y un registro pendiente en `email_sending` cuyo asunto y cuerpo son exactamente el `subject` y el `html` devueltos por el renderer

### Requirement: Puerto EmailSender con adapters consola/SMTP y task de drenaje

El envío de emails DEBE realizarse tras el puerto de dominio `EmailSender`
(`send({ from, to, subject, body, html?, text? })`): `body` sigue siendo
obligatorio y conserva el comportamiento existente, y los campos opcionales
`html` y `text` DEBEN permitir que un adapter envíe el mensaje como `text/html`
(con alternativa `text/plain` cuando `text` está presente) sin romper callers ni
adapters existentes. DEBE existir un adapter de consola para desarrollo y un
adapter SMTP para entornos con configuración SMTP, seleccionados
automáticamente por una factory (`createEmailSender(env)`) sin tocar el dominio:
con `SMTP_URL` definida DEBE devolverse el adapter SMTP; sin configuración SMTP
DEBE devolverse el adapter consola. La task de nitro DEBE drenar periódicamente
los registros pendientes de `email_sending`, invocar el puerto a través de la
factory y marcar cada mensaje como enviado o fallido. Los errores transitorios
del adapter SMTP (red/conexión, respuestas 4xx) DEBEN dejar el mensaje pendiente
para reintento en la próxima ejecución de la task; los errores permanentes
(respuestas 5xx, destino inválido) y cualquier otro error DEBEN marcarlo como
fallido. Ni destinatarios, ni asuntos ni cuerpos de email DEBEN incluirse en
spans ni atributos de telemetría (PRD §9).
(Previously: la firma del puerto era `send({ from, to, subject, body })` sin
soporte HTML, existía únicamente el adapter consola y la task lo instanciaba de
forma hardcoded sin selector por env ni semántica de reintento.)

#### Scenario: OTP encolado drenado por la task en dev

- GIVEN un registro pendiente en `email_sending` generado por `requestOtp`
- WHEN corre la task de drenaje sin `SMTP_URL` definida
- THEN el adapter consola emite el email (destinatario, asunto y cuerpo) y el registro queda marcado como enviado

#### Scenario: OTP enviado por SMTP con Mailpit

- GIVEN un registro pendiente en `email_sending` con cuerpo HTML renderizado y `SMTP_URL=smtp://localhost:1025`
- WHEN corre la task de drenaje con Mailpit levantado
- THEN el adapter SMTP entrega el mensaje como `text/html`, visible en la UI de Mailpit (:8025), y el registro queda marcado como enviado

#### Scenario: Proveedor real enchufable sin tocar dominio

- GIVEN el puerto `EmailSender`
- WHEN se inspeccionan los casos de uso y la task
- THEN dependen de la interfaz del puerto y ningún archivo de dominio/aplicación importa el adapter concreto

#### Scenario: Fallback a consola sin SMTP_URL

- GIVEN un entorno sin `SMTP_URL` (o con `SMTP_URL` vacía)
- WHEN se invoca `createEmailSender(env)`
- THEN devuelve el adapter consola y el flujo OTP completo sigue funcionando sin regresión

#### Scenario: Error transitorio deja el mensaje pendiente

- GIVEN un registro pendiente en `email_sending` y un adapter SMTP configurado
- WHEN el envío falla con un error transitorio (conexión rechazada, timeout o respuesta SMTP 4xx)
- THEN el registro NO se marca como enviado ni como fallido, queda pendiente y será reintentado en la próxima ejecución de la task

#### Scenario: Error permanente marca el mensaje como fallido

- GIVEN un registro pendiente en `email_sending` y un adapter SMTP configurado
- WHEN el envío falla con un error permanente (respuesta SMTP 5xx, destino inválido) o cualquier error no clasificado como transitorio
- THEN el registro queda marcado como fallido

### Requirement: Puertos de dominio y casos de uso puros para auth

Los casos de uso de auth (`RequestOtp`, `VerifyOtp`, `Logout`, `GetSession`)
DEBEN vivir en `src/application/` en TypeScript puro y depender únicamente de
puertos definidos en `src/domain/ports/`: `UserRepository`, `LoginRepository`,
`SessionRepository`, `EmailSendingRepository`, `EmailSender`,
`EmailTemplateRenderer`, `OtpGenerator`, `TokenHasher`, `IdGenerator` (UUIDv7) y
`Clock`. Ningún archivo de dominio/aplicación DEBE importar kysely, h3, nitro,
`node:crypto`, `@octanejs/email` ni clientes SMTP (p. ej. nodemailer)
directamente (el hashing, la aleatoriedad, el render de plantillas y el envío se
consumen tras puertos); los adapters concretos DEBEN vivir bajo
`src/infrastructure/` y el wiring en el composition root de `src/http/`. Los
métodos de repositorio que participan en el seed DEBEN aceptar una transacción
opcional.
(Previously: la lista de puertos no incluía `EmailTemplateRenderer` y la
prohibición de imports no mencionaba `@octanejs/email` ni clientes SMTP.)

#### Scenario: Confinamiento de imports verificable

- GIVEN el árbol `src/` de `apps/api` tras el change
- WHEN se inspeccionan los imports de `src/domain/` y `src/application/`
- THEN ninguno importa kysely, h3, nitro, `node:crypto`, `@octanejs/email` ni nodemailer; esos imports aparecen únicamente bajo `src/infrastructure/` y `src/http/`

#### Scenario: Renderer inyectado en RequestOtp vía composition root

- GIVEN el composition root de `apps/api`
- WHEN se inspecciona el wiring de `RequestOtp`
- THEN el caso de uso recibe una implementación de `EmailTemplateRenderer` construida en infraestructura (adapter Octane sobre `@crm/email`), nunca una importación directa del SDK
