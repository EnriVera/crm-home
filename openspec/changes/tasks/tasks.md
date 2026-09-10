# Tasks — tasks

> Fase `tasks` del change `tasks`. Fuente de verdad:
>
> - `openspec/changes/tasks/proposal.md` (intent, D1–D10)
> - `openspec/changes/tasks/design.md` (D1–D10 resueltas, file trees, migración SQL, algoritmo kanban, contratos, gates)
> - `openspec/changes/tasks/explore.md` (estado actual del repo)
> - `openspec/changes/tasks/preproposal.md` (8 decisiones CONFIRMADAS)
> - `openspec/changes/tasks/specs/tasks/spec.md` (dominio nuevo)
> - `openspec/changes/tasks/specs/api/spec.md` (delta — migración 002)
> - `openspec/changes/tasks/specs/web-shell/spec.md` (delta — `/tasks-config` sin nav)
> - `openspec/changes/tasks/specs/web/spec.md` (delta — `/tasks`, `/tasks/:id`, BaseView)
> - `openspec/changes/tasks/specs/vendor-bindings/spec.md` (delta — bind-and-wrap)
> - `openspec/changes/tasks/specs/workspace/spec.md` (delta — verificación npm)
> - `openspec/config.yaml` (strict TDD, runner `bun test`, 400-line budget)
> - Precedentes archivados: `openspec/changes/archive/2026-09-09-backend-auth/` y
>   `openspec/changes/archive/2026-09-08-frontend-foundation/` (patrones 1:1).

## Review Workload Forecast

| Field | Value |
| ------- | ------- |
| Estimated changed lines | ~3,000 additions (across 6 PRs); PR-A ~400, PR-B ~700, PR-C ~250, PR-D ~600, PR-E ~700, PR-F ~350 |
| 400-line budget risk | High |
| Chained PRs recommended | Yes |
| Suggested split | PR-A → PR-B → PR-C → PR-D → PR-E → PR-F (stacked-to-develop; verify before next) |
| Delivery strategy | ask-on-risk |
| Chain strategy | stacked-to-develop (pending user confirmation at apply gate) |

```text
Decision needed before apply: Yes
Chained PRs recommended: Yes
Chain strategy: stacked-to-develop
400-line budget risk: High
```

> **Tamaño y chaining.** El change toca contratos compartidos de `@crm/types`,
> 6 puertos de dominio nuevos, 13 casos de uso, la migración `002_tasks.ts`,
> 6 adapters kysely, ~5 tests de integración opt-in, HTTP handlers,
> composition root, router, cliente RPC multi-contract, 2 wrappers vendor
> nuevos (bindings `@octanejs/dnd-kit` + `@octanejs/lexical` con verificación
> npm bloqueante), componente `BaseView` compartido, 7 organismos, 4
> molecules, 3 páginas, 3 rutas (`/tasks`, `/tasks/:id`, `/tasks-config`),
> 43 claves i18n y README placeholders de wrappers. **Forecast ~3,000 líneas**:
> ningún PR cabe en el budget canónico de 400. **Estrategia propuesta**:
> chaining explícito de 6 PRs (PR-A → PR-F) bajo `ask-on-risk` con
> `stacked-to-develop` (patrón del repo; cada PR mergea a `develop`, el
> siguiente se apoya en el anterior). **La decisión final de chaining /
> `size:exception` queda en el apply gate** — este tasks.md propone la
> segmentación, no la asume. `apply-progress.md` documentará la decisión
> humana cuando el apply pregunte.
>
> **Gate WU0 (npm verification) bloquea cualquier commit a
> `apps/web/package.json`.** Si falla, el work se detiene y se escala al
> product owner; la sustitución de los bindings por librerías alternativas
> está prohibida por decisión propia (spec `workspace` + `vendor-bindings`).

---

## Convenciones aplicables

- Cada work unit sigue el ciclo **RED → GREEN → TRIANGULATE → REFACTOR** (strict TDD por `config.yaml`).
- Tests unitarios backend usan repos in-memory, `FixedClock`, `FakeIdGenerator` (patrón `backend-auth`).
- Tests de integración backend son `*.integration.test.ts` con `describe.skipIf(!databaseUrl)`.
- Tests frontend son TS puro sin DOM (cubre unit del switch `BaseView`, helpers puros, validadores, contrato RPC, helpers kanban). Tests DOM difieren al primer change con testing-library.
- Domain/application no importan kysely, h3, nitro, otel-SDK ni node:crypto (solo adapters bajo `src/infrastructure/` o `src/http/`).
- Ningún import directo de bindings (`@octanejs/dnd-kit`, `@octanejs/lexical`, `@octanejs/phosphor-icons`, `@octanejs/resizable-panels`, `@octanejs/usehooks-ts`, `@octanejs/sonner`) fuera de su wrapper `components/vendor/<binding>/` (grep gate §vendor-bindings).
- Ningún verde primario (`bg-primary`, `text-primary`, `border-primary`, `outline-primary`, `ring-primary`) fuera de los 5 lugares canónicos del design system (grep gate §theme-quieter-minimalist).
- Spans OTel solo con atributos sin PII (allowlist §D6 del design). Prohibido `attributes.title` / `attributes.description` / `attributes.email` (grep gate §PII).
- `task_description` se persiste como JSON serializado del editor lexical (no HTML); `RichTextEditor` expone `onChange(jsonString)`.
- `kanban_order` es half-step con rebalanceo en `|gap| < 1e-6` (`KANBAN_GAP_REBALANCE_THRESHOLD`); helper `planMove` decide `computeInsertOrder` / `appendOrder` / `prependOrder` y dispara `rebalanceColumn` cuando corresponde.
- Tras cada work unit se actualiza `openspec/changes/tasks/apply-progress.md` con la tabla **TDD Cycle Evidence** (RED commit SHA → GREEN commit SHA → TRIANGULATE commit SHA → REFACTOR commit SHA + comando de verificación verde). El apply gate exige esta tabla completa.
- Conventional commits: `feat(types):`, `feat(api):`, `feat(web):`, `chore(api):`, `test(api):`, `docs(...)`, `chore(workspace):`. Husky + commitlint activos.

---

## Work Unit 0 — Spike de verificación npm (BLOQUEANTE)

**Entregable:** evidencia documental en `apply-progress.md` de que
`@octanejs/dnd-kit` y `@octanejs/lexical` resuelven en el registry npm y son
compatibles con `octane@0.2.3` / `react@18`. Si CUALQUIER paso falla → el work
se detiene, se documenta el hallazgo, se escala al product owner (prohibido
sustituir los bindings por decisión propia). Esta WU NO produce commits de
código; produce evidencia textual y, en caso de éxito, la línea exacta a
pinear.

### RED (definición de criterios de aceptación)

- [ ] Definir checklist de verificación (existencia → peer deps → versión → lockfile) en `openspec/changes/tasks/apply-progress.md` sección "Spike WU0 — npm verification gate". <!-- sdd-owner: implementation -->

### GREEN (ejecutar la verificación)

- [ ] Ejecutar `bun pm view @octanejs/dnd-kit versions --json`; registrar el output (última versión estable, rango de majors) en `apply-progress.md`. <!-- sdd-owner: implementation -->
- [ ] Ejecutar `bun pm view @octanejs/dnd-kit peerDependencies`; verificar que `octane` y `react` caen dentro de los rangos aceptados (sin conflictos con `octane@0.2.3` y `react@18` instalados). <!-- sdd-owner: implementation -->
- [ ] Ejecutar `bun pm view @octanejs/lexical versions --json`; registrar el output en `apply-progress.md`. <!-- sdd-owner: implementation -->
- [ ] Ejecutar `bun pm view @octanejs/lexical peerDependencies`; verificar compatibilidad con `octane@0.2.3` / `react@18` y registrar el output. <!-- sdd-owner: implementation -->
- [ ] Si algún paquete NO existe en el registry o tiene peer incompatibles → STOP; documentar el hallazgo en `apply-progress.md` sección "Escalation" y notificar al product owner antes de pinear `apps/web/package.json`. NO sustituir por `react-dnd`, `tiptap`, `slate`, etc. <!-- sdd-owner: implementation -->

### TRIANGULATE (lockfile + frozen install)

- [ ] Pinear ambas versiones exactas (sin `^` ni `~`) en `apps/web/package.json` y ejecutar `bun install` para generar `bun.lock`; verificar que `bun install --frozen-lockfile` pasa con `EXIT 0` y sin warnings de peer deps. <!-- sdd-owner: implementation -->
- [ ] Ejecutar `bun pm view @octanejs/dnd-kit@<pinned-version> peerDependencies --json` y `bun pm view @octanejs/lexical@<pinned-version> peerDependencies --json` para confirmar que la versión pineada efectivamente cumple; registrar output. <!-- sdd-owner: implementation -->
- [ ] Documentar en `apply-progress.md` las versiones exactas pineadas, los rangos de peer deps observados y el resultado de `bun install --frozen-lockfile`. <!-- sdd-owner: implementation -->

### REFACTOR

- [ ] Si la verificación pasó: registrar en `apply-progress.md` que la WU0 está cerrada y que `apps/web/package.json` puede commitearse (el commit se materializa en WU8 / PR-D, no aquí). <!-- sdd-owner: implementation -->
- [ ] Si la verificación falló: dejar `apps/web/package.json` intacto; la WU8 / PR-D queda bloqueada hasta nueva decisión. <!-- sdd-owner: implementation -->

---

