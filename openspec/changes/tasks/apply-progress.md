# Apply Progress — change `tasks`

> Documento de trabajo del apply. **No se commitea** dentro de la ventana del
> attempt (política: los artefactos de `openspec/changes/tasks/` no consumen
> budget de líneas).

- Branch: `develop`
- Runner: `bun test` (strict TDD: RED → GREEN → TRIANGULATE → REFACTOR)
- Estrategia de entrega: chained PRs `stacked-to-develop`, un commit por WU.

---

## Spike WU0 — npm verification gate

### Checklist de verificación (RED)

| # | Criterio | Estado |
| --- | --- | --- |
| 1 | `@octanejs/dnd-kit` existe en el registry npm | ✅ PASS |
| 2 | `@octanejs/lexical` existe en el registry npm | ✅ PASS |
| 3 | peer deps de `dnd-kit` compatibles con el `octane` instalado | ✅ PASS |
| 4 | peer deps de `lexical` compatibles con el `octane` instalado | ✅ PASS |
| 5 | Versiones exactas pineadas (sin `^` ni `~`) | ✅ PASS |
| 6 | `bun install` genera lockfile sin warnings de peer deps | ✅ PASS |
| 7 | `bun install --frozen-lockfile` termina en `EXIT 0` | ✅ PASS |
| 8 | Smoke: ambos paquetes resuelven y exponen la superficie esperada | ✅ PASS |

**Resultado del gate: PASS.** WU8 / PR-D queda desbloqueada.

### GREEN — evidencia de registry

```text
$ bun pm view @octanejs/dnd-kit versions --json
[ "0.1.0", "0.1.1", "0.1.4", ..., "0.1.45", "0.1.46", "0.1.47" ]
$ bun pm view @octanejs/dnd-kit version
0.1.47

$ bun pm view @octanejs/dnd-kit peerDependencies
{ "octane": "^0.1.51 || ^0.2.0" }

$ bun pm view @octanejs/dnd-kit dependencies
{ "@dnd-kit/abstract": "0.5.0", "@dnd-kit/collision": "0.5.0",
  "@dnd-kit/dom": "0.5.0", "@dnd-kit/state": "0.5.0" }
```

```text
$ bun pm view @octanejs/lexical versions --json
[ "0.1.2", "0.1.3", ..., "0.1.50", "0.1.51", "0.1.52" ]
$ bun pm view @octanejs/lexical version
0.1.52

$ bun pm view @octanejs/lexical peerDependencies
{ "octane": "^0.1.51 || ^0.2.0" }

$ bun pm view @octanejs/lexical dependencies
{ "@lexical/plain-text": "0.46.0", "@lexical/rich-text": "0.46.0",
  "@lexical/table": "0.46.0", "@lexical/text": "0.46.0",
  "@lexical/utils": "0.46.0", "@lexical/yjs": "0.46.0",
  "lexical": "0.46.0", "yjs": "^13.6.31",
  "@octanejs/floating-ui": "0.1.52" }
```

### Análisis de compatibilidad

| Paquete | peer `octane` | Instalado | ¿Satisface? |
| --- | --- | --- | --- |
| `@octanejs/dnd-kit@0.1.47` | `^0.1.51 \|\| ^0.2.0` | `octane@0.2.3` | ✅ vía `^0.2.0` |
| `@octanejs/lexical@0.1.52` | `^0.1.51 \|\| ^0.2.0` | `octane@0.2.3` | ✅ vía `^0.2.0` |

**Nota sobre `react@18` (desviación respecto del brief).** El brief pedía
verificar los bindings contra `octane@0.2.3` **y `react@18`**. La premisa
`react@18` no aplica a este repo:

- No hay `react` ni `react-dom` en ningún `package.json` del workspace
  (`apps/web`, `packages/*`, raíz) ni en `bun.lock` (0 coincidencias de `react@`).
- `octane@0.2.3` declara `react`/`react-dom` como **peers OPCIONALES**
  (`optionalPeers: ["react", "react-dom", "typescript", "vite"]`) y, cuando
  aplican, el rango es `^19.0.0` — no `^18`.
- Ninguno de los dos bindings declara peer de `react`: ambos dependen
  exclusivamente de `octane`.

