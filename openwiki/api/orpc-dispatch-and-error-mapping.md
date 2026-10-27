---
type: "Referencia"
title: "Dispatch oRPC y mapeo de errores"
openwiki_generated: true
verified:
  - by: openwiki/0.7.2
    at: 2026-10-27T02:48:33.191Z
sources:
  - id: openwiki-source-d810832a3c49dad053711223
    resource: repo://apps/api/src/application/tasks/errors.ts
  - id: openwiki-source-021ec0b86569d905aa49e1ee
    resource: repo://apps/api/src/http/auth/auth-routes.ts
  - id: openwiki-source-1939ec5a7852b20c6ab629a3
    resource: repo://apps/api/src/http/clients/clients-routes.ts
  - id: openwiki-source-88942a822add3d21ad4473a2
    resource: repo://apps/api/src/http/orpc-bridge.ts
  - id: openwiki-source-3c014f98585bcf2bce118fd7
    resource: repo://apps/api/src/http/router.ts
  - id: openwiki-source-67cfe8774a1da82489da957d
    resource: repo://apps/api/src/http/tasks/error-mapping.ts
  - id: openwiki-source-dcf2d2928d35c0de8ec30617
    resource: repo://apps/api/src/http/tasks/tasks-routes.ts
generated: { by: "pi", at: "2026-10-27T02:48:33.191Z" }
---


# Dispatch oRPC y mapeo de errores

Toda la superficie de negocio del backend se expone por HTTP bajo el prefijo
`/rpc/**`. No hay un servidor oRPC en el proceso: el dispatch es una tabla
`Map` escrita a mano y los handlers de dominio siguen siendo handlers h3.

## Por qué un dispatcher manual

El router no usa el `RPCHandler` de `@orpc/server` (la dependencia está
declarada en `apps/api/package.json` pero ningún archivo de `apps/api/src` la
importa). El motivo está documentado en el propio módulo: tras varios intentos
de migrar al `RPCHandler` canónico —que reportaba "could not match" para paths
correctos— se decidió bypasearlo y resolver el dispatch con un mapa
`METHOD path -> procedure`. La consecuencia de diseño es que los handlers h3
existentes quedan intactos: cada procedure es una función
`(event, input) => output` que reutiliza el handler y normaliza su respuesta.

## Tabla de dispatch

`createRpcHandler` construye un array de `ProcedureEntry` (unos cincuenta
procedures para auth, tasks, clients, incomes, expenses, transfers, schedules,
types y config) y lo indexa en un `Map<string, ProcedureEntry>` con clave
`"METHOD /path"`. La búsqueda es exacta: no hay normalización de mayúsculas,
guiones o segmentos.

Todo procedure se registra como `POST`, salvo `GET /auth/session`, que
además tiene una segunda entrada `POST` para el cliente oRPC sin binding de
contrato (que en SSR manda POST y terminaba viendo un 404 que disparaba un
bucle de redirección a `/login`).

## Envelope de transporte

El cliente `@orpc/client` v1.15 usa un envelope simétrico:

- request: el body es `{ json: <input> }`; el router desenvuelve `input` desde
  `rawBody.json` antes de invocar la procedure;
- response exitosa: `{ json: <output> }` con HTTP 200;
- response de error: `{ defined: true, code, data?, message, status }`, donde
  `defined: true` es la señal que el codec oRPC usa para distinguir un error de
  una respuesta válida.

Un procedure inexistente devuelve 404 con cuerpo de texto plano
(`"Not Found"`), no con el envelope JSON de error.

## Bridge h3 ⇄ oRPC

Los handlers de dominio reciben un `H3Event` y devuelven `Response` u objeto.
El bridge (`apps/api/src/http/orpc-bridge.ts`) resuelve el desajuste en tres
piezas:

1. `buildH3Event` materializa un evento h3 standalone con un `Request` propio
   (body JSON, query string, cookies).
2. `buildH3EventFromBase` arma un evento **híbrido**: toma el `req` standalone
   con el input oRPC ya desenvuelto y reusa `node.req`/`node.res` del evento
   base de nitro. Ese reuso es lo que permite que `setSessionCookie` escriba
   sobre la respuesta real — sin él, la cookie de sesión nunca llegaría al
   cliente. También reenvía la cookie del request original al `req` híbrido,
   porque h3 v2 lee las cookies de `event.req.headers` y no de
   `node.req.headers`.