## Work Unit 1 — Contratos compartidos `@crm/types` (tasks + lookups)

**Entregable:** `packages/types/src/contracts/tasks.ts`, `lookups.ts`, `tasks.test.ts`
y la re-exportación desde `packages/types/src/index.ts`. Los contratos definen
la forma del wire sin lógica de aplicación. Esta WU es prerequisito de los
PRs A–C (backend) y de PR-D (RPC client web).

### RED

- [ ] Escribir tests fallidos en `packages/types/src/contracts/tasks.test.ts` con `safeParse` por schema: `taskTitleSchema` (vacío → falla; 200 chars → ok; 201 chars → falla), `taskDescriptionSchema` (null → ok; 50_000 chars → ok; 50_001 chars → falla), `kanbanOrderSchema` (`NaN`/`Infinity` → falla; finito → ok), `taskStateTitleSchema` (vacío → falla; 50 chars → ok), `tastOrderSchema` (`-1`/`2.5` → falla; `0`/`5`/`1000` → ok), `moveTaskInputSchema` (sin `target_state_id` → falla), `listTasksOutputSchema` / `createTaskOutputSchema` / `updateTaskOutputSchema` / `moveTaskOutputSchema` (entrada y salida round-trip), `listClientsSearchInputSchema` (`query: ""` → falla; `limit: 51` → falla; `limit: 50` ok; omitido → default 20). <!-- sdd-owner: implementation -->
- [ ] Escribir tests que enumeren las operaciones del router resultante: `list`, `get`, `create`, `update`, `move`, `remove`, `states.{list,create,update,remove,reorder}`, `clients.search` (espejado del Scenario "Prefijo /tasks estable" del spec `tasks`). <!-- sdd-owner: implementation -->

### GREEN

- [ ] Implementar `packages/types/src/contracts/tasks.ts` con los schemas (`taskTitleSchema`, `taskDescriptionSchema`, `kanbanOrderSchema`, `taskStateTitleSchema`, `tastOrderSchema`, `taskSchema`, `taskStateSchema`), los input/output schemas por operación, y el `tasksContract = oc.prefix("/tasks").router({...})` con sub-routers `states` y `clients`. <!-- sdd-owner: implementation -->
- [ ] Implementar `packages/types/src/contracts/lookups.ts` con los schemas compartidos `typeForFormSchema`, `categoryForFormSchema`, `listTypesForFormInput/Output`, `listCategoriesByTypeInput/Output` y `listClientsSearchInput/Output` (SIN `lookupsContract` router propio — los endpoints se montan directamente bajo `tasksContract` para mantener paths planos). <!-- sdd-owner: implementation -->
- [ ] Re-exportar `tasksContract` y los schemas de `lookups` desde `packages/types/src/index.ts`. <!-- sdd-owner: implementation -->

### TRIANGULATE

- [ ] Agregar casos de borde: `task_title` con espacios al principio/fin (se acepta como string válido), `task_description` con caracteres Unicode y emojis (≤50_000 chars), `reorderTaskStatesInputSchema` con array vacío (`min(1)` → falla) y con 1 elemento (ok). <!-- sdd-owner: implementation -->
- [ ] Agregar un test que verifique que las rutas generadas del `tasksContract` tienen prefijo `/tasks` y que los sub-routers están bajo `/tasks/states/...` y `/tasks/clients/search` (espejado del scenario del spec `tasks`). <!-- sdd-owner: implementation -->

### REFACTOR

- [ ] Extraer `uuidSchema` a un módulo compartido (`packages/types/src/contracts/_shared.ts` o similar) para reuso entre `tasks.ts`, `lookups.ts` y futuros contratos. <!-- sdd-owner: implementation -->
- [ ] Ejecutar `bun test packages/types/` y confirmar verde; registrar la evidencia TDD de WU1 en `apply-progress.md`. <!-- sdd-owner: implementation -->

---

## PR-A — Backend foundation (migration + domain ports + constants + errors)

**Objetivo del PR:** sentar las bases del backend (migration, puertos, constantes,
errores) sin lógica de aplicación. Verifica la spec `api` (delta de migración
idempotente) y la spec `tasks` (puertos puros).

> **Estrategia de review.** El PR completo suma ~400 líneas (migration ~120,
> DatabaseSchema diff ~30, test-cleanup diff ~20, 6 puertos ~140, constants
> ~30, errors ~30, tests unit de constants/errores ~50). Sigue siendo borderline;
> si en review se observa que supera 400 con diff de imports, se subdivide en
> dos PRs (PR-A1 migration + schema; PR-A2 ports + constants + errors). La
> decisión se confirma al cerrar WU2.

## Work Unit 2 — Migración `002_tasks.ts` + DatabaseSchema + test-cleanup

**Entregable:** segunda migración versionada del repo, idempotente
(`CREATE TABLE IF NOT EXISTS`), con FKs del hijo al padre según PRD §11; el
`DatabaseSchema` extendido con las cinco tablas nuevas; `test-cleanup.ts`
extendido con `cleanupTasksTables(db)` sin romper el contrato
`cleanupAuthTables`.

### RED

- [ ] Escribir test de integración fallido en `apps/api/src/infrastructure/kysely/migrations/002_tasks.integration.test.ts` con `describe.skipIf(!databaseUrl)`: tras ejecutar `up(db)` y `cleanupTasksTables(db)`, el schema resultante contiene `client`, `type_categories_client`, `attachments`, `task_attachments`, `task` con sus índices (`idx_client_user`, `idx_task_user`, `idx_task_kanban`) y FKs correctas (`task.task_user_id → user`, `task.task_tast_id → task_state`, `task.task_type_id → types`, `task.task_cate_id → categories`, `task.task_clie_id → client`, `type_categories_client.tccl_user_id → user`, `task_attachments.taat_task_id → task`, `task_attachments.taat_atta_id → attachments`). <!-- sdd-owner: implementation -->

### GREEN

- [ ] Implementar `apps/api/src/infrastructure/kysely/migrations/002_tasks.ts` exportando `up(db)` y `down(db)` con `sql\`...\`.execute(db)`. Orden de creación:`client` (con `idx_client_user`),`type_categories_client` (con `UNIQUE NULLS NOT DISTINCT (tccl_user_id, tccl_type_id, tccl_cate_id, tccl_clie_id)`),`attachments`,`task_attachments` (PK compuesta), `task` (con `idx_task_user`,`idx_task_kanban`). Todas las sentencias con`CREATE TABLE IF NOT EXISTS` / `CREATE INDEX IF NOT EXISTS`. NO recrear`task_state` (ya existe desde `001_initial.ts`). <!-- sdd-owner: implementation -->
- [ ] Implementar `down(db)` que dropea en orden inverso (`task_attachments`, `attachments`, `task`, `type_categories_client`, `client`) con comentario explícito "DESTRUCTIVO — solo stage único, sin datos productivos". <!-- sdd-owner: implementation -->
- [ ] Extender `apps/api/src/infrastructure/kysely/database.ts` añadiendo `TaskTable`, `ClientTable`, `TypeCategoriesClientTable`, `AttachmentTable`, `TaskAttachmentsTable` interfaces y agregándolas al `DatabaseSchema` con prefijos de 4 letras (`task_`, `clie_`, `tccl_`, `atta_`, `taat_`). <!-- sdd-owner: implementation -->
- [ ] Extender `apps/api/src/infrastructure/kysely/test-cleanup.ts` con `cleanupTasksTables(db)` que borra `task_attachments`, `attachments`, `task`, `type_categories_client`, `client` en orden inverso de FKs (sin tocar `cleanupAuthTables`). <!-- sdd-owner: implementation -->

### TRIANGULATE

- [ ] Agregar test de idempotencia: ejecutar `up(db)` dos veces seguidas; la segunda corrida termina sin error (los `IF NOT EXISTS` defienden la duplicación). <!-- sdd-owner: implementation -->
- [ ] Agregar test de que `down(db)` después de `up(db)` deja el schema del change eliminado pero `task_state` permanece intacto (pertenece a `001_initial.ts`). <!-- sdd-owner: implementation -->
- [ ] Ejecutar `bun run db:migrate` contra una base de test con `DATABASE_URL` y verificar end-to-end; commitear la salida de `bun run db:migrate` (tablas creadas) en `apply-progress.md`. <!-- sdd-owner: implementation -->

### REFACTOR

- [ ] Revisar el orden de `DROP TABLE IF EXISTS` en `down(db)` para evitar errores de FK residual; validar con un test que ejecuta `down` sobre una base con datos sembrados. <!-- sdd-owner: implementation -->
- [ ] Registrar la evidencia TDD de WU2 en `apply-progress.md` (RED SHA → GREEN SHA → TRIANGULATE SHA → REFACTOR SHA + output de `bun run db:migrate`). <!-- sdd-owner: implementation -->

## Work Unit 3 — Constantes, errores y puertos de dominio (interfaces puras)

**Entregable:** `constants.ts`, `errors.ts` y los 6 puertos de dominio como
interfaces TypeScript puras (sin lógica de aplicación ni imports de kysely/h3).
Estos puertos son contratos que las WU4 (use cases) y WU5 (kysely adapters)
consumirán.

### RED