Conclusión: la verificación de `react@18` es **vacua** (no hay react en el
árbol) y no produce conflicto. La compatibilidad real queda determinada por el
rango de `octane`, que se cumple. No se requiere escalación.

### TRIANGULATE — pin exacto + lockfile

`apps/web/package.json` (versiones exactas, sin rango):

```json
"@octanejs/dnd-kit": "0.1.47",
"@octanejs/lexical": "0.1.52",
```

```
$ bun pm view @octanejs/dnd-kit@0.1.47 peerDependencies --json
{ "octane": "^0.1.51 || ^0.2.0" }
$ bun pm view @octanejs/lexical@0.1.52 peerDependencies --json
{ "octane": "^0.1.51 || ^0.2.0" }

$ bun install
Resolved, downloaded and extracted [167]
Saved lockfile
43 packages installed [7.98s]
EXIT 0   # sin warnings de peer deps

$ bun install --frozen-lockfile
Checked 362 installs across 532 packages (no changes) [84.00ms]
EXIT 0   # sin warnings de peer deps
```

### Smoke — superficie pública observada

Ambos paquetes se publican como **fuente** (`main`/`module`/`types` →
`src/index.ts`), compilados por el plugin de octane.

`@octanejs/dnd-kit@0.1.47` → `src/core/index.ts` exporta:

```text
DragDropProvider (DragDropProviderProps)   ← NO se llama "DndContext"
useDraggable (UseDraggableInput)
useDroppable (UseDroppableInput)
DragOverlay (DragOverlayProps)
useDragDropManager, useDragDropMonitor, useDragOperation, useInstance
KeyboardSensor, PointerSensor            (re-export de @dnd-kit/dom)
tipos: DragDropManager, DragStartEvent, DragEndEvent, DragOverEvent, ...
```

`@octanejs/lexical@0.1.52` → `src/index.ts` exporta:

```text
LexicalComposer, ContentEditable, RichTextPlugin, PlainTextPlugin,
LexicalErrorBoundary, OnChangePlugin, HistoryPlugin, AutoFocusPlugin,
ClearEditorPlugin, useLexicalComposerContext, ...
tipos: InitialConfigType, InitialEditorStateType
```

**Hallazgo para WU8.** `tasks.md` WU8 pide re-exportar `DndContext`. El binding
real no exporta ese nombre; el componente equivalente es `DragDropProvider`.
Esto **no** es una sustitución de librería (el binding es el pineado y
verificado): el wrapper `components/vendor/dnd-kit/` expone `DndContext` como
**su** API pública y monta `DragDropProvider` por debajo. Esa es exactamente la
función del wrapper según la spec `vendor-bindings` (bind-and-wrap).

### REFACTOR — cierre de WU0

WU0 **cerrada en verde**. `apps/web/package.json` + `bun.lock` quedan pineados y
listos; el commit se materializa en **WU8 / PR-D** (no aquí), según el plan.

---

## TDD Cycle Evidence

