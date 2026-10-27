---
type: "Referencia"
title: "Outbox de emails y entrega"
openwiki_generated: true
verified:
  - by: openwiki/0.7.2
    at: 2026-10-27T02:48:33.191Z
sources:
  - id: openwiki-source-b7f0c55aabfe215527651230
    resource: repo://apps/api/nitro.config.ts
  - id: openwiki-source-c3753f41378893be433b928e
    resource: repo://apps/api/src/application/auth/request-otp.ts
  - id: openwiki-source-e0782d36c97ff793d2eb1d34
    resource: repo://apps/api/src/domain/ports/email-sending-repository.ts
  - id: openwiki-source-e08b04ac1998a75cd0afb8ba
    resource: repo://apps/api/src/http/composition-root.ts
  - id: openwiki-source-982b5981cdee0a76dd2374fa
    resource: repo://apps/api/src/infrastructure/email/console-email-sender.ts
  - id: openwiki-source-406998d15c878947a56ac178
    resource: repo://apps/api/src/infrastructure/email/create-email-sender.ts
  - id: openwiki-source-b5a2346fa2d2e075296688ed
    resource: repo://apps/api/src/infrastructure/email/drain-email-sending.ts
  - id: openwiki-source-f84167f2e79988bf55396451
    resource: repo://apps/api/src/infrastructure/email/parse-smtp-url.ts
  - id: openwiki-source-b526c27d8600bbffe74f54dd
    resource: repo://apps/api/src/infrastructure/email/smtp-email-sender.ts
  - id: openwiki-source-a2b7236658d562040fb1b64d
    resource: repo://apps/api/src/infrastructure/kysely/email-sending-repository.ts
  - id: openwiki-source-a50ebcf8bccf63335286bdf6
    resource: repo://apps/api/tasks/email-sending.ts
  - id: openwiki-source-3f89099f6f97e8a4fd179387
    resource: repo://packages/email/src/otp-email.ts
generated: { by: "pi", at: "2026-10-27T02:48:33.191Z" }
---


# Outbox de emails y entrega

El envío de emails es **outbox puro**: la transacción de negocio escribe una
fila en `email_sending` y el envío ocurre después, en un proceso aparte. Por
eso el OTP puede pedir un email sin depender de que el SMTP esté disponible.

## Encolado

`RequestOtp` renderiza la plantilla y escribe la fila con estado `pending`,
remitente `auth@crmhome.app` y referencia al login que la originó. La tabla
tiene un índice sobre `(status, created_at)`, que es el patrón de lectura del
drenador.

La plantilla vive en `@crm/email`: `renderOtp(code)` renderiza el componente
`.tsrx` con el motor de Octane y devuelve asunto, HTML y texto plano. El
asunto es "Tu código de acceso" y el texto plano recuerda que el código
expira en 10 minutos.

## Elección del sender

`createEmailSender(env)` decide el adapter y lo etiqueta con un discriminador
`kind`:

- **`SMTP_URL` con valor no vacío** (tras `trim`) → adapter SMTP;
- **cualquier otro caso** → adapter de consola, que imprime el mensaje.

Las variables discretas (`SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`,
`SMTP_SECURE`) se leen pero **no activan SMTP**: quedan reservadas para una
iteración futura. Es una fuente habitual de confusión en desarrollo: con
`SMTP_HOST` seteado y sin `SMTP_URL`, los emails se imprimen por consola.

`parseSmtpUrl` valida la URL: exige protocolo `smtp:` o `smtps:`, usa el
puerto 587 por defecto (465 para `smtps:`), valida el rango de puertos y
decide `secure` por protocolo o por puerto 465. Las credenciales salen del
userinfo de la URL, decodificadas. Una URL inválida lanza en la construcción
del adapter, no en el envío.

## Drenaje

`drainEmailSending` toma hasta `limit` mensajes pendientes (100 por
defecto) y, para cada uno:

| Resultado | Transición |
| --- | --- |
| envío exitoso | `markSent` (estado `sent` + `sent_at`) |
| `EmailSendError` con `retryable: true` | **se deja en `pending`**, sin transición |
| `EmailSendError` con `retryable: false` | `markFailed` (estado `failed`) |
| cualquier otro error | `markFailed` (política conservadora) |

La clasificación de retryable la hace el adapter SMTP: un error de
transporte con código conocido (`ECONNREFUSED`, `ETIMEDOUT`, `ENOTFOUND`,
`ECONNRESET`, `EPIPE`, `EAI_AGAIN`) es retryable, y si el servidor responde
con un código 4xx también lo es (rate limit, buzón bloqueado), mientras que
un 5xx se considera permanente. El transporter usa pool con 2 conexiones y
50 mensajes, con timeouts de 5 s para conectar y saludar y 10 s de socket.

El drenador **no loguea** destinatario, asunto ni cuerpo: solo el id del
mensaje y el nombre del error. Excepción a tener en cuenta: el adapter de
consola imprime el mensaje completo, incluido el cuerpo con el código OTP, y
es el adapter por defecto sin `SMTP_URL`.

## Dos drenadores, una cola

Hoy conviven dos mecanismos que compiten por las mismas filas:

1. la **tarea de nitro** `email-sending`, programada cada minuto
   (`*/1 * * * *`), que drena con límite 100 y devuelve un resumen;
2. un **bucle en proceso** en el composition root, pensado para que en
   desarrollo los emails se envíen sin intervención manual, porque nitro no
   levanta su scheduler de tareas en dev.

Ninguno de los dos **reclama filas**: `findPending` es un `SELECT` por
`status = 'pending'` ordenado por fecha, sin `FOR UPDATE SKIP LOCKED` ni
marca detaken. Con los dos activos, el mismo mensaje puede enviarse dos
veces.

## Ausencia de backoff

Un error retryable deja la fila en `pending` **sin contador de intentos y sin
backoff**: no hay columna de próximo intento ni cálculo de demora. El
mensaje se reintenta en la corrida siguiente (cada minuto), y así
indefinidamente mientras el error sea retryable. El único criterio de avance
es el paso del tiempo, no un estado de reintento.

Efecto práctico: una caída prolongada de SMTP genera reintentos al mismo
ritmo de la cola, sin límite de intentos y sin exponentially Grow, y un
mensaje con destinatario inválido que el servidor reporte como 5xx queda
`failed` de forma permanente sin reintento posible.

## Tests relacionados

- `apps/api/src/infrastructure/email/drain-email-sending.test.ts`: las cuatro
  transiciones del drenador.
- `apps/api/src/infrastructure/email/parse-smtp-url.test.ts`: validación de la
  URL SMTP.
- `apps/api/src/infrastructure/email/smtp-email-sender.test.ts` e
  `smtp-email-sender.integration.test.ts` (este último se auto-excluye sin
  Mailpit): clasificación de errores y envío real.