- [ ] Escribir tests unitarios en `apps/api/src/application/tasks/constants.test.ts` que importan las constantes y verifican valores literales: `KANBAN_DEFAULT_STEP = 1024`, `KANBAN_GAP_REBALANCE_THRESHOLD = 1e-6`, `TASK_TITLE_MAX = 200`, `TASK_DESCRIPTION_MAX = 50_000` (estos tests compilan fallan hasta que existan las constantes). <!-- sdd-owner: implementation -->
- [ ] Escribir tests unitarios en `apps/api/src/application/tasks/errors.test.ts` que instancian cada error class y verifican `instanceof` y `code` esperado: `TaskNotFound`, `TaskStateNotFound`, `InvalidKanbanOrder`, `InvalidStateTransition`, `Unauthorized`. <!-- sdd-owner: implementation -->
- [ ] Escribir tests unitarios en `apps/api/src/domain/ports/task-repository.port.test.ts` que compilan contra los tipos de `TaskRepository` (mover firma de `moveTask` y `rebalanceColumn` con `trx?: Transaction` opcional, `persistOrders` con `trx?` opcional, `listByColumn`). <!-- sdd-owner: implementation -->

### GREEN

- [ ] Implementar `apps/api/src/application/tasks/constants.ts` exportando `KANBAN_DEFAULT_STEP`, `KANBAN_GAP_REBALANCE_THRESHOLD`, `TASK_TITLE_MAX`, `TASK_DESCRIPTION_MAX`. <!-- sdd-owner: implementation -->
- [ ] Implementar `apps/api/src/application/tasks/errors.ts` exportando las clases de error tipadas (extienden un `TaskDomainError` base o son `Error` con `code` discriminable); cada error expone `code` mapeable a status HTTP en el handler (WU6). <!-- sdd-owner: implementation -->
- [ ] Implementar los 6 puertos de dominio en `apps/api/src/domain/ports/`: `task-state-repository.ts` (`findById`, `findByUser`, `insert`, `update`, `softDelete`, `persistOrder`, todos con `trx?: Transaction`), `task-repository.ts` (`findById`, `listByUser`, `listByColumn`, `insert`, `update`, `softDelete`, `moveTask({ taskId, targetStateId, prevTaskId?, nextTaskId? }, trx?)`, `rebalanceColumn(rows, trx?)`, `persistOrders(rows, trx?)`), `attachment-repository.ts` (stub Fase 2 con interfaz mínima: `findById`, `listByTask`, `insert`, `softDelete`; ningún handler lo consume en MVP), `client-lookup-repository.ts` (`searchByNamePrefix({ userId, query, limit })`), `type-lookup-repository.ts` (`listForForm({ userId, clieId? })`), `category-lookup-repository.ts` (`listByType({ userId, typeId })`). <!-- sdd-owner: implementation -->

### TRIANGULATE

- [ ] Agregar test que verifique que ningún puerto importa `kysely`, `h3`, `nitro` ni SDKs externos (grep gate dentro del test o `assertNoExternalImports(file)`). <!-- sdd-owner: implementation -->
- [ ] Agregar test que verifique que `AttachmentRepository` no aparece en el composition root actual (grep gate para evitar consumo accidental en MVP). <!-- sdd-owner: implementation -->

### REFACTOR

- [ ] Extraer tipos compartidos `TaskRow`, `TaskStateRow`, `ClientRow`, etc. a un archivo `apps/api/src/domain/tasks/types.ts` para evitar duplicación entre puertos y futuros adapters. <!-- sdd-owner: implementation -->
- [ ] Registrar la evidencia TDD de WU3 en `apply-progress.md`; confirmar que `bun test` sigue verde sin postgres ni OTLP. <!-- sdd-owner: implementation -->

---

## PR-B — Backend use cases + kysely adapters

**Objetivo del PR:** implementar los 13 casos de uso (TS puro con repos
in-memory) y los 6 adapters kysely con tests de integración opt-in. Es el PR
más grande (~700 líneas); la cobertura de los 6 escenarios del algoritmo
kanban es obligatoria (gates §D3 del design).

## Work Unit 4 — Casos de uso del módulo tasks (13) con tests unitarios

**Entregable:** los 13 archivos `apps/api/src/application/tasks/<caso>.ts` con
sus tests `*.test.ts` siguiendo patrón `backend-auth`
(`FixedClock` + repos in-memory + `FakeIdGenerator`). Esta WU es prerequisito
de WU5 (los adapters kysely se testean indirectamente contra los casos de
uso en integración).

### RED (helpers puros primero)

- [ ] Escribir tests fallidos en `apps/api/src/application/tasks/move-task.helpers.test.ts` para los helpers puros (sin repos ni reloj): `computeInsertOrder(1024, 2048) === 1536`; `shouldRebalance(5e-7) === true` y `shouldRebalance(1e-5) === false`; `rebalanceColumn([{id:"a",order:1024},{id:"b",order:1024.0000005}]) === [{id:"a",order:1024},{id:"b",order:2048}]`; `appendOrder([]) === KANBAN_DEFAULT_STEP` y `appendOrder([{order:4096}]) === 5120`; `prependOrder([]) === KANBAN_DEFAULT_STEP` y `prependOrder([{order:1024}]) === 512`; `planMove(column, prev, next)` devuelve `{order, rebalance|null}` correcto en los 6 escenarios (gap normal, gap<1e-6, append, prepend, cross-column, move entre columnas distantes). <!-- sdd-owner: implementation -->

### GREEN (helpers puros)

- [ ] Implementar `apps/api/src/application/tasks/move-task.ts` con los helpers `computeInsertOrder`, `shouldRebalance`, `rebalanceColumn`, `appendOrder`, `prependOrder`, `planMove`, y la clase `MoveTask` (con `constructor(private deps: { taskRepository, taskStateRepository, transactionManager, telemetry })` + `execute(input)`). <!-- sdd-owner: implementation -->

### RED (use cases de lectura + lookups)

- [ ] Escribir tests fallidos para `list-tasks.test.ts` (filtro `search` opcional aplica `ILIKE` sobre título; devuelve shape `Task[]`), `get-task.test.ts` (lanza `TaskNotFound` si no existe), `list-task-states.test.ts` (devuelve los `task_state` del usuario ordenados por `tast_order`), `list-clients-for-selector.test.ts` (filtra por `userId`, aplica substring case-insensitive sobre `clie_name`, trunca a `limit` con cap 50), `list-types-for-form.test.ts` (devuelve globales + del cliente seleccionado), `list-categories-by-type.test.ts` (filtra categorías por `type_id`). <!-- sdd-owner: implementation -->

### GREEN (use cases de lectura + lookups)

- [ ] Implementar `ListTasks`, `GetTask`, `ListTaskStates`, `ListClientsForSelector`, `ListTypesForForm`, `ListCategoriesByType` siguiendo el patrón `class Xxx { constructor(private deps) {} async execute(input) { … } }`. <!-- sdd-owner: implementation -->

### RED (use cases de escritura — happy + error paths)

- [ ] Escribir tests fallidos para `create-task.test.ts` (happy: crea task al final de la columna Pendiente con `order = max + 1024`; error: `TaskStateNotFound` si `task_tast_id` no existe), `update-task.test.ts` (happy: actualiza campos provistos; error: `TaskNotFound`), `delete-task.test.ts` (happy: soft-delete con `task_deleted_at`; error: `TaskNotFound`), `create-task-state.test.ts`, `update-task-state.test.ts`, `delete-task-state.test.ts`, `reorder-task-states.test.ts` (happy: aplica `{tast_id, tast_order}[]` atómicamente). <!-- sdd-owner: implementation -->

### GREEN (use cases de escritura)

- [ ] Implementar `CreateTask`, `UpdateTask`, `DeleteTask`, `CreateTaskState`, `UpdateTaskState`, `DeleteTaskState`, `ReorderTaskStates` siguiendo el patrón. `CreateTask` DEBE invocar `appendOrder(rows)` para asignar `task_kanban_order = max + KANBAN_DEFAULT_STEP` con `idGenerator.next()` para `task_id` y `clock.now()` para timestamps. <!-- sdd-owner: implementation -->

### TRIANGULATE (move-task + create-task append + reorder edge cases)

- [ ] Ampliar `move-task.test.ts` con los 6 escenarios obligatorios del algoritmo kanban: (1) gap normal entre A=1024 y B=4096 → `order = 2560`, NO `persistOrders`; (2) gap `< 1e-6` (A=1024, B=1024.0000005) → `persistOrders` llamado con `[{a,1024},{b,2048}]` + span `task.move` con atributo `task.kanban_order_rebalanced = true`; (3) append al final → `appendOrder`; (4) prepend al inicio → `prependOrder`; (5) cross-column → `task_tast_id` actualizado + orden estable; (6) move entre columnas distantes → atómico via `transactionManager.run()`. <!-- sdd-owner: implementation -->
- [ ] Agregar test que verifica que `MoveTask.execute` emite exactamente los atributos PII-safe del allowlist §D6 (`task.task_id`, `task.task_tast_id_from`, `task.task_tast_id_to`, `result.success`); nunca `task.task_title` / `task.task_description` / `client.clie_email`. <!-- sdd-owner: implementation -->

### REFACTOR

- [ ] Extraer `FakeIdGenerator`, `FixedClock`, `InMemoryTaskRepository`, `InMemoryTaskStateRepository`, `InMemoryClientLookupRepository`, `InMemoryTypeLookupRepository`, `InMemoryCategoryLookupRepository` a `apps/api/src/application/tasks/test-helpers/` para reuso entre los 13 tests (un único helper compartido). <!-- sdd-owner: implementation -->
- [ ] Validar con `grep -RE 'attributes\.(title|description|email)' apps/api/src/application/tasks/` que NO hay atributos prohibidos (gate PII §D6). <!-- sdd-owner: implementation -->
- [ ] Registrar la evidencia TDD de WU4 en `apply-progress.md` (un row por caso de uso + un row por escenario kanban). <!-- sdd-owner: implementation -->

