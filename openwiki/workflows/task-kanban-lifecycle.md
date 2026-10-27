---
type: "Referencia"
title: "Ciclo de vida de tareas y kanban"
openwiki_generated: true
verified:
  - by: openwiki/0.7.2
    at: 2026-10-27T02:48:33.191Z
sources:
  - id: openwiki-source-991d0ae3a4200b161317ae9c
    resource: repo://apps/api/src/application/tasks/constants.ts
  - id: openwiki-source-46d59ce2aa2ffcbb703d8f35
    resource: repo://apps/api/src/application/tasks/create-task.ts
  - id: openwiki-source-d810832a3c49dad053711223
    resource: repo://apps/api/src/application/tasks/errors.ts
  - id: openwiki-source-77e5b3edd7f9d1ca8b377dd2
    resource: repo://apps/api/src/application/tasks/list-tasks.ts
  - id: openwiki-source-78f30bc635b5fdb8e0a52628
    resource: repo://apps/api/src/application/tasks/move-task.helpers.ts
  - id: openwiki-source-9dab833c457d9d1abab085c7
    resource: repo://apps/api/src/application/tasks/move-task.ts
  - id: openwiki-source-40bbd631a8f8ed5fd9c2ab77
    resource: repo://apps/api/src/application/tasks/reorder-task-states.ts
  - id: openwiki-source-1f0d2c233b9502e108dfded1
    resource: repo://apps/api/src/domain/ports/task-repository.ts
  - id: openwiki-source-97a63d117998fc71d77ae61d
    resource: repo://apps/api/src/domain/ports/task-state-repository.ts
  - id: openwiki-source-67cfe8774a1da82489da957d
    resource: repo://apps/api/src/http/tasks/error-mapping.ts
  - id: openwiki-source-6eb19f40496b02973d46756a
    resource: repo://apps/api/src/infrastructure/kysely/task-state-repository.ts
generated: { by: "pi", at: "2026-10-27T02:48:33.191Z" }
---


# Ciclo de vida de tareas y kanban

El tablero es una lista de columnas (`task_state`) y una lista de tareas con
un orden numérico decimal dentro de cada columna. No hay un índice
"explícito" (1, 2, 3): el orden se mantiene con **espacios decimales** para
poder intercalar sin reescribir la columna.

## Modelo

| Concepto | Dónde vive | Notas |
| --- | --- | --- |
| Tarea | `domain/tasks/types.ts` | `stateId`, `kanbanOrder`, cliente/tipo/categoría opcionales, `deletedAt` |
| Estado (columna) | `domain/tasks/types.ts` | `order` entero, único por usuario |
| Puertos | `domain/ports/task-repository.ts`, `task-state-repository.ts` | `TaskRepository` expone 9 operaciones, incluidas `moveTask`, `rebalanceColumn` y `persistOrders` |

## Constantes del algoritmo

| Constante | Valor | Significado |
| --- | --- | --- |
| `KANBAN_DEFAULT_STEP` | 1024 | separación por defecto entre órdenes consecutivos |
| `KANBAN_GAP_REBALANCE_THRESHOLD` | 1e-6 | por debajo de este gap el rebalanceo se dispara |

Con un paso de 1024 se pueden intercalar unas mil tareas entre dos vecinas
antes de que el hueco se agote.

## Crear

`CreateTask` valida que la columna exista y sea del usuario (si no, lanza
`TaskStateNotFound`), calcula el orden de inserción y persiste la fila:

- columna vacía → orden `1024`;
- columna con tareas → `max(orden) + 1024`.

Es decir, **crear siempre agrega al final** de la columna.

## Mover

`MoveTask` corre entero dentro de una transacción y se apoya en helpers
puros (`move-task.helpers.ts`, sin dependencias, testeables en aislamiento):

| Vecinos enviados | Resultado |
| --- | --- |
| `prev` y `next` | punto medio: `(orden(prev) + orden(next)) / 2` |
| solo `next` | prepend: `min(orden) / 2` |
| solo `prev` o ninguno | append: `max(orden) + 1024` |

