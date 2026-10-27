---
type: "Referencia"
title: "Esquema PostgreSQL, migraciones y mapeo de filas"
openwiki_generated: true
verified:
  - by: openwiki/0.7.2
    at: 2026-10-27T02:48:33.191Z
sources:
  - id: openwiki-source-80276df55c8da3940ca5955f
    resource: repo://apps/api/package.json
  - id: openwiki-source-c6714b676abb124caf2e6d98
    resource: repo://apps/api/src/domain/ports/transaction-manager.ts
  - id: openwiki-source-69dffcb52bd6dea2a0054af5
    resource: repo://apps/api/src/infrastructure/kysely/_mappers.ts
  - id: openwiki-source-be21d8e5f6af8ac2bccc3fdb
    resource: repo://apps/api/src/infrastructure/kysely/database.ts
  - id: openwiki-source-8cab6de122980c25bbc48649
    resource: repo://apps/api/src/infrastructure/kysely/migrate.ts
  - id: openwiki-source-f7a78c049892f94aa6d960fc
    resource: repo://apps/api/src/infrastructure/kysely/migrations/001_initial.ts
  - id: openwiki-source-464880366ebda16101d04e8f
    resource: repo://apps/api/src/infrastructure/kysely/migrations/002_tasks.ts
  - id: openwiki-source-eea373b207a4029de2c57095
    resource: repo://apps/api/src/infrastructure/kysely/migrations/003_incomes.ts
  - id: openwiki-source-dd276ccf35b183a75cfdf112
    resource: repo://apps/api/src/infrastructure/kysely/migrations/007_types_multi_module.ts
  - id: openwiki-source-4f7411e87488d02403205188
    resource: repo://apps/api/src/infrastructure/kysely/session-repository.ts
generated: { by: "pi", at: "2026-10-27T02:48:33.191Z" }
---


# Esquema PostgreSQL, migraciones y mapeo de filas

## Convenciones del esquema

El esquema sigue reglas uniformes, documentadas en la cabecera de cada
migración:

- **Prefijos de cuatro letras por módulo** en columnas y tablas: `clie_` para
  clientes, `task_` para tareas, `tast_` para estados, `inco_` para ingresos,
  `acco_` para cuentas, `curr_` para monedas, `sess_` para sesiones.
- **Borrado lógico** en todas las entidades de negocio, con la columna
  `*_deleted_at`; las consultas filtran `IS NULL`.
- **Timestamps** en `TIMESTAMPTZ` con default `NOW()`.
- **Claves foráneas al usuario** en cada tabla de datos, con el prefijo
  `*_user_id`, lo que materializa el aislamiento multi-usuario.
- **Idempotencia**: las migraciones usan `CREATE TABLE/INDEX IF NOT EXISTS`, y
  su `down` es destructivo y respeta el orden inverso de claves foráneas.

## Las siete migraciones

| # | Archivo | Qué crea |
| --- | --- | --- |
| 001 | `001_initial.ts` | `sino`, `apps`, `currency`, `user`, `login`, `session`, `email_sending`, `task_state`, `accounts`, `types`, `categories` |
| 002 | `002_tasks.ts` | `client`, `type_categories_client`, `attachments`, `task`, `task_attachments` |
| 003 | `003_incomes.ts` | `income` |
| 004 | `004_expenses.ts` | `expense` |
| 005 | `005_transfers.ts` | `transfer` |
| 006 | `006_schedules.ts` | `schedule` |
| 007 | `007_types_multi_module.ts` | `type_module` (TEXT) → `type_modules` (TEXT[]) |

La migración 001 además **seeda** los lookups globales: la app `Core` y la
moneda `Peso argentino` con símbolo `$` y dos decimales.

## Índices y restricciones que sostienen el comportamiento

- `session.sess_token_hash` tiene un índice **único parcial** sobre las filas
  no borradas: un token no puede estar activo dos veces y los tokens dados de
  baja no bloquean el hash.
- `task_state` declara `UNIQUE (tast_user_id, tast_order)`, que es la
  restricción que obliga al reordenamiento de columnas a usar su técnica de
  dos pasadas.
- `task` tiene índice por `(task_user_id, task_tast_id, task_kanban_order)`,
  que es exactamente el patrón de lectura del kanban, y el orden de columna se
  guarda en `DOUBLE PRECISION` para poder intercalar valores por punto medio.
- Los índices de datos son **parciales** (`WHERE ..._deleted_at IS NULL`), de
  modo que el borrado lógico no infla los índices de consulta.
- `type_categories_client` usa `UNIQUE NULLS NOT DISTINCT` sobre
  `(user, type, category, client)`, con `client_id` nulo significando "global".
- `income.inco_amount` es `NUMERIC(19, 4)` con `CHECK (inco_amount > 0)`: el
  importe es decimal exacto en la base, no un float.
- `007` migra los tipos a mult módulo: una columna `TEXT[]` con backfill desde
  el valor anterior y un `CHECK` que exige que cada elemento pertenezca al
  conjunto cerrado `{tasks, incomes, expenses, schedules}`. Un array vacío
  significa "aplica a todos los módulos".

## Conexión

`createDatabase(url)` construye un `Kysely` con `PostgresDialect` y un `Pool`
de `pg` por `connectionString`. No hay dimensionamiento del pool (ni `max` ni
`idleTimeout`), así que rigen los defaults de `pg`. La creación es perezosa:
el pool no se abre hasta la primera consulta.

## Mapeo de filas

`_mappers.ts` es la frontera de traducción. Por cada entidad hay una interfaz
`*DbRow` con los nombres de columna y una función `map*` que produce la
entidad de dominio en camelCase: `mapTaskRow` convierte `task_id` en `id`,
`task_tast_id` en `stateId` y `task_kanban_order` en `kanbanOrder`. Los
adapters quedan como SQL delgado que delega en el mapper.

El dominio nunca ve nombres de columna: los tipos de fila de
`domain/tasks/types.ts` son la representación amigable del esquema.

## Transacciones

El puerto `TransactionManager` expone `run(work)` y los adapters aceptan una
transacción opcional, resuelta siempre con el mismo patrón:

```ts
return (trx as Database | undefined) ?? this.db;
```

Así, un caso de uso que necesita atomicidad (crear sesión, mover una tarea,
reordenar columnas) abre una transacción desde la capa de aplicación y la
propaga a cada repositorio participante sin que el dominio sepa qué es Kysely.

## Cómo y cuándo correr las migraciones

Las migraciones **no** se aplican al arrancar el backend. El paso es manual y
explícito:

```bash
bun run db:migrate   # en apps/api
```

El runner usa el `Migrator` de Kysely con un `FileMigrationProvider` sobre el
directorio `migrations/`, aplica hasta la última versión, informa el estado
de cada migración, destruye el pool y sale con código 1 si hubo error. Sin
`DATABASE_URL` falla de entrada.

Hay que correrlas **después** de `make db-up` y **antes** de `bun run dev`; ni
el README ni el `Makefile` lo mencionan, y es la causa habitual de "la API
arranca pero las tablas no existen".