## Work Unit 5 — Kysely adapters (6) + tests de integración opt-in

**Entregable:** los 6 adapters que implementan los puertos de WU3 contra la DB
real, más los `*.integration.test.ts` que verifican end-to-end el contrato
kanban (cross-column + rebalanceo) y los lookups con FKs.

### RED (integration tests opt-in)

- [ ] Escribir tests de integración fallidos en `apps/api/src/infrastructure/kysely/task-state-repository.integration.test.ts`, `task-repository.integration.test.ts`, `client-lookup-repository.integration.test.ts` con `describe.skipIf(!databaseUrl)` que cubren CRUD básico + soft-delete + el índice `idx_task_kanban` se usa en `listByColumn`. <!-- sdd-owner: implementation -->
- [ ] Escribir test de integración específico `task-repository.move.integration.test.ts` que verifica end-to-end: cross-column persiste estado y orden en una transacción; rebalanceo se aplica y el siguiente `listByColumn` devuelve orden estable (múltiplos de 1024); `task_kanban_order` se reinserta correctamente tras `persistOrders`. <!-- sdd-owner: implementation -->

### GREEN (adapters)

- [ ] Implementar `apps/api/src/infrastructure/kysely/task-state-repository.ts` con `findById`, `findByUser`, `insert`, `update`, `softDelete`, `persistOrder`; métodos con `trx?: Transaction` opcional; `mapRow` convierte columnas snake a entidades de dominio. <!-- sdd-owner: implementation -->
- [ ] Implementar `apps/api/src/infrastructure/kysely/task-repository.ts` con `findById`, `listByUser`, `listByColumn(userId, tastId, trx?)`, `insert`, `update`, `softDelete`, `moveTask({...}, trx?)` (UPDATE atómico de `task_tast_id` + `task_kanban_order`), `rebalanceColumn(rows, trx?)` (UPDATE en batch vía `db.updateTable(...).set(...).where(...)` por id), `persistOrders(rows, trx?)`. <!-- sdd-owner: implementation -->
- [ ] Implementar `apps/api/src/infrastructure/kysely/attachment-repository.ts` con `findById`, `listByTask`, `insert`, `softDelete` (Fase 2 stub; sin handler HTTP en MVP). <!-- sdd-owner: implementation -->
- [ ] Implementar `apps/api/src/infrastructure/kysely/client-lookup-repository.ts` (`searchByNamePrefix` con `ILIKE` case-insensitive sobre `clie_name`, filtro `clie_user_id`, cap 50), `type-lookup-repository.ts` (`listForForm` con UNION entre globales y del cliente via `type_categories_client`), `category-lookup-repository.ts` (`listByType` filtrando por `type_id`). <!-- sdd-owner: implementation -->

### TRIANGULATE

- [ ] Agregar test de integración que verifica que `moveTask` cross-column con `shouldRebalance(gap) === true` actualiza `task_tast_id`, `task_kanban_order`, y emite el span correcto con `task.kanban_order_rebalanced = true`; tras `listByColumn` el orden de las tasks restantes es múltiplo de `KANBAN_DEFAULT_STEP`. <!-- sdd-owner: implementation -->
- [ ] Agregar test de integración que verifica que `searchByNamePrefix("acme", { userId: u1 })` devuelve solo clientes de `u1` (multi-user isolation); con `clie_user_id = u2` NO devuelve resultados aunque haya match de substring. <!-- sdd-owner: implementation -->
- [ ] Agregar test que verifica que `AttachmentRepository` existe pero no es invocado por ningún handler (grep gate dentro del integration test o en el composition root test). <!-- sdd-owner: implementation -->

### REFACTOR

- [ ] Extraer `mapRow` helpers a `apps/api/src/infrastructure/kysely/_mappers.ts` (shared con auth precedents si aplica); asegurar que `task_kanban_order: number` (DOUBLE PRECISION → `number`) y los timestamps `Date` se serializan correctamente. <!-- sdd-owner: implementation -->
- [ ] Registrar la evidencia TDD de WU5 en `apply-progress.md` (output de `bun test` con `TEST_DATABASE_URL` definida, conteo de tests integración verdes). <!-- sdd-owner: implementation -->

---

## PR-C — Backend HTTP layer (handlers + composition root + router)

**Objetivo del PR:** exponer los 13 casos de uso como endpoints HTTP
`/rpc/tasks/**` con mapeo de errores a status HTTP; extender el composition
root para cablear los nuevos repos + casos de uso. Verifica la spec `api`
(integración con kysely + composition root) y la spec `tasks` (contratos orpc
expuestos vía HTTP).

## Work Unit 6 — HTTP handlers, composition root y router

**Entregable:** `apps/api/src/http/tasks/tasks-routes.ts` con 13
`createXxxHandler(deps)`, `apps/api/src/http/composition-root.ts` extendido
para cablear tasks + lookups, y `apps/api/src/http/router.ts` con dispatch
para `/rpc/tasks/**`.

### RED

- [ ] Escribir tests fallidos en `apps/api/src/http/tasks/tasks-routes.test.ts` (unit sin postgres, mockeando los casos de uso): cada handler retorna el resultado del caso de uso envuelto en `Response.json(...)`; errores de dominio se mapean a status HTTP (`TaskNotFound` → 404, `TaskStateNotFound` → 404, `InvalidKanbanOrder` → 409, `Unauthorized` → 401, validación zod → 400). <!-- sdd-owner: implementation -->

### GREEN

- [ ] Implementar `apps/api/src/http/tasks/tasks-routes.ts` con `createListTasksHandler(deps)`, `createGetTaskHandler(deps)`, `createCreateTaskHandler(deps)`, `createUpdateTaskHandler(deps)`, `createMoveTaskHandler(deps)`, `createRemoveTaskHandler(deps)`, `createListTaskStatesHandler(deps)`, `createCreateTaskStateHandler(deps)`, `createUpdateTaskStateHandler(deps)`, `createRemoveTaskStateHandler(deps)`, `createReorderTaskStatesHandler(deps)`, `createListClientsSearchHandler(deps)`. Cada handler usa `readValidatedBody(event, schema.parse)` y `Response.json(result)`; el mapeo de errores vive en un helper compartido `mapTaskErrorToStatus(error): { status: number; body: { error: string; code: string } }`. <!-- sdd-owner: implementation -->
- [ ] Extender `apps/api/src/http/composition-root.ts` instanciando `KyselyTaskStateRepository`, `KyselyTaskRepository`, `KyselyAttachmentRepository` (stub Fase 2), `KyselyClientLookupRepository`, `KyselyTypeLookupRepository`, `KyselyCategoryLookupRepository`; cableando los 13 casos de uso con sus dependencias; pasando el objeto de handlers al `createRpcHandler({ ..., listTasks, getTask, …, listClientsForSelector, listTypesForForm, listCategoriesByType })`. <!-- sdd-owner: implementation -->
- [ ] Extender `apps/api/src/http/router.ts` añadiendo las 13 ramas de dispatch por path (`/rpc/tasks/list`, `/rpc/tasks/get`, `/rpc/tasks/create`, `/rpc/tasks/update`, `/rpc/tasks/move`, `/rpc/tasks/remove`, `/rpc/tasks/states/list`, `/rpc/tasks/states/create`, `/rpc/tasks/states/update`, `/rpc/tasks/states/remove`, `/rpc/tasks/states/reorder`, `/rpc/tasks/clients/search`, más los endpoints de lookups adicionales si se exponen por separado). Preservar el patrón actual `if (path === "/rpc/...")` sin introducir un segundo `RPCHandler`. <!-- sdd-owner: implementation -->

### TRIANGULATE

- [ ] Agregar test que verifica que un handler con `TaskNotFound` retorna status 404 con body `{ error: "Task not found", code: "TASK_NOT_FOUND" }`. <!-- sdd-owner: implementation -->
- [ ] Agregar test que verifica que un handler con validación zod fallida retorna 400 con el detalle de los issues de zod. <!-- sdd-owner: implementation -->
- [ ] Agregar test de integración opt-in (`apps/api/src/http/tasks/tasks-routes.integration.test.ts` con `describe.skipIf(!databaseUrl)`) que ejecuta el flujo completo: crear una task vía handler → moverla cross-column vía handler → leerla de nuevo y verificar estado + orden persistidos. <!-- sdd-owner: implementation -->

### REFACTOR

- [ ] Extraer `mapTaskErrorToStatus` a `apps/api/src/http/tasks/error-mapping.ts` para testeo aislado y reuso. <!-- sdd-owner: implementation -->
- [ ] Validar que `apps/api/src/http/router.test.ts` sigue pasando (no se rompe el dispatch existente de auth/health); validar que `bun test` sigue verde sin postgres ni OTLP. <!-- sdd-owner: implementation -->
- [ ] Registrar la evidencia TDD de WU6 en `apply-progress.md` (incluyendo el output de los integration tests si `TEST_DATABASE_URL` está definida). <!-- sdd-owner: implementation -->

---

## PR-D — Frontend wrappers + BaseView + RPC multi-contract

**Objetivo del PR:** introducir el cliente RPC multi-contract (que el resto del
frontend usará), los dos wrappers vendor nuevos (`dnd-kit`, `lexical`) con
verificación npm ya cerrada en WU0, y el componente `BaseView` compartido.
Verifica los deltas `vendor-bindings`, `workspace`, `web` y `tasks`
(BaseView + RPC).