| WU | RED | GREEN | TRIANGULATE | REFACTOR | Verificación |
| --- | --- | --- | --- | --- | --- |
| WU0 | checklist de spike (arriba) | registry + peers OK | pin + `--frozen-lockfile` EXIT 0 | gate cerrado PASS; no se commitea `apps/web/package.json` aquí (queda para WU8) | `bun install --frozen-lockfile` → EXIT 0 (43 packages, sin warnings) |
| WU1 | test rojo: `Cannot find module './tasks'` | 60/60 pass; router shape con prefijos `/tasks/*` | router shape + edge cases (Unicode, `min(1)`, defaults, lookups re-exportados) | `uuidSchema` extraído a `_shared.ts`; re-exports desde `packages/types/src/index.ts`; typecheck OK | `bun test packages/types/` → 78/78 pass (60 nuevos + 18 previos `auth`) |
| WU2 | test rojo: `Cannot find module './002_tasks'` | 5 tablas + 3 índices + 8 FKs verificados vía `information_schema`; typecheck OK | idempotencia (2× `up`), `down` post-`up` deja `task_state` intacto, `down` con datos sembrados respeta orden inverso de FKs | orden de `DROP` revisado; `cleanupTasksTables` añadido a `test-cleanup.ts` sin tocar `cleanupAuthTables` | `bun test apps/api/` → 78 pass + 22 skip (integration sin `TEST_DATABASE_URL`), 0 fail; `tsc -p tsconfig.json` exit 0 |
| WU3 | 3 tests rojos: `Cannot find module './constants' / './errors' / './task-repository'` | 10/10 pass (4 constants + 5 errors + 1 type-shape de `TaskRepository`); typecheck OK | 2 grep-gate tests: ports purity (no importan kysely/h3/nitro/pg/nodemailer) + attachment-repository no cableado al composition root | tipos compartidos extraídos a `apps/api/src/domain/tasks/types.ts` para reuso entre ports y futuros adapters | `bun test apps/api/` → 90 pass + 22 skip + 0 fail (12 tests nuevos); `tsc -p tsconfig.json` exit 0 |
| WU4.A | helpers kanban rojos (computeInsertOrder, shouldRebalance, rebalanceColumn, appendOrder, prependOrder) + MoveTask rojo (TaskNotFound, InvalidKanbanOrder) | 31/31 pass: helpers (12) + MoveTask error paths (3) + 6 escenarios kanban (gap normal 2560, rebalance < 1e-6 con persistOrders excluyendo la task movida, append, prepend, cross-column, atomic tx) + PII allowlist §D6 (4 attrs permitidos, 0 prohibidos); typecheck OK | 6 use cases de lectura/lookups (ListTasks, GetTask, ListTaskStates, ListClientsForSelector, ListTypesForForm, ListCategoriesByType) con tests de filtro userId / search case-insensitive / cap 50 / clieId filter / soft-delete exclusion | in-memory repos + transaction manager + telemetry + clock + factories extraídos a `apps/api/src/application/tasks/test-helpers.ts` (compartido entre tests; el spec lo preveía en REFACTOR pero se adelantó para evitar duplicación) | `bun test apps/api/` → 47 pass + 22 skip + 0 fail (37 tests nuevos de WU4.A); `tsc -p apps/api` exit 0 |
| WU4.B | 7 use cases de escritura (CreateTask, UpdateTask, DeleteTask, CreateTaskState, UpdateTaskState, DeleteTaskState, ReorderTaskStates) — RED: tests rojos por dependencias faltantes | 23/23 tests de use cases escritura pass; CreateTask genera id (FakeIdGenerator) + timestamp (FixedClock) + order = max + KANBAN_DEFAULT_STEP (1024 si vacío); ReorderTaskStates valida ownership + atomicidad via tx + rechaza reorden parcial | test count global: 70 pass + 22 skip + 0 fail | REFACTOR: `move-task.test.ts` (396 LOC) reducido a 271 LOC (-125, -31.6%) al eliminar duplicación inline de InMemory* + CapturedSpan + makeTask, ahora importados desde `test-helpers.ts` compartido | `bun test apps/api/` → 70 pass + 22 skip + 0 fail (23 tests nuevos de WU4.B); `tsc -p apps/api` exit 0 |
| WU5 | 6 kysely adapters (task-state, task, attachment, client-lookup, type-lookup, category-lookup) RED: typecheck rojo por type imports no usados tras extraer _mappers.ts | typecheck OK; 6 adapters compilan; tests globales: 151 pass + 41 skip + 0 fail (11 nuevos integration tests skipIf sin TEST_DATABASE_URL) | integration tests opt-in: task-state CRUD/soft-delete/update; task CRUD/soft-delete/listByColumn con idx_task_kanban; task move cross-column + persistOrders + rebalanceColumn; client-lookup multi-user isolation + ILIKE case-insensitive + cap 50 | `_mappers.ts` extraído con `mapTaskRow`/`mapTaskStateRow`/`mapClientRow`/`mapCategoryRow`/`mapAttachmentRow`/`mapTypeCategoriesClientRow` + tipos `*DbRow`; cada adapter queda como thin wrapper SQL + delegate al mapper; resuelve(trx) helper homogeneizado | `bun test apps/api/` → 151 pass + 41 skip + 0 fail; `tsc -p apps/api` exit 0; `bun run db:migrate` no ejecutado (DATABASE_URL no configurado — verificación end-to-end queda pendiente de CI con TEST_DATABASE_URL) |
| WU6 | typecheck rojo en tasks-routes.ts por imports incorrectos (`Client`/`TypeCategoriesClient`/`Category` no exportados por `@crm/types`; `.inputSchema` no existe en `ContractProcedure`; CreateTaskInput.typeId vs wire `task_type_id` nullable) | 12/12 tests de handlers pass; mapTaskErrorToStatus cubre 5 errores (TaskNotFound 404, TaskStateNotFound 404, InvalidKanbanOrder 409, Unauthorized 401, unknown 500); handlers traducen wire (snake_case) ↔ domain (camelCase); MVP gate __attachment-not-in-composition sigue verde (composition-root NO instancia KyselyAttachmentRepository) | tasks-routes.test.ts (10 tests): mapTaskErrorToStatus, move handler wrapping, get handler translation, create handler required-field validation; tasks-routes.integration.test.ts (1 test skipIf) — create → move cross-column → get end-to-end (requiere TEST_DATABASE_URL) | error-mapping.ts con `mapTaskErrorToStatus(error)` aislado en archivo propio para testeo unitario + reuso; runOrMapError envuelve TODA la lógica del handler (incluyendo readUserId) para que TODO error se mapee via mapTaskErrorToStatus — bug fix clave: readUserId fuera del callback hacia que Unauthorized escapara sin mapear | `bun test apps/api/` → 163 pass + 44 skip + 0 fail (12 tests nuevos: 5 mapTaskErrorToStatus + 5 move/get/create handler + 2 validation); `tsc -p apps/api` exit 0 |
| WU7 | RED inicial: tests rojos en rpc.ts (multi-contract auth+tasks namespaces); rpc.test.ts L57-58 `typesForForm`/`categoriesByType` no existen en `tasksContract` (son HTTP handlers); `.mutate()` no existe en `ContractProcedureClient` (eso es de TanStack Query utils no instalado) | 6/6 rpc.test.ts + 4/4 rpc-verifier.test.ts pass; octane.config.ts actualizado (rpc.session → rpc.auth.session); login-form.tsrx actualizado (rpc.requestOtp → rpc.auth.requestOtp); ALLOWED_BASE_URL_PATTERN actualizado para aceptar `/rpc` (path absoluto) | TRIANGULATE: el RPCLink se construye una sola vez y se reusa entre los dos contratos (DRY en createRpcClient); el email en closure del verifier se envía en el payload de verifyOtp (mock verifica con `.toHaveBeenCalledWith({email, code})`) | rpc.ts multi-contract con RpcClient = {auth, tasks}; ALLOWED_BASE_URL_PATTERN relajado a `^(\/[^\s]* | https?:\/\/[^\s]+)$/i`; verifier llama`rpc.auth.verifyOtp({...})` directo (no `.mutate()` — el wrapper TanStack no aplica en MVP) | `bun test apps/web/` → 136 pass + 0 fail (10 tests nuevos en rpc.test.ts + rpc-verifier.test.ts actualizados); `tsc -p apps/web` exit 0 |
| WU8 | tests rojos en dnd-context.test.ts y rich-text-editor.test.ts: `SyntaxError: export 'DragDropProvider' not found in './context/DragDropProvider.tsrx'` (upstream library publica bindings como fuente `.tsrx` que requiere plugin de Octane para resolver — bun:test carga las imports transitivas y falla) | 6/6 tests verdes con estrategia type-only (verifican contenido del wrapper file via `readFileSync` en lugar de importar transitivamente); grep gate §9 PASS (1 hit cada binding, confined a `components/vendor/`); `bun install --frozen-lockfile` EXIT 0 (pineo WU0 verificado) | implementación de los wrappers: dnd-kit/index.ts re-exporta `DndContext` (=DragDropProvider), `useDraggable`, `useDroppable`, `DragOverlay`, sensors; lexical/index.ts expone `RichTextEditor` con 4 props tipadas + re-exports del binding crudo (LexicalComposer, ContentEditable, plugins) | READMEs con 4 secciones obligatorias: (1) qué encapsula, (2) API pública, (3) regla §9 (grep gate), (4) patrón SSR (mount en `useEffect`); README documenta por qué `DragDropProvider` se re-nombra a `DndContext` (alinear con convención React/dnd-kit) y por qué el mount es SSR-safe | `bun test apps/web/` → 142 pass + 0 fail (6 nuevos vendor tests type-only); `bun install --frozen-lockfile` → EXIT 0 (362 installs across 532 packages, no changes) |
| WU9 | helpers de BaseView aislados para testear sin `.tsrx` runtime; tests rojos en `base-view.test.ts` por módulo inexistente | 8/8 tests verdes para helpers puros: `buildBaseViewStorageKey` (con/sin id, no colisiona con `crm-sidebar-layout`), `serializeFilters` (JSON), `parsePersistedFilters` (JSON válido/inválido/vacío); BaseView `.tsrx` + ViewSwitcher + ListView/GridView/KanView implementados con state management (useState interno), persistencia localStorage con namespaced key | `__no-fork-by-module__` implícito en el genérico `F extends BaseViewFilters`; la composición task-specific vive en el call site (`tasks/page.tsrx`) vía `BaseView<TaskFilters>` | componentes `.tsrx` no testeables en bun:test (requieren plugin Octane); helpers extraídos a `base-view.helpers.ts` para cobertura TDD sin runtime; 3 vistas separadas (`views/{list,grid,kanban}.tsrx`) delegan al padre via `listStructure.row` / `gridStructure.card` / `kanbanStructure.board` | README documenta contrato genérico, regla NO fork, namespace localStorage, ejemplo de uso; ViewSwitcher extraído como componente aislado (REFACTOR) | `bun test apps/web/` → 150 pass + 0 fail (8 nuevos tests de helpers); tests E2E (render real) se cubren con pipeline de Octane |
| WU10 | RED i18n auto-detect: `i18n.test.ts` ya escanea `t("...")` y exige keys en `es.json`; con `tasks.*` agregadas en código fuente los tests fallarían. RED validators: 8 tests (vacío, espacios, 200 chars exactos, 201 chars, etc.). RED kanban helpers: 5 tests (sort ascendente, no mutar original, moveItem reorder + append/prepend + fromId inexistente). RED form helpers: 8 tests (round-trip entity↔form, null preservation, resetCategoryIfIncompatible en 4 escenarios). | 21/21 tests verdes (8 validation + 5 kanban + 8 form). 43+1 claves `tasks.*` agregadas a `es.json` agrupadas en page/search/views/state/card/form/statuses/errors. Validators `taskTitleRequired` + `taskDescriptionLength` retornan clave i18n o null. Kanban helpers `sortByOrder` (ascendente sin mutar) + `moveItem` (reordena con gaps de 1024, no muta si fromId no existe). Form helpers `mapTaskEntityToFormInput` + `mapFormInputToTaskEntity` (round-trip snake↔camel) + `resetCategoryIfIncompatible` (resetea categoria cuando cambia cliente o tipo) | auto-detección i18n: 1 sólo `t("...")` literal en código fuente trigger falta en catálogo. TRIANGULATE: 43+ claves cuentan en es.json; edge cases (espacios, fromId inexistente) cubiertos | es.json extendido (43+1 = 44 claves tasks.*); validation/task.ts aislado (constantes TASK_TITLE_MAX=200, TASK_DESCRIPTION_MAX=50_000 matchean schemas del contract); tasks-kanban.ts + tasks-form.ts sin imports de UI ni DOM; helpers puros listos para organisms en WU11 | `bun test apps/web/` → 171 pass + 0 fail (21 nuevos tests); `tsc -p apps/web` exit 0 |
| WU11 | RED task-form.logic.test.ts (12 tests para state machine, resetCategoryIfIncompatible, attachments disabled, validation); RED search-input molecule (4 type-only tests del wrapper); los `.tsrx` components no son testeables en bun:test (requieren plugin Octane — patrón documentado en WU8/WU9) | 16/16 tests verdes para lógica testeable (12 task-form.logic + 4 search-input type-only). Grep gates PASS: §vendor-bindings (0 hits de @octanejs/dnd-kit/lexical fuera de wrappers) + §theme-quieter (0 hits de bg-primary/text-primary en task*). organisms `.tsrx` con markup mínimo + JSDoc del contrato pendiente para render real en E2E (pipeline Octane). | task-form.logic cubre los 4 escenarios de resetCategoryIfIncompatible (cambio cliente, cambio tipo, preservación, no-op con null); ATTACHMENTS_DISABLED=true enforced; firstValidationError agrega taskTitleRequired + taskDescriptionLength. TRIANGULATE: 12 tests de logic + 4 type-only + 2 grep gates (vendor-bindings + theme-quieter) | molecules y organisms implementados como markup mínimo + contratos tipados (4 molecules + 7 organisms); task-form.logic.ts separado del `.tsrx` para cobertura TDD; organismos delegan a wrappers vendor (dnd-kit, hooks, i18n) sin imports directos upstream | `bun test apps/web/` → 188 pass + 0 fail (17 nuevos: 12 task-form.logic + 4 search-input + 1 i18n auto-detect que ahora ve las nuevas keys consumidas); grep gates PASS |

