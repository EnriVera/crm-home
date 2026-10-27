---
type: "Referencia"
title: "Capas del backend y puertos de dominio"
openwiki_generated: true
verified:
  - by: openwiki/0.7.2
    at: 2026-10-27T02:48:33.191Z
sources:
  - id: openwiki-source-80276df55c8da3940ca5955f
    resource: repo://apps/api/package.json
  - id: openwiki-source-fe1e4fcbfc0b4291e2aea736
    resource: repo://apps/api/src/application/auth/errors.ts
  - id: openwiki-source-c3753f41378893be433b928e
    resource: repo://apps/api/src/application/auth/request-otp.ts
  - id: openwiki-source-d810832a3c49dad053711223
    resource: repo://apps/api/src/application/tasks/errors.ts
  - id: openwiki-source-7ee8fa6abd554cf539e11edf
    resource: repo://apps/api/src/domain/ports/__attachment-not-in-composition.test.ts
  - id: openwiki-source-86bdfc120d58c573c461cbd9
    resource: repo://apps/api/src/domain/ports/__no-external-imports.test.ts
  - id: openwiki-source-008d692afe093645c92c81ef
    resource: repo://apps/api/src/domain/ports/income-repository.ts
  - id: openwiki-source-1f0d2c233b9502e108dfded1
    resource: repo://apps/api/src/domain/ports/task-repository.ts
  - id: openwiki-source-c6714b676abb124caf2e6d98
    resource: repo://apps/api/src/domain/ports/transaction-manager.ts
  - id: openwiki-source-2f49ed3c46082a59e797abfc
    resource: repo://apps/api/src/domain/ports/transaction.ts
  - id: openwiki-source-6d811d8667fb5f4a140e85de
    resource: repo://apps/api/src/infrastructure/effect.smoke.test.ts
  - id: openwiki-source-cf806d7ec36dfce9c0a23c3b
    resource: repo://apps/api/src/infrastructure/kysely/income-repository.ts
  - id: openwiki-source-4f7411e87488d02403205188
    resource: repo://apps/api/src/infrastructure/kysely/session-repository.ts
  - id: openwiki-source-3f1daa304466d5e6909a86dd
    resource: repo://apps/api/src/infrastructure/kysely/task-repository.ts
  - id: openwiki-source-38af7bdd34d817fbd3c29077
    resource: repo://openspec/config.yaml
generated: { by: "pi", at: "2026-10-27T02:48:33.191Z" }
---


# Capas del backend y puertos de dominio

`apps/api/src` sigue una arquitectura de ports & adapters en cuatro capas. La
regla que las sostiene está escrita en la configuración del proyecto
(`openspec/config.yaml`, `binding_rules`): *el dominio NO importa kysely, h3,
nitro ni SDKs externos; solo los adapters*.

| Capa | Ruta | Qué contiene | Puede depender de |
| --- | --- | --- | --- |
| Domain | `src/domain` | puertos (interfaces) y tipos de fila | nada |
| Application | `src/application` | casos de uso por dominio | `domain` |
| Http | `src/http` | handlers h3, router, bridge oRPC | `application` |
| Infrastructure | `src/infrastructure` | adapters Kysely, cripto, email, telemetría | `domain` |

`src/http/composition-root.ts` es el único lugar donde se instancia
concreto: allí se crean los adapters, se inyectan en los casos de uso y se
arma el router. Ningún caso de uso importa `infrastructure` ni `http`.

## Puertos

Un puerto es una interfaz pura que además declara su propio tipo de dominio.
Por ejemplo, `TaskRepository` expone nueve operaciones —consulta por id, lista
por usuario, lista por columna, insert, update, soft delete, move, rebalance y
persist de órdenes— y todas aceptan una `trx?: Transaction` opcional.

Esa opcionalidad resuelve un problema concreto: cuando un caso de uso necesita
una unidad de trabajo que abarque varios repositorios, el composition root o
el propio caso de uso pasan la transacción explícitamente; cuando toca un solo
repositorio, se omite.

La transacción es, en el dominio, un **token opaco** (`type Transaction = {}`).
Los adapters son los únicos que saben interpretarlo: el adaptador Kysely
resuelve `(trx as Database) ?? this.db`. El `TransactionManager` es el puerto
que expone `run(work)` para abrir ese ámbito.

## Casos de uso

La forma es uniforme en los ~45 casos de uso del backend: una clase exportada
con inyección de puertos en el constructor y un método `async
execute(input): Promise<T>`. El resultado es un objeto plano (o `void`), y los
fallos se comunican con **errores de dominio tipados**, cada uno con un `code`
estable: `TASK_NOT_FOUND`, `TASK_STATE_NOT_FOUND`, `INVALID_KANBAN_ORDER`,
`INVALID_STATE_TRANSITION`, `UNAUTHORIZED`, `RATE_LIMITED`, etc. Esos códigos
son los que el HTTP traduce a status y los que el frontend discrimina.

La lógica de dominio que no necesita puertos vive en helpers puros junto a los
casos de uso (por ejemplo el cálculo de orden kanban), para que se pueda
probar sin dobles de test.

Aunque `effect` es una dependencia declarada del paquete, no se usa en el
dominio, la aplicación ni la persistencia: solo existe un test de humo que
verifica que el paquete se puede importar.

## Aislamiento multi-usuario

La regla es "ninguna query cruza usuarios". Vive en dos niveles:

- **En el contrato del puerto.** La documentación de `IncomeRepository`
  establece que todas las operaciones filtran por `userId` y que el repositorio
  siempre excluye los registros con borrado lógico.
- **En el adapter.** La consulta de ingresos filtra por `inco_user_id` y por
  `inco_deleted_at IS NULL`; la de tareas filtra por `task_user_id` y ordena
  por `task_kanban_order`.

Además, los casos de uso vuelven a comprobar la pertenencia: si el `userId` de
la fila no coincide con el del request, el resultado es "no encontrado", no
"no autorizado", para no confirmar la existencia de recursos ajenos.

## Guardas de arquitectura

Dos tests verifican invariantes estructurales y fallan el build si se rompen:

1. **Pureza de los puertos.**
   `apps/api/src/domain/ports/__no-external-imports.test.ts` escanea los
   archivos de puerto buscando imports de `kysely`, `h3`, `nitro`, `pg` o
   `nodemailer`, y falla si encuentra alguno. Limitación a tener en cuenta:
   la lista de archivos escaneados es explícita y cubre hoy seis puertos
   (attachment, category-lookup, client-lookup, task, task-state y
   type-lookup); el resto de puertos del directorio no está cubierto por este
   gate.
2. **Attachments fuera del MVP.**
   `apps/api/src/domain/ports/__attachment-not-in-composition.test.ts` falla
   si el composition root menciona `attachment-repository`, porque ese puerto
   es un stub de la fase 2 que no debe cablearse. Cuando arranque la fase 2 el
   test se elimina en lugar de relajarse.

## Criterios de prueba

La configuración del proyecto declara `runner: bun test` y `strict_tdd: true`,
con una única excepción acotada (el scaffold del monorepo, sin lógica de
negocio). Los casos de uso se prueban contra dobles en memoria: hay un
conjunto de fakes para los puertos, un `InMemoryTransactionManager`, una
telemetría en memoria, un reloj fijo y un generador de IDs determinista.

## Extensión

Para agregar un módulo nuevo el camino es siempre el mismo: definir el puerto
en `domain/ports`, el caso de uso en `application/<módulo>`, el adapter en
`infrastructure`, el handler en `http/<módulo>/` y cablear todo en el
composition root. Ninguna otra capa cambia.