> **Gate.** Esta PR NO puede mergear sin que WU0 esté cerrada con resultado
> verde. Si WU0 escaló, esta PR queda bloqueada.

## Work Unit 7 — Cliente RPC web multi-contract + rpc-verifier swap

**Entregable:** `apps/web/src/lib/api/rpc.ts` generalizado a multi-contract;
`apps/web/src/lib/otp/rpc-verifier.ts` migrado a `rpc.auth.verifyOtp.mutate`;
tests unitarios para ambos.

### RED

- [ ] Escribir tests fallidos en `apps/web/src/lib/api/rpc.test.ts` que mockean `RPCLink` y verifican: (a) `createRpcClient(baseURL)` retorna objeto con `auth` y `tasks` namespaces; (b) `createRpcClient("javascript:alert(1)")` lanza error `Invalid RPC base URL`; (c) cada namespace expone los métodos esperados (e.g. `auth.verifyOtp`, `tasks.list`, `tasks.move`, `tasks.states.reorder`, `tasks.clients.search`). <!-- sdd-owner: implementation -->
- [ ] Escribir tests fallidos en `apps/web/src/lib/otp/rpc-verifier.test.ts` que mockean `rpc.auth.verifyOtp.mutate` (NO `rpc.verifyOtp` directo) y verifican que `valid | invalid | expired` se devuelven sin transformación. <!-- sdd-owner: implementation -->

### GREEN

- [ ] Modificar `apps/web/src/lib/api/rpc.ts` para tipar `RpcClient = { auth: ContractRouterClient<typeof authContract>, tasks: ContractRouterClient<typeof tasksContract> }`; `createRpcClient(baseURL)` construye un `RPCLink` compartido con `credentials: 'include'` y crea un `createORPCClient` por contrato (`authContract`, `tasksContract`). Preservar la validación `ALLOWED_BASE_URL_PATTERN`. <!-- sdd-owner: implementation -->
- [ ] Migrar `apps/web/src/lib/otp/rpc-verifier.ts` para invocar `rpc.auth.verifyOtp.mutate({ email, code })` (en lugar del antiguo `rpc.verifyOtp` directo); sin tocar la UI ni la máquina OTP. <!-- sdd-owner: implementation -->

### TRIANGULATE

- [ ] Agregar test que verifica que el `RPCLink` se construye una sola vez y se reusa entre los dos contratos (DRY en `createRpcClient`). <!-- sdd-owner: implementation -->
- [ ] Agregar test que verifica que el email cerrado en la closure del verifier se envía en el payload de `verifyOtp`. <!-- sdd-owner: implementation -->

### REFACTOR

- [ ] Documentar en el README de `lib/api/rpc.ts` (o JSDoc del módulo) que `rpc.auth.*` y `rpc.tasks.*` son los namespaces canónicos; futuros módulos (`clients`, `finance`) se agregan al objeto de contratos sin nuevos archivos de cliente. <!-- sdd-owner: implementation -->
- [ ] Registrar la evidencia TDD de WU7 en `apply-progress.md`. <!-- sdd-owner: implementation -->

## Work Unit 8 — Vendor wrappers (`@octanejs/dnd-kit` + `@octanejs/lexical`)

**Entregable:** los dos wrappers en `apps/web/src/components/vendor/{dnd-kit,lexical}/`,
el primer commit a `apps/web/package.json` con las versiones pineadas (post-WU0),
los READMEs con las 4 secciones obligatorias (encapsula, API pública, regla §9,
SSR), y los tests de SSR-safe mount.

### RED

- [ ] Definir la API pública objetivo en los tests: `apps/web/src/components/vendor/dnd-kit/dnd-context.test.ts` (mock básico de `DndContext` mount en `useEffect`); `apps/web/src/components/vendor/lexical/rich-text-editor.test.ts` (mock del editor, verificar que `onChange` recibe JSON string y que `defaultValue` parsea JSON). <!-- sdd-owner: implementation -->

### GREEN (npm install post-WU0)

- [ ] Confirmar que WU0 cerró con verificación npm verde y versiones pineadas registradas en `apply-progress.md`. <!-- sdd-owner: implementation -->
- [ ] Ejecutar `bun add @octanejs/dnd-kit@<version-exact>` y `bun add @octanejs/lexical@<version-exact>` en `apps/web/`; commitear `apps/web/package.json` + `bun.lock` con la diff aislada a estos dos paquetes (no mezclar con otros cambios). <!-- sdd-owner: implementation -->
- [ ] Verificar que `bun install --frozen-lockfile` pasa con `EXIT 0` y sin warnings de peer deps (post-install smoke). <!-- sdd-owner: implementation -->
- [ ] Implementar `apps/web/src/components/vendor/dnd-kit/index.ts` re-exportando `DndContext`, `useDraggable`, `useDroppable` (y tipos si aplica). <!-- sdd-owner: implementation -->
- [ ] Implementar `apps/web/src/components/vendor/dnd-kit/dnd-context.tsrx` con un componente cliente que monta el `DndContext` real dentro de `useEffect` (SSR-safe per §D8: el SSR renderiza children sin DnD). <!-- sdd-owner: implementation -->
- [ ] Crear `apps/web/src/components/vendor/dnd-kit/README.md` con las 4 secciones: (1) qué encapsula (`@octanejs/dnd-kit` + `@dnd-kit/core` upstream), (2) API pública (`DndContext`, `useDraggable`, `useDroppable` con tipos), (3) regla §9 (único módulo autorizado a importar el binding; gate por grep), (4) patrón SSR (`DndContext` se monta tras hidratación en `useEffect`). <!-- sdd-owner: implementation -->
- [ ] Implementar `apps/web/src/components/vendor/lexical/index.ts` re-exportando `RichTextEditor` y `RichTextEditorProps`. <!-- sdd-owner: implementation -->
- [ ] Implementar `apps/web/src/components/vendor/lexical/rich-text-editor.tsrx` con `RichTextEditor({ value, onChange, placeholder, maxLength? })`: `value` es JSON string, `onChange(jsonString)`; monta el editor en `useEffect`; SSR renderiza un placeholder con `value` parseado a texto plano. <!-- sdd-owner: implementation -->
- [ ] Crear `apps/web/src/components/vendor/lexical/README.md` con las 4 secciones: (1) qué encapsula (`@octanejs/lexical` + `lexical` upstream), (2) API pública (props de `RichTextEditor`), (3) regla §9, (4) patrón SSR (mount en cliente + placeholder server-side). <!-- sdd-owner: implementation -->

### TRIANGULATE

- [ ] Validar el grep gate §vendor-bindings: `grep -RE "from ['\"]@octanejs/(dnd-kit|lexical)['\"]" apps/web/src/` debe devolver solo hits bajo `components/vendor/dnd-kit/` y `components/vendor/lexical/`. <!-- sdd-owner: implementation -->
- [ ] Validar el grep gate PII-a-través-de-wrappers: `grep -RE "from ['\"]@octanejs/(dnd-kit|lexical)" apps/web/src/components/{organisms,molecules,pages}/task*` debe devolver 0 hits. <!-- sdd-owner: implementation -->
- [ ] Verificar manualmente que el SSR de `RichTextEditor` renderiza el placeholder con texto plano (no rompe el snapshot inicial). <!-- sdd-owner: implementation -->

### REFACTOR

- [ ] Actualizar `openspec/config.yaml` sección `stack.frontend.diferidos` retirando `@octanejs/lexical` y `@octanejs/dnd-kit` de la lista (ahora consumidos por este change). <!-- sdd-owner: implementation -->
- [ ] Registrar la evidencia TDD de WU8 en `apply-progress.md` (versiones pineadas, output de `bun install --frozen-lockfile`, validación grep). <!-- sdd-owner: implementation -->

## Work Unit 9 — Componente `BaseView` + 3 vistas (list, grid, kanban)

**Entregable:** `apps/web/src/components/base-view/base-view.tsrx` materializado
con la firma `{ id?, filters, records, views?, onFilterChange?, gridStructure,
listStructure, kanbanStructure }`; las tres vistas
`apps/web/src/components/base-view/views/{list,grid,kanban}.tsrx`; tests unitarios
del switch + persistencia; README documentando el contrato real (reemplaza el
placeholder previo).

### RED

- [ ] Escribir tests fallidos en `apps/web/src/components/base-view/base-view.test.ts` (TS puro, sin DOM): (a) el switch de vista es estado interno (`useState<ViewKind>`), el padre no lo controla; (b) con `views={["list","grid"]}` el switcher no expone la pestaña kanban; (c) los filtros se persisten en `localStorage["base-view:" + id]` con namespace correcto (NO colisiona con `crm-sidebar-layout`); (d) tras `localStorage.setItem("base-view:tasks-list", JSON.stringify({search:"fact"}))` y mount, los filtros se hidratan con `{search:"fact"}`. <!-- sdd-owner: implementation -->

### GREEN