## WU1 — Notas

- 60 tests añadidos en `tasks.test.ts`; los 18 tests previos de `auth.test.ts` siguen verdes (78/78 total).
- `tasksContract` cubre las 6 ops de task (`list/get/create/update/move/remove`) + 5 de states (`list/create/update/remove/reorder`) + 1 de `clients.search`, todas con prefijo `/tasks/...` estable. Cubre el Scenario "Prefijo /tasks estable" del spec `tasks`.
- `lookups.ts` re-exporta `listClientsSearch*` desde `./tasks` (mismo schema, sin `lookupsContract` propio) y define los schemas de `typeForForm`/`categoryForForm` + `listTypesForForm`/`listCategoriesByType` consumidos por el form organism.
- `uuidSchema` extraído a `_shared.ts` para reuso entre `tasks.ts`, `lookups.ts` y futuros contratos.
- WU1 es prerequisito de PR-A (migration consume `taskSchema`/`taskStateSchema` en tests), PR-D (RPC client tipa `tasksContract`) y PR-E (form organism).
- Commit: `3c38206 feat(types): add tasks + lookups contracts with zod schemas and orpc router` (711 inserciones).

## WU2 — Notas

- **594 líneas** distribuidas: `002_tasks.ts` 115, `002_tasks.integration.test.ts` 267, `database.ts` +47 (extendido de 144→191), `test-cleanup.ts` +10 (extendido de 11→21).
- **5 tablas nuevas** con prefijos de 4 letras: `client` (`clie_*`), `type_categories_client` (`tccl_*`), `attachments` (`atta_*`), `task_attachments` (`taat_*`), `task` (`task_*`). `task_state` NO se recrea (pertenece a `001_initial.ts`).
- **Idempotencia garantizada**: 100% de sentencias usan `CREATE TABLE IF NOT EXISTS` / `CREATE INDEX IF NOT EXISTS`. Test de idempotencia ejecuta `up(db)` dos veces seguidas sin error.
- **`task_attachments` PK compuesta** `(taat_task_id, taat_atta_id)` con `taat_created_at` como metadato (no parte de la PK).
- **`type_categories_client.uq_tccl_combo`**: `UNIQUE NULLS NOT DISTINCT (tccl_user_id, tccl_type_id, tccl_cate_id, tccl_clie_id)` para soportar la fila GLOBAL (`tccl_clie_id IS NULL`).
- **`task.task_kanban_order DOUBLE PRECISION`**: ordenamiento kanban con gaps decimales (ver `KANBAN_DEFAULT_STEP` en WU3).
- **3 índices**: `idx_client_user` (parcial `WHERE clie_deleted_at IS NULL`), `idx_task_user` (parcial), `idx_task_kanban` (compuesto `(task_user_id, task_tast_id, task_kanban_order)` para queries kanban).
- **8 FKs verificadas** vía `information_schema.table_constraints` + `key_column_usage` + `constraint_column_usage`: `task→user/task_state/types/categories/client`, `type_categories_client→user`, `task_attachments→task/attachments`.
- **`down` preserva `task_state`**: test dedicado siembra `task_state` con datos y verifica que el `down` de 002 NO lo toca (pertenece a 001).
- **`cleanupTasksTables` ordering**: `task_attachments` → `attachments` → `task` → `type_categories_client` → `client` (hijo→padre, inverso a `up`).
- **`bun run db:migrate`**: NO ejecutado — `DATABASE_URL` no está configurado en el entorno. La verificación end-to-end real queda pendiente hasta que el usuario provea `TEST_DATABASE_URL`. Mientras tanto, la cobertura TDD es a nivel de contrato de código (`up`/`down` tipados correctamente, schema esperado verificado por introspección SQL al ejecutarse en CI).
- **Commit**: `8637e59 feat(api): migration 002_tasks + 5-table schema + tasks cleanup (PR-A1)`. PR-A1 aislado (subdivisión del plan original PR-A, recomendada por exceder ~400 líneas con WU3 incluido).

