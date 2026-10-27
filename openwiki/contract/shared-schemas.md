---
type: "Referencia"
title: "Contrato compartido y esquemas zod"
openwiki_generated: true
verified:
  - by: openwiki/0.7.2
    at: 2026-10-27T02:48:33.191Z
sources:
  - id: openwiki-source-a96950067d4edffc310720c3
    resource: repo://apps/web/src/lib/api/rpc.ts
  - id: openwiki-source-84c0d1bb13d2eb23a283e86f
    resource: repo://packages/contract/package.json
  - id: openwiki-source-ee24ecad4a82769fe2165bd4
    resource: repo://packages/contract/src/config/contracts.ts
  - id: openwiki-source-3fdfe3ce71f8c583d8d01658
    resource: repo://packages/contract/src/index.ts
  - id: openwiki-source-69386079aef93a5f64257cbc
    resource: repo://packages/contract/src/shared/errors/index.ts
  - id: openwiki-source-e24435852f7c72e2908bf632
    resource: repo://packages/contract/src/shared/identifiers/index.ts
  - id: openwiki-source-c4130a5423e9a33c77a13672
    resource: repo://packages/contract/src/shared/pagination/index.ts
  - id: openwiki-source-797b4cc43abd702ccbd83779
    resource: repo://packages/contract/src/shared/result/index.ts
  - id: openwiki-source-a23a8f421f0ffb15911dc0bf
    resource: repo://packages/contract/src/task/contracts.ts
  - id: openwiki-source-4d2e099294c713d54980165a
    resource: repo://packages/contract/src/task/index.ts
  - id: openwiki-source-bec179e56653ac1a2b50b25a
    resource: repo://packages/types/src/contracts/tasks.ts
  - id: openwiki-source-25015e271858d4d00a7f7d15
    resource: repo://packages/types/src/index.ts
generated: { by: "pi", at: "2026-10-27T02:48:33.191Z" }
---


# Contrato compartido y esquemas zod

`@crm/contract` es la fuente única de las formas de request y response
compartidas entre `apps/api` y los frontends. El encabezado del barrel lo dice
explícitamente: *never define a zod schema for an entity twice*.

El paquete es ESM privado, expone el código fuente directamente (sin build) y
publica subpath exports por dominio: `.`, `./task`, `./schedule`, `./client`,
`./auth`, `./config`, `./finance` y los tres `shared/*`.

## Dos formas por dominio

Cada bounded context publica dos representaciones distintas y esta distinción
es deliberada:

| Forma | Dónde vive | Convención | Para qué |
| --- | --- | --- | --- |
| **Wire** | `<dominio>/contracts.ts` | `snake_case` con prefijo del dominio (`task_id`, `task_tast_id`) | lo que viaja por la red |
| **Entidad** | `<dominio>/index.ts` | `camelCase` (`id`, `taskStateId`, `createdAt`) | el modelo interno de la aplicación |

Ejemplo: el wire de tarea declara `task_id`, `task_title`, `task_tast_id`,
`task_kanban_order` y fechas con `z.coerce.date()`; la entidad `Task` declara
`id`, `title`, `taskStateId`, `kanbanOrder` y fechas como
`z.string().datetime()`.

Los archivos de wire llevan además el comentario de la migración: los
esquemas que estaban en `@crm/types/contracts/*` se movieron acá como fuente
única.

## Convenciones compartidas

**Result.** `Result<T, E>` es una unión discriminada `{ok: true, value} | {ok:
false, error}`, con helpers `ok` y `err` y una fábrica `ResultSchema(value,
error)` que produce el `z.discriminatedUnion` equivalente. Existe para evitar
excepciones atravesando capas en el frontend.

**Errores de dominio.** `DomainErrorCode` es un enum cerrado (`validation`,
`unauthenticated`, `forbidden`, `not_found`, `conflict`, `rate_limited`,
`internal`, `unknown`) y `DomainError` suma `message` y `details` opcionales.
La capa de infraestructura del frontend mapea los códigos oRPC a este conjunto.

**Paginación.** `PageQuery` define `limit` entre 1 y 200 con default 50, más
`cursor` y `search` opcionales; `Page(item)` describe `{items, nextCursor,
total?}`. La paginación por cursor está definida en el contrato aunque los
adaptadores actuales trabajan con límite simple.

**Identificadores.** Hay un `uuidSchema` plano y luego una marca de tipo por
entidad: `UserId`, `SessionId`, `TaskId`, `TaskStateId`, `ClientId`,
`ScheduleId`, `ScheduleItemId`, `TypeId`, `CategoryId`, `AccountId`, `AppId`,
`CurrencyId`, `OtpRequestId` y `AttachmentId`. La marca es solo de nivel de
tipo: en runtime el valor sigue siendo el mismo UUID, pero el compilador
impide pasar un `TaskId` donde se espera un `ClientId`.

## Routers oRPC

Cada bounded context publica un router construido con `oc` de
`@orpc/contract`. El de tareas usa `oc.prefix("/tasks")` y anida routers
para `states`, `clients`, `types` y `categories`, cada procedure con su
`.input()` y `.output()`. El de config es de solo lectura
(`listApps`, `listCurrencies`) y refleja que en el MVP las apps y las monedas
son lookups seedeados.

## Contrato nuevo y paquete legacy conviven

`@crm/types` es el paquete anterior de contratos: reproduce los mismos
esquemas (tasks, clients, incomes, expenses, transfers, schedules, config,
types, lookups, auth, health) y lo sigue consumiendo `apps/web`, que importa
sus routers para construir su cliente RPC.

Hay una diferencia de routing entre ambos: `@crm/types` fija la ruta y el
método de cada procedure de forma explícita con
`.route({ method: "POST", path: "/get" })`, mientras que `@crm/contract` usa
los paths por defecto del router oRPC. Esa diferencia explica que el cliente
legacy y el nuevo no se puedan compartir sin adapts.

La coexistencia es temporal y está documentada: `apps/web` está congelado y
`@crm/types` se retira con el cutover del frontend.

## Detalle a corregir

Los archivos de contrato importan `oc` de `@orpc/contract`, pero el
`package.json` de `@crm/contract` declara únicamente `zod` como dependencia.
El paquete resuelve hoy por el hoisting del workspace, no por una dependencia
declarada.

## Consumo

- `apps/api` usa los esquemas de `@crm/contract/auth` y `@crm/contract/task`
  en sus handlers; el resto de módulos todavía define zod local.
- `apps/web-v2` importa entidades, entradas y salidas en sus capas de
  dominio, aplicación e infraestructura.
- `apps/web` sigue con `@crm/types`.