- [ ] Implementar `apps/web/src/components/base-view/base-view.tsrx` con la firma del design §D2: estado interno `useState<ViewKind>` (default `views[0]`); estado interno `useState<F>` para filtros activos; `useEffect` que sincroniza `activeFilters → localStorage["base-view:" + (id ?? useId())]`; `useEffect` que hidrata desde localStorage en mount; render de `SearchInput` (W11) + `ViewSwitcher` + el switch `<listStructure.row | gridStructure.card | kanbanStructure.board>` según `view`. <!-- sdd-owner: implementation -->
- [ ] Implementar `apps/web/src/components/base-view/views/list.tsrx` que itera `records` y aplica `listStructure.row(record)`. <!-- sdd-owner: implementation -->
- [ ] Implementar `apps/web/src/components/base-view/views/grid.tsrx` que itera `records` y aplica `gridStructure.card(record)` en columnas (`columns: number`, default 3). <!-- sdd-owner: implementation -->
- [ ] Implementar `apps/web/src/components/base-view/views/kanban.tsrx` que aplica `kanbanStructure.board({records, onMove})` (el board concreto vive en `task-kanban-board` organism; este archivo solo delega). <!-- sdd-owner: implementation -->
- [ ] Reemplazar `apps/web/src/components/base-view/README.md` con el contrato real (firma completa, ejemplos de uso, regla "sin fork por módulo — extender `F extends BaseViewFilters` si hace falta"). <!-- sdd-owner: implementation -->

### TRIANGULATE

- [ ] Agregar test que verifica que `BaseView` no expone props específicas de tasks (`taskOnly*`, `module="tasks"`); cualquier extensión debe pasar por `F extends BaseViewFilters`. <!-- sdd-owner: implementation -->
- [ ] Agregar test que simula el ciclo de persistencia: `setFilters({search:"fact"})` → escribe a localStorage → mount nuevo → recupera `{search:"fact"}`. <!-- sdd-owner: implementation -->

### REFACTOR

- [ ] Extraer el `ViewSwitcher` interno a `apps/web/src/components/base-view/view-switcher.tsrx` para aislar el render del switch de tabs. <!-- sdd-owner: implementation -->
- [ ] Registrar la evidencia TDD de WU9 en `apply-progress.md`. <!-- sdd-owner: implementation -->

---

## PR-E — `/tasks` UI (list, grid, kanban, detail form)

**Objetivo del PR:** entregar la página `/tasks` funcional con sus tres vistas,
el form de tarea, los organismos y molecules, y la extensión del catálogo
i18n. Verifica la spec `web` (delta de BaseView en `/tasks`), la spec
`web-shell` (delta de shell route + tooltip gear), y la spec `tasks`
(form, attachments disabled, validación cliente).

## Work Unit 10 — Catálogo i18n (43 claves `tasks.*`) + validación cliente + helpers kanban

**Entregable:** la sección `tasks.*` completa en
`apps/web/src/lib/i18n/locales/es.json` (sin PR parcial); los validadores
`apps/web/src/lib/validation/task.ts` con tests; los helpers de cliente
`apps/web/src/lib/tasks/tasks-kanban.ts` (sort, moveItem) y
`apps/web/src/lib/tasks/tasks-form.ts` (mappers + reset deps).

### RED (i18n auto-detection debe fallar primero)

- [ ] Escribir tests fallidos en `apps/web/src/lib/i18n/i18n.test.ts` que, dado el catálogo actual (sin sección `tasks.*`), reporten claves `tasks.*` usadas en código como ausentes (gate natural del precedent: el glob ya cubre `.tsrx`). <!-- sdd-owner: implementation -->
- [ ] Escribir tests fallidos en `apps/web/src/lib/validation/task.test.ts`: `taskTitleRequired("")` → mensaje `tasks.form.titleRequired`; `taskTitleRequired("x".repeat(200))` → `null`; `taskTitleRequired("x".repeat(201))` → `tasks.form.titleTooLong`; `taskDescriptionLength(null)` → `null`; `taskDescriptionLength("x".repeat(50_001))` → mensaje de error. <!-- sdd-owner: implementation -->
- [ ] Escribir tests fallidos en `apps/web/src/lib/tasks/tasks-kanban.test.ts` para helpers puros: `sortByOrder(rows)` ordena ascendente por `order`; `moveItem(rows, fromId, toIndex)` reordena y devuelve nuevos órdenes (helper cliente antes del POST a `rpc.tasks.move`). <!-- sdd-owner: implementation -->
- [ ] Escribir tests fallidos en `apps/web/src/lib/tasks/tasks-form.test.ts`: `resetCategoryIfIncompatible(formState, newClieId, newTypeId)` retorna `cate_id = null` cuando la categoría previa no aplica al nuevo par cliente+tipo; `mapTaskEntityToFormInput(task)` round-trip con `mapFormInputToTaskEntity(input)`. <!-- sdd-owner: implementation -->

### GREEN

- [ ] Extender `apps/web/src/lib/i18n/locales/es.json` con la sección `tasks.*` completa (43 claves agrupadas: `page.{title,newTask,configTooltip}`, `search.{placeholder,label}`, `views.{list,grid,kanban}`, `state.{empty,moveToStart,moveToEnd}`, `card.{edit,delete,noDescription,noClient,noCategory}`, `form.{titleLabel,titlePlaceholder,titleRequired,titleTooLong,descriptionLabel,descriptionPlaceholder,clientLabel,clientNone,typeLabel,typeRequired,categoryLabel,categoryDisabled,priorityLabel,attachmentsLabel,attachmentsDisabled,submit,submitUpdate,cancel}`, `statuses.{label,add,edit,delete,deleteConfirm}`, `errors.{notFound,loadFailed,saveFailed,moveFailed,invalidKanbanOrder}`). Verificar cadena literal del placeholder adjuntos: `"Los adjuntos llegan en una próxima entrega."`. <!-- sdd-owner: implementation -->
- [ ] Implementar `apps/web/src/lib/validation/task.ts` con `taskTitleRequired(value: string): string | null` y `taskDescriptionLength(value: string | null): string | null` (puros, sin DOM, sin imports de UI). <!-- sdd-owner: implementation -->
- [ ] Implementar `apps/web/src/lib/tasks/tasks-kanban.ts` con `sortByOrder(rows)`, `moveItem(rows, fromId, toIndex)` (helper cliente que prepara el drop antes de invocar `rpc.tasks.move`). <!-- sdd-owner: implementation -->
- [ ] Implementar `apps/web/src/lib/tasks/tasks-form.ts` con `mapTaskEntityToFormInput`, `mapFormInputToTaskEntity`, `resetCategoryIfIncompatible`. <!-- sdd-owner: implementation -->

### TRIANGULATE

- [ ] Agregar test que cuenta las 43 claves `tasks.*` en `es.json` y verifica que `i18n.test.ts` pasa después de la extensión. <!-- sdd-owner: implementation -->
- [ ] Agregar edge cases: `taskTitleRequired("   ")` (espacios) → falla; `taskDescriptionLength("x".repeat(50_000))` → `null`; `moveItem` con `fromId` inexistente → no muta. <!-- sdd-owner: implementation -->

### REFACTOR

- [ ] Extraer constantes de límite a `apps/web/src/lib/validation/_constants.ts` para reuso futuro entre módulos (`clients`, `finance`). <!-- sdd-owner: implementation -->
- [ ] Registrar la evidencia TDD de WU10 en `apply-progress.md`. <!-- sdd-owner: implementation -->

## Work Unit 11 — Molecules + organismos del módulo tasks

**Entregable:** 4 molecules (`task-state-badge`, `task-priority-badge`,
`task-type-icon`, `search-input`) y los organismos principales (`task-form/`,
`task-card`, `task-kanban-column`, `task-kanban-board`, `task-list-row`,
`task-grid-card`). Esta WU prepara el render de la página `/tasks`.

### RED

- [ ] Escribir tests fallidos en `apps/web/src/components/molecules/search-input/search-input.test.ts` (TS puro): el input dispara `onChange` con el valor debounced vía `useDebounceValue` (host-safe del wrapper `vendor/hooks`). <!-- sdd-owner: implementation -->
- [ ] Escribir tests fallidos en `apps/web/src/components/organisms/task-form/task-form.logic.test.ts` (lógica pura, sin DOM): dado un form state, al cambiar `clie_id` o `type_id`, el campo `cate_id` se resetea si la categoría previa no aplica; el campo "Adjuntos" siempre retorna `disabled = true` con tooltip `tasks.form.attachmentsDisabled`; el campo "Categoría" está `disabled` mientras `type_id` sea `null`. <!-- sdd-owner: implementation -->

### GREEN (molecules)

- [ ] Implementar `apps/web/src/components/molecules/search-input/search-input.tsrx` con `<input type="search">` + debounce vía `useDebounceValue` host-safe; emite `onChange(value)` con `i18n.t("tasks.search.placeholder")` como placeholder. <!-- sdd-owner: implementation -->
- [ ] Implementar `apps/web/src/components/molecules/task-state-badge/task-state-badge.tsrx` con color de fondo derivado de `task_state.tast_color` (placeholder: token neutral en MVP; Fase 2 con `@octanejs/colorful`). <!-- sdd-owner: implementation -->
- [ ] Implementar `apps/web/src/components/molecules/task-priority-badge/task-priority-badge.tsrx` (placeholder: 3 niveles en MVP). <!-- sdd-owner: implementation -->
- [ ] Implementar `apps/web/src/components/molecules/task-type-icon/task-type-icon.tsrx` (mini wrapper del `Icon` del wrapper `vendor/icons/`). <!-- sdd-owner: implementation -->

### GREEN (organisms)