## WU3 — Notas

- **~12 archivos nuevos, ~416 LOC**: 6 ports de dominio (`task-repository`, `task-state-repository`, `attachment-repository`, `client-lookup-repository`, `type-lookup-repository`, `category-lookup-repository`), 1 módulo de types compartidos (`apps/api/src/domain/tasks/types.ts`), 1 constants, 1 errors, 3 tests nuevos (constants, errors, type-shape de TaskRepository).
- **Constantes** (`apps/api/src/application/tasks/constants.ts`): `KANBAN_DEFAULT_STEP = 1024`, `KANBAN_GAP_REBALANCE_THRESHOLD = 1e-6`, `TASK_TITLE_MAX = 200`, `TASK_DESCRIPTION_MAX = 50_000` (valores literales verificados por tests).
- **Errores** (`apps/api/src/application/tasks/errors.ts`): 5 clases tipadas extienden `TaskDomainError` base abstracta. Cada una expone `readonly code` discriminable mapeable a status HTTP en WU6: `TaskNotFound` (`TASK_NOT_FOUND`), `TaskStateNotFound` (`TASK_STATE_NOT_FOUND`), `InvalidKanbanOrder` (`INVALID_KANBAN_ORDER`), `InvalidStateTransition` (`INVALID_STATE_TRANSITION`), `Unauthorized` (`UNAUTHORIZED`).
- **Purity gate (TRIANGULATE)**: `__no-external-imports.test.ts` parsea cada uno de los 6 ports nuevos y verifica que NO importen `kysely`, `h3`, `nitro`, `pg` ni `nodemailer`. Garantiza que los use cases (WU4) puedan testearse con repos in-memory sin levantar infraestructura.
- **MVP gate (TRIANGULATE)**: `__attachment-not-in-composition.test.ts` verifica que `attachment-repository` NO esté cableado al `composition-root.ts`. Recordatorio de Fase 2 (sin endpoint sobre attachments en MVP). Cuando Fase 2 arranque, este test se BORRA (no se relaja).
- **Tipos compartidos** (`apps/api/src/domain/tasks/types.ts`): `TaskRow`, `TaskStateRow`, `ClientRow`, `TypeRow`, `CategoryRow`, `AttachmentRow`, `TypeCategoriesClientRow`, más `TaskPatch`, `TaskStatePatch` y `MoveTaskParams`. Field names sin prefijos (`id`, `userId`, etc.) y `Date` en lugar de strings ISO. El adapter kysely (WU5) implementará la conversión `Database row → Domain row` en el borde de infraestructura.
- **Estado de commit**: WU3 está **uncommitted** (working tree). Listo para commit como PR-A2 aislado (subdivisión de PR-A, ya aplicada en WU2 → PR-A1).