3. `invokeH3HandlerAndParse` ejecuta el handler y normaliza el resultado:
   objeto plano tal cual, `Response` 2xx con JSON parseado, `Response` ≥ 400
   convertida en `BridgeHttpError`, y respuestas 2xx no-JSON convertidas en
   error 500 con el cuerpo crudo.

## Errores

Hay dos traducciones encadenadas.

**De dominio a HTTP.** `mapTaskErrorToStatus` es el mapper compartido por
todos los módulos (tasks, clients, types, incomes, expenses, transfers,
schedules):

| Error de dominio | HTTP | `code` |
| --- | --- | --- |
| `TaskNotFound` | 404 | `TASK_NOT_FOUND` |
| `TaskStateNotFound` | 404 | `TASK_STATE_NOT_FOUND` |
| `InvalidKanbanOrder` | 409 | `INVALID_KANBAN_ORDER` |
| `InvalidStateTransition` | 409 | `INVALID_STATE_TRANSITION` |
| `Unauthorized` | 401 | `UNAUTHORIZED` |
| otro `TaskDomainError` | 400 | el `code` del error |
| error desconocido | 500 | `INTERNAL_ERROR` |

Cada módulo de dominio añade sus propios códigos (`CLIENT_NOT_FOUND`,
`INVALID_INCOME_INPUT`, `TYPE_NOT_FOUND`, …) siguiendo la misma forma
`{ defined: true, code, message }`.

**De HTTP a oRPC.** `BridgeHttpError` traduce el status a un código oRPC
discriminado: 400→`BAD_REQUEST`, 401→`UNAUTHORIZED`, 403→`FORBIDDEN`,
404→`NOT_FOUND`, 409→`CONFLICT`, 429→`RATE_LIMITED`, 500→
`INTERNAL_SERVER_ERROR`. Si el body del handler ya trae un `code` propio (por
ejemplo `TASK_NOT_FOUND`), ese código gana sobre el derivado del status; un
status sin mapeo cae en `INTERNAL_SERVER_ERROR`.

## Sesión como header

No hay middleware de autorización. El router resuelve **una vez por request**
el `userId` a partir de la cookie `crm_session` (invocando el caso de uso
`GetSession`) y lo inyecta como header `x-user-id` sobre un clon del request.
Los handlers autenticados lo leen con `readUserId`, que lanza `Unauthorized`
—y por tanto 401— si el header no está. Las procedures públicas (solicitar y
verificar OTP, leer apps y monedas) siguen funcionando con `userId = null`.

Un detalle a tener en cuenta al depurar: la tabla registra paths en camelCase
(`/auth/requestOtp`), mientras que la prueba de integración de auth llama a
`/rpc/auth/request-otp`. Solo los dos endpoints legacy de formularios de
tareas aceptan ambas grafías.

## Rutas fuera del contrato

Dos endpoints existen como handlers h3 pero no forman parte del contrato
(`tasks.types-for-form` y `tasks.categories-by-type`): se sirven
manualmente, antes del dispatch, y aceptan kebab-case y camelCase.

## Cobertura del contrato

Solo los módulos de **auth** y **tasks** consumen los esquemas zod de
`@crm/contract`. El resto (clients, types, incomes, expenses, transfers,
schedules) define sus propios esquemas zod locales a la espera de la misma
migración; el contrato ya expone routers para esos dominios, pero el backend
todavía no los conecta.

## Tests relacionados

- `apps/api/src/http/orpc-bridge.test.ts`: construcción del evento híbrido,
  propagación de cookies y de `res`, y precedencia del `code` del body.
- `apps/api/src/http/router.test.ts`: `/health` responde 200 y la telemetría
  degrada a no-op sin endpoint OTLP.
- `apps/api/src/http/tasks/tasks-routes.test.ts`: mapeo de errores a 404/409/
  401/500, y 401 cuando falta el header `x-user-id`.
- `apps/api/src/http/auth.integration.test.ts`: flujo completo con base de
  datos (rate limit 429, cookie `HttpOnly`/`SameSite=Lax`, logout).