- [ ] Implementar `apps/web/src/components/organisms/task-form/task-form.tsrx` con layout lateral derecho (drawer/sheet), campos: Título (con validación `taskTitleRequired`), Descripción (`RichTextEditor`), Cliente (`<select>` con `rpc.tasks.clients.search`), Tipo (`<select>` con `listTypesForForm`), Categoría (`<select>` con `listCategoriesByType`, deshabilitado hasta seleccionar Tipo), Prioridad (`<select>`), Adjuntos (campo visible y deshabilitado con `tasks.form.attachmentsDisabled` como texto de ayuda), botones Submit (`tasks.form.submit` o `submitUpdate`) y Cancelar (`tasks.form.cancel`). <!-- sdd-owner: implementation -->
- [ ] Implementar `apps/web/src/components/organisms/task-form/task-form.logic.ts` con `useState` puro para el form state; usar los helpers de `lib/tasks/tasks-form.ts`; invocar `rpc.tasks.create` / `rpc.tasks.update` en submit. <!-- sdd-owner: implementation -->
- [ ] Implementar `apps/web/src/components/organisms/task-card/task-card.tsrx` (card usada por grilla + kanban): ícono de tipo + título + descripción breve + categoría + cliente + estado + botones Editar (`tasks.card.edit`) y Eliminar (`tasks.card.delete`). <!-- sdd-owner: implementation -->
- [ ] Implementar `apps/web/src/components/organisms/task-kanban-column/task-kanban-column.tsrx` (columna con header de estado + lista vertical de cards + drop zone con `useDroppable`). <!-- sdd-owner: implementation -->
- [ ] Implementar `apps/web/src/components/organisms/task-kanban-board/task-kanban-board.tsrx` (envuelve `DndContext` del wrapper `vendor/dnd-kit/`; renderiza columnas por estado + cards; onDragEnd llama `rpc.tasks.move({ task_id, target_state_id, prev_task_id?, next_task_id? })`). <!-- sdd-owner: implementation -->
- [ ] Implementar `apps/web/src/components/organisms/task-list-row/task-list-row.tsrx` (ícono a la izquierda, header cliente/estado, centro título, footer descripción). <!-- sdd-owner: implementation -->
- [ ] Implementar `apps/web/src/components/organisms/task-grid-card/task-grid-card.tsrx` (variante de `task-card` para vista grilla). <!-- sdd-owner: implementation -->

### TRIANGULATE

- [ ] Agregar test que verifica que `task-form.logic` resetea `cate_id` cuando cambia `clie_id` y la categoría previa es incompatible (extraído a lógica pura testeable). <!-- sdd-owner: implementation -->
- [ ] Agregar test que verifica que el campo Adjuntos siempre retorna `disabled = true` con el mensaje `tasks.form.attachmentsDisabled` (PRD §13 UX honesto). <!-- sdd-owner: implementation -->
- [ ] Validar el grep gate §theme-quieter-minimalist sobre los archivos creados: `grep -RnE "bg-primary|text-primary|border-primary|outline-primary|ring-primary" apps/web/src/components/{organisms,molecules}/task*` debe devolver 0 hits. <!-- sdd-owner: implementation -->
- [ ] Validar el grep gate §vendor-bindings: ningún import directo de `@octanejs/dnd-kit` o `@octanejs/lexical` fuera de los wrappers. <!-- sdd-owner: implementation -->

### REFACTOR

- [ ] Si `task-card` y `task-grid-card` comparten >70% del markup, extraer un sub-componente compartido. <!-- sdd-owner: implementation -->
- [ ] Documentar en JSDoc de `task-kanban-board.tsrx` que el drop cross-column es `last-write-wins` (D9) y que el rebalanceo detecta drift en el siguiente `listTasks`. <!-- sdd-owner: implementation -->
- [ ] Registrar la evidencia TDD de WU11 en `apply-progress.md`. <!-- sdd-owner: implementation -->

## Work Unit 12 — Página `/tasks` + registro de ruta (replace placeholder)

**Entregable:** `apps/web/src/components/pages/tasks-page.tsrx` real (reemplaza
el placeholder actual); `apps/web/src/routes/tasks.tsrx` apunta a `TasksPage`;
`apps/web/octane.config.ts` registra la ruta con `shellRoute("/tasks", …)`;
la ruedita de configuración con tooltip `tasks.page.configTooltip` aparece
junto al botón "Nueva tarea".

### RED

- [ ] Verificar que el test `apps/web/src/lib/nav/tree.test.ts` sigue verde (la constante `SHELL_ROUTES` no se toca en este PR — `/tasks` ya estaba en `SHELL_ROUTES` desde el precedent). <!-- sdd-owner: implementation -->

### GREEN

- [ ] Implementar `apps/web/src/components/pages/tasks-page.tsrx` que monta `<BaseView id="tasks-list" filters={{search}} records={tasks} views={["list","grid","kanban"]} onFilterChange={setFilters} gridStructure={…} listStructure={…} kanbanStructure={…} />`; consume `rpc.tasks.list` vía el namespace del cliente multi-contract (W7); renderiza botón "Nueva tarea" (`tasks.page.newTask`) + botón gear (`tasks.page.configTooltip` como tooltip i18n) que navega a `/tasks-config`. <!-- sdd-owner: implementation -->
- [ ] Reemplazar `apps/web/src/routes/tasks.tsrx` (placeholder) con `import { TasksPage } from "../components/pages/tasks-page"` + default export. <!-- sdd-owner: implementation -->
- [ ] Verificar que `apps/web/octane.config.ts` ya registra `/tasks` con `shellRoute("/tasks", …)` desde el precedent del shell; no se modifica aquí. <!-- sdd-owner: implementation -->

### TRIANGULATE

- [ ] Verificar manualmente que el filtro `search` tipeado se persiste en `localStorage["base-view:tasks-list"]` y se reaplica tras reload (Scenario "Persistencia de filtros en localStorage namespaced" del spec `web`). <!-- sdd-owner: implementation -->
- [ ] Verificar que `TasksPage` consume `rpc.tasks.list` y NO `rpc.auth.*` para datos de tareas (Scenario del spec `web`). <!-- sdd-owner: implementation -->

### REFACTOR

- [ ] Si la page crece, extraer el handler del botón "Nueva tarea" + el handler del gear a hooks locales para mantener el JSX legible. <!-- sdd-owner: implementation -->
- [ ] Registrar la evidencia TDD de WU12 en `apply-progress.md`. <!-- sdd-owner: implementation -->

---

## PR-F — `/tasks-config` + `/tasks/:id` detail + verificación final

**Objetivo del PR:** entregar la página de detalle (`/tasks/:id` con botón
Editar y Eliminar), la página de configuración (`/tasks-config` con tab
Estados), registrar las dos rutas adicionales en `octane.config.ts`
(sin tocar `SHELL_ROUTES`), y completar la verificación final con los gates
de apply (PII grep, closed-list green grep, npm imports grep, bun test verde).

## Work Unit 13 — Página de detalle + ruta `/tasks/:id`

**Entregable:** `apps/web/src/components/pages/task-detail-page.tsrx` con botón
Editar (que abre el form lateral sobre la misma página) y Eliminar (con
confirmación usando `tasks.statuses.deleteConfirm` adaptado o `tasks.card.delete`); registro en
`octane.config.ts`.

### RED

- [ ] Escribir tests fallidos en `apps/web/src/components/pages/task-detail-page/task-detail-page.logic.test.ts` (lógica pura extraída): dado `taskId`, al click "Editar" se navega a la misma página con `?edit=true` (o alternativamente abre el form lateral sobre la misma página); al click "Eliminar" se abre un diálogo de confirmación; al confirmar, se invoca `rpc.tasks.remove` y se navega a `/tasks`. <!-- sdd-owner: implementation -->

### GREEN

- [ ] Implementar `apps/web/src/components/pages/task-detail-page.tsrx` con header (ícono de tipo + título + estado) + descripción renderizada desde el JSON lexical + meta (cliente, categoría, fechas) + botones Editar y Eliminar. Editar: monta el `TaskForm` con `mode="update"` y los datos de la task. Eliminar: confirmación vía `tasks.statuses.deleteConfirm` (reusado o `tasks.card.delete` con diálogo) → `rpc.tasks.remove` → navegación a `/tasks`. <!-- sdd-owner: implementation -->
- [ ] Crear `apps/web/src/routes/tasks/$id.tsrx` con default export apuntando a `TaskDetailPage`. <!-- sdd-owner: implementation -->
- [ ] Registrar `/tasks/:id` en `apps/web/octane.config.ts` con `shellRoute("/tasks/:id", …)` (helper existente; hereda `before: [requireSession]`). <!-- sdd-owner: implementation -->

### TRIANGULATE

- [ ] Verificar que la ruta `/tasks/:id` está en la tabla de rutas con el guard heredado del helper (Scenario del spec `web`). <!-- sdd-owner: implementation -->
- [ ] Verificar que `SHELL_ROUTES` permanece intacto (las 8 rutas canónicas del PRD §7 sin cambios). <!-- sdd-owner: implementation -->

### REFACTOR

- [ ] Si la lógica de "Editar / Eliminar" crece, extraer a un hook `useTaskDetailActions(taskId)` para mantener el JSX del page limpio. <!-- sdd-owner: implementation -->
- [ ] Registrar la evidencia TDD de WU13 en `apply-progress.md`. <!-- sdd-owner: implementation -->

## Work Unit 14 — Página de configuración `/tasks-config` + tab Estados + form `task-state-form`

**Entregable:** `apps/web/src/components/pages/tasks-config-page.tsrx` con
tab "Estados" (único tab MVP; tabs Tipos/Categorías quedan para Fase 2);
`apps/web/src/components/organisms/task-state-form/task-state-form.tsrx`
para crear/editar estados con `tast_name` (1..50) y `tast_order` (int no
negativo); registro de la ruta sin item de nav.