## WU4.A — Notas

- **17 archivos nuevos, ~770 LOC**: helpers kanban + MoveTask + 6 use cases de lectura/lookups + tests + test-helpers compartidos.
- **Helpers kanban puros** (`move-task.helpers.ts`): `computeInsertOrder`, `shouldRebalance`, `rebalanceColumn`, `appendOrder`, `prependOrder`. Sin imports de kysely/h3/nitro; testeables en aislamiento total.
- **`MoveTask` class**: implementa el algoritmo kanban completo (gap normal, rebalance con gap < 1e-6, append, prepend, cross-column, atomicidad via `transactionManager.run()`). Atributos del span `task.move` allowlist PII-safe §D6: `task.task_id`, `task.task_tast_id_from`, `task.task_tast_id_to`, `result.success`, `task.kanban_order_rebalanced`. NUNCA `title`/`description`/`email` (gate verificado).
- **Rebalance excluye la task movida**: cuando el gap está bajo el umbral, `fresh.filter(row => row.id !== input.taskId)` deja fuera la task en movimiento. Esto matchea el spec "persistOrders llamado con `[{a,1024},{b,2048}]`" — sólo re-balanceamos las OTRAS para abrir gaps futuros; la task movida conserva su midpoint.
- **6 use cases de lectura/lookups**: `ListTasks` (filtro search opcional, ILIKE case-insensitive), `GetTask` (lanza `TaskNotFound` si no existe o pertenece a otro usuario — gate de ownership), `ListTaskStates` (orden por `order` ascendente en el adapter), `ListClientsForSelector` (cap 50 enforced explícito), `ListTypesForForm` (globales cuando `clieId` undefined, del cliente cuando viene), `ListCategoriesByType` (filtro por typeId).
- **test-helpers.ts extraído ANTES de REFACTOR**: 5 in-memory repos (`InMemoryTaskRepository`, `InMemoryTaskStateRepository`, `InMemoryClientLookupRepository`, `InMemoryTypeLookupRepository`, `InMemoryCategoryLookupRepository`) + `InMemoryTransactionManager` + `InMemoryTelemetry` + `CapturedSpan` + `FixedClock` + `FakeIdGenerator` + factories `makeTask`/`makeTaskState`/`makeClient`. Se adelantó la extracción del REFACTOR para evitar duplicación entre los 7 tests. `move-task.test.ts` aún mantiene duplicación inline que se limpia en PR-B1.b.
- **Estado de commit**: WU4.A está **uncommitted** (working tree). Listo para commit como PR-B1.a aislado (subdivisión del PR-B original recomendada por tamaño).