Si el caller no envía vecinos, el default es **append al final** de la columna
destino. La columna destino se lee ya sin la tarea que se está moviendo, así
que mover dentro de la misma columna no se auto-interfiere.

Errores: `TaskNotFound` si la tarea no existe (404) e `InvalidKanbanOrder`
(409) si los vecinos enviados no están en la columna destino.

### Rebalanceo

Cuando el hueco entre los dos vecinos cae por debajo de `1e-6`, el caso de uso
reequilibra la columna: reasigna los órdenes de **las demás** tareas a
múltiplos de 1024 (`1024 * (i + 1)`) preservando el orden relativo, y persiste
esas órdenes en la misma transacción. La tarea movida conserva su punto
medio.

El rebalanceo existe porque los puntos medios convergen: cada inserción
divide el hueco a la mitad, y tras unas decenas de inserciones el hueco queda
por debajo de la precisión de `DOUBLE PRECISION`.

## Reordenar columnas

`ReorderTaskStates` exige que el conjunto de ids enviado sea **exactamente**
el de las columnas activas del usuario: un reorden parcial se rechaza con
`Unauthorized` (401), y un id que no pertenece al usuario produce
`TaskStateNotFound` (404).

La actualización corre en una transacción y usa una **técnica de dos
pasadas** para no violar la restricción `UNIQUE (tast_user_id, tast_order)`:
primero todos los órdenes pasan a valores negativos únicos (`-1000 - i`) y
después se asignan los órdenes finales positivos. El puerto y el adapter
exponen además `deferConstraints` (`SET CONSTRAINTS ALL DEFERRED`), pero el
caso de uso no lo usa: la técnica de dos pasadas es más simple y portable.

## Listar

`ListTasks` devuelve las tareas del usuario ordenadas por
`task_kanban_order` y excluye las borradas lógicamente. **Ojo**: el filtrado
por texto de búsqueda se hace en memoria, sobre las filas ya traídas, aunque
el docblock del caso de uso afirme que el adapter aplica `ILIKE`. El
comportamiento observable es correcto, el costo no escala.

## No hay máquina de estados

Aunque el dominio define el error `InvalidStateTransition` (mapeado a 409),
**nada lo lanza**: el estado de una tarea es una clave foránea libre y
cualquier columna del mismo usuario es un destino válido. No hay transiciones
declaradas, ni matriz de estados permitidos, ni bloqueo por tipo de tarea. El
error está en el código y en el mapeo HTTP, pero es actualmente inalcanzable
desde los casos de uso.

## Errores y su traducción a HTTP

| Error de dominio | HTTP | `code` |
| --- | --- | --- |
| `TaskNotFound` | 404 | `TASK_NOT_FOUND` |
| `TaskStateNotFound` | 404 | `TASK_STATE_NOT_FOUND` |
| `InvalidKanbanOrder` | 409 | `INVALID_KANBAN_ORDER` |
| `Unauthorized` (falta `x-user-id` o reorden parcial) | 401 | `UNAUTHORIZED` |
| error de validación de la request | 400 | `INVALID_INPUT` |

## Tests relacionados

- `application/tasks/move-task.helpers.test.ts`: la matemática del punto
  medio, el umbral de rebalanceo, el append y el prepend.
- `application/tasks/move-task.test.ts`: los seis escenarios obligatorios del
  kanban (midpoint, rebalanceo, append, prepend, cambio de columna) y la
  allowlist de atributos del span.
- `application/tasks/create-task.test.ts`: orden inicial y `TaskStateNotFound`
  para columna ajena.
- `application/tasks/reorder-task-states.test.ts`: reorden atómico y rechazo
  del reorden parcial.
- `infrastructure/kysely/task-repository.move.integration.test.ts`: el
  movimiento persistido contra una base real (se salta sin
  `TEST_DATABASE_URL`).