### RED

- [ ] Escribir tests fallidos en `apps/web/src/components/organisms/task-state-form/task-state-form.logic.test.ts` (lógica pura): al submit crea/actualiza vía `rpc.tasks.states.create/update` con `tast_name` (validación 1..50) y `tast_order` (validación int >= 0); al confirmar delete se invoca `rpc.tasks.states.remove`. <!-- sdd-owner: implementation -->

### GREEN

- [ ] Implementar `apps/web/src/components/organisms/task-state-form/task-state-form.tsrx` con campos `tast_name` (input text) y `tast_order` (input number); submit invoca `rpc.tasks.states.create` o `update` según el modo; cancelar invoca `onCancel`. <!-- sdd-owner: implementation -->
- [ ] Implementar `apps/web/src/components/pages/tasks-config-page.tsrx` con tab "Estados" (`tasks.statuses.label`) + lista de estados (`rpc.tasks.states.list`) + botones Nuevo/Editar/Eliminar por estado + diálogo de confirmación al eliminar (`tasks.statuses.deleteConfirm`). <!-- sdd-owner: implementation -->
- [ ] Crear `apps/web/src/routes/tasks-config.tsrx` con default export apuntando a `TasksConfigPage`. <!-- sdd-owner: implementation -->
- [ ] Registrar `/tasks-config` en `apps/web/octane.config.ts` con `shellRoute("/tasks-config", …)` (helper existente); SIN agregar item a `SHELL_ROUTES` ni al árbol `lib/nav/tree.ts` (decisión CONFIRMADA; preserva árbol §7). <!-- sdd-owner: implementation -->

### TRIANGULATE

- [ ] Verificar que `/tasks-config` está en la tabla de rutas con guard heredado pero NO en el sidebar (Scenario del spec `web-shell`). <!-- sdd-owner: implementation -->
- [ ] Verificar que `tree.test.ts` sigue verde porque `SHELL_ROUTES` no cambia. <!-- sdd-owner: implementation -->
- [ ] Verificar que el tab "Estados" es el único visible (no hay tabs Tipos/Categorías en MVP). <!-- sdd-owner: implementation -->
- [ ] Verificar que `task-state-form` NO incluye color picker (sin `atta_color` input). <!-- sdd-owner: implementation -->

### REFACTOR

- [ ] Extraer la confirmación de delete a un componente reusable (puede que se reuse también en `task-card` eliminar). <!-- sdd-owner: implementation -->
- [ ] Registrar la evidencia TDD de WU14 en `apply-progress.md`. <!-- sdd-owner: implementation -->

## Work Unit 15 — Verificación final, gates de apply y cierre

**Entregable:** `bun test` verde en workspace raíz sin postgres ni OTLP;
integración opt-in verificada con `TEST_DATABASE_URL`; gates de apply
verificados; `apply-progress.md` completo con la tabla final TDD Cycle
Evidence; criterios de aceptación del spec `tasks` verificados
manualmente; cierre del change.

### RED (definir el checklist de gates)

- [ ] Definir en `apply-progress.md` la sección "Final verification checklist" con todos los gates a ejecutar (PII grep, closed-list green grep, npm imports grep, bun test sin OTLP, bun test con TEST_DATABASE_URL, tree.test.ts, i18n.test.ts, smoke manual de criterios 1–19 del proposal §7). <!-- sdd-owner: implementation -->

### GREEN (ejecutar los gates)

- [ ] Ejecutar `bun test` desde la raíz del workspace sin `TEST_DATABASE_URL` ni `OTEL_EXPORTER_OTLP_ENDPOINT`; confirmar que todos los tests unitarios pasan y los `*.integration.test.ts` se saltan con `describe.skipIf`. <!-- sdd-owner: implementation -->
- [ ] Ejecutar `bun test` con `TEST_DATABASE_URL` y la base migrada (`bun run db:migrate`); confirmar que los integration tests de WU5 y WU6 corren, limpian sus datos con `cleanupTasksTables(db)` en `afterAll`, y pasan. <!-- sdd-owner: implementation -->
- [ ] Ejecutar grep gate §PII: `grep -RE 'attributes\.(title|description|email)' apps/api/src/` debe devolver 0 hits; `grep -RE 'attributes\.(clie_name|clie_email|task_title|task_description|atta_title)' apps/api/src/` debe devolver 0 hits. <!-- sdd-owner: implementation -->
- [ ] Ejecutar grep gate §theme-quieter-minimalist: `grep -RnE "bg-primary|text-primary|border-primary|outline-primary|ring-primary" apps/web/src/components/{organisms,molecules,pages}/task* apps/web/src/components/pages/{tasks-page,task-detail-page,tasks-config-page}.tsrx apps/web/src/components/base-view/` debe devolver 0 hits. <!-- sdd-owner: implementation -->
- [ ] Ejecutar grep gate §vendor-bindings: `grep -RE "from ['\"]@octanejs/(dnd-kit|lexical)['\"]" apps/web/src/` debe devolver hits solo bajo `components/vendor/dnd-kit/` y `components/vendor/lexical/`. <!-- sdd-owner: implementation -->
- [ ] Ejecutar `grep -RE "from ['\"]@octanejs/(phosphor-icons|resizable-panels|usehooks-ts|sonner|i18next)" apps/web/src/components/{organisms,molecules,pages}/task*` debe devolver 0 hits directos (todo via wrappers). <!-- sdd-owner: implementation -->
- [ ] Ejecutar `bun test apps/web/src/lib/nav/tree.test.ts`; confirmar verde (la invariante nav↔rutas se preserva porque `SHELL_ROUTES` no cambia). <!-- sdd-owner: implementation -->
- [ ] Ejecutar `bun test apps/web/src/lib/i18n/i18n.test.ts`; confirmar verde con las 43 claves `tasks.*` presentes. <!-- sdd-owner: implementation -->
- [ ] Ejecutar `bun install --frozen-lockfile` desde la raíz; confirmar `EXIT 0` sin warnings de peer deps para `@octanejs/dnd-kit` ni `@octanejs/lexical`. <!-- sdd-owner: implementation -->

### TRIANGULATE (criterios de aceptación manuales)

- [ ] Verificar manualmente los criterios de aceptación del proposal §7: (1) task creada en kanban aparece en Pendiente con orden consistente; (2) drag&drop intra-columna reordena y persiste; (3) drag&drop cross-column actualiza estado + orden atómicamente; (4) rebalanceo dispara con `|gap| < 1e-6`; (5) grilla muestra ícono+título+descripción+cat+cliente+estado; (6) botón Editar navega a `/tasks/:id`; (7) form deshabilita Categoría hasta seleccionar Tipo; (8) Adjuntos deshabilitado con tooltip `tasks.form.attachmentsDisabled`; (9) ruedita navega a `/tasks-config` (sin nav-item); (10) dropdown Cliente consume `rpc.tasks.clients.search`; (11) `RichTextEditor` persiste JSON; (12) `bun test` verde; (13) grep `dnd-kit`/`lexical` confined; (14) grep verde primario confined; (15) grep PII confined; (16) `bun pm view` documentado en WU0; (17) migración idempotente; (18) effect/xstate confinados a `src/infrastructure/` y `src/http/`; (19) `@crm/types` exporta `tasksContract` con tests verdes. <!-- sdd-owner: implementation -->

### REFACTOR (cierre documental)

- [ ] Completar `openspec/changes/tasks/apply-progress.md` con la tabla final **TDD Cycle Evidence** (un row por WU 0–15 con RED SHA → GREEN SHA → TRIANGULATE SHA → REFACTOR SHA + comando de verificación + resultado) y la sección de gates con los outputs de los greps y los `bun test`. <!-- sdd-owner: implementation -->
- [ ] Si algún gate falla durante la verificación final, registrar el hallazgo en `apply-progress.md` y NO marcar la WU como cerrada; aplicar la remediación correspondiente antes de cerrar. <!-- sdd-owner: implementation -->
- [ ] Confirmar que el branch `develop` tiene todos los commits del change con conventional commits (`feat(types):`, `feat(api):`, `feat(web):`, `chore(workspace):`, etc.) y que `bun.lock` está commiteado. <!-- sdd-owner: implementation -->

---

## Notas de cierre

- **Total de WUs:** 16 (WU0 spike bloqueante + WU1 contracts + 14 WUs de implementación agrupadas en PR-A → PR-F).
- **Total estimado:** ~3,000 líneas (confirmado > 400 → chaining explícito).
- **Decisiones pendientes en apply gate:** (a) confirmación de chaining `stacked-to-develop` vs alternativa (`feature-branch-chain`); (b) si PR-A supera 400 al cerrar WU2, subdividir en PR-A1 (migration + schema) y PR-A2 (ports + constants + errors); (c) si la verificación npm (WU0) falla, el change se pausa y se escala — NUNCA se sustituyen los bindings por decisión propia.
- **NO se modifica:** specs canónicas (`openspec/specs/*/spec.md`), `apps/*/*/package.json` (excepto `apps/web/package.json` post-WU0), `DESIGN.md`, las 8 rutas canónicas de `SHELL_ROUTES`.
- **Próxima fase (`apply`):** ejecutar las WUs en orden, registrar evidencia TDD por WU en `apply-progress.md`, confirmar chaining con el product owner al iniciar, respetar el gate WU0 antes de cualquier commit a `apps/web/package.json`.