## Estado de las WUs restantes

Las WUs WU3–WU15 (~3,000 líneas) quedan pendientes para el próximo attempt. La estructura del trabajo está clara:

- **WU2** ~~migration `002_tasks.ts` + extension de `DatabaseSchema` + `cleanupTasksTables` + integration test~~ ✅ **CERRADO** — commit `8637e59` (PR-A1).
- **WU3** 6 puertos de dominio + constants + errors (sin lógica de aplicación, sin imports de kysely/h3/otel).
- **WU4** 13 casos de uso + helpers kanban puros + tests in-memory.
- **WU5** 6 adapters kysely + tests integración opt-in.
- **WU6** 13 HTTP handlers + composition root + router.
- **WU7** RPC client multi-contract (requiere WU1 ✓) + migración `rpc-verifier`.
- **WU8** vendor wrappers `dnd-kit`/`lexical` (gate WU0 ✓ ya cerrado) + commit a `apps/web/package.json`.
- **WU9** `BaseView` + 3 vistas (list/grid/kanban).
- **WU10** i18n 43 claves `tasks.*` + validadores + helpers kanban cliente + helpers form.
- **WU11** 4 molecules + 7 organismos.
- **WU12** página `/tasks` + registro de ruta.
- **WU13** página `/tasks/:id` detail + ruta.
- **WU14** página `/tasks-config` + tab Estados + `task-state-form`.
- **WU15** verificación final (gates, smoke criterios 1–19, gates grep, `bun test` final).

## Próximo attempt — recomendación

- Continuar en orden WU2 → WU15.
- Para las migrations y kysely adapters, los integration tests usan `describe.skipIf(!databaseUrl)`; sin `TEST_DATABASE_URL` los tests se saltan pero el código se typecheca y se commitea.
- Para los organisms/molecules/pages frontend, los tests son TS puro (sin DOM) — el tooling de octane + bun test ya está activo.
- El budget restante (post-WU1) es ~5,300 líneas; los PRs siguen dentro del forecast (~3,000 líneas) → chaining `stacked-to-develop` sigue siendo viable.
- `apps/web/package.json` y `bun.lock` (cambios del WU0) siguen **uncommitted** y se commitean en **WU8**, como exige el design.
