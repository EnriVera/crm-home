# Api Specification (delta — change `tasks`)

> Delta sobre el spec canónico en `openspec/specs/api/spec.md`. La baseline
> (Clean architecture + OTel + kysely + migraciones + effect/xstate) NO se
> relaja; este delta AÑADE un requisito nuevo que cubre la segunda migración
> versionada del módulo tasks y la idempotencia del runner.

## ADDED Requirements

### Requirement: Migraciones versionadas del módulo tasks

`apps/api` DEBE introducir una segunda migración versionada
`src/infrastructure/kysely/migrations/002_tasks.ts` ejecutada por el
mismo runner explícito `bun run db:migrate` definido en la spec canónica
de `api` (kysely migrator nativo con `FileMigrationProvider`). La
migración DEBE crear, en orden de dependencias, las tablas del módulo
tasks (`client`, `type_categories_client`, `attachments`,
`task_attachments`, `task`) con sus índices y foreign keys del hijo al
padre según PRD §11, reutilizando la tabla `task_state` creada por la
migración previa (`001_initial.ts`) sin recrearla ni alterarla. Cada
sentencia de creación DEBE usar `CREATE TABLE IF NOT EXISTS` /
`CREATE INDEX IF NOT EXISTS` (defensa en profundidad, además del tracking
nativo del kysely migrator) de modo que `bun run db:migrate` pueda
ejecutarse dos veces seguidas sin fallar (idempotencia). `DatabaseSchema`
DEBE reflejar las nuevas tablas. El `down` DEBE dropear las cinco tablas
del change en orden inverso, respetando las FKs, y DEBE estar marcado
como destructivo (solo stage único, sin datos productivos). Las
migraciones NUNCA DEBEN correr automáticamente al arrancar nitro (la
baseline se mantiene).

#### Scenario: Segunda migración registrada y ejecutable por el runner

- GIVEN `apps/api/src/infrastructure/kysely/migrations/002_tasks.ts` y `bun run db:migrate` disponible
- WHEN se ejecuta `bun run db:migrate` con una base vacía y `DATABASE_URL` definida
- THEN las cinco tablas del módulo tasks quedan creadas con sus índices y FKs, y la tabla `task_state` permanece intacta

#### Scenario: Migración idempotente al ejecutarse dos veces

- GIVEN el schema ya migrado por una corrida previa
- WHEN se ejecuta `bun run db:migrate` una segunda vez sin cambios
- THEN la migración termina sin error y el schema resultante es idéntico al de la primera corrida

#### Scenario: Sin migración automática al arrancar

- GIVEN el servidor nitro arrancado sin ejecutar `db:migrate`
- WHEN se inspecciona el ciclo de arranque
- THEN ninguna migración corre implícitamente; el runner es siempre el script explícito

#### Scenario: DatabaseSchema extendido con las tablas del módulo tasks

- GIVEN `apps/api/src/infrastructure/kysely/database.ts` tras el change
- WHEN se inspecciona `DatabaseSchema`
- THEN incluye las tablas `task`, `client`, `type_categories_client`, `attachments` y `task_attachments` con sus prefijos de 4 letras (`task_`, `clie_`, `tccl_`, `atta_`, `taat_`)

#### Scenario: down documentado y en orden inverso de FKs

- GIVEN `002_tasks.ts`
- WHEN se inspecciona `down(db)`
- THEN dropea `task_attachments`, `attachments`, `task`, `type_categories_client`, `client` en ese orden y contiene un comentario explícito declarando el `down` como destructivo y limitado a stage único
