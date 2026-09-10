# Proposal — tasks

> Fuente de verdad: PRD §8.3 (Tareas MVP Fase 1), §11 (schema `task` / `task_state`
> / `client` / `type_categories_client` / `attachments` / `task_attachments`),
> §13 (riesgos/pendientes, adjuntos Fase 2), §9 (BaseView + wrappers vendor).
> Baseline canónico a preservar: `openspec/specs/api/spec.md`,
> `openspec/specs/web/spec.md`, `openspec/specs/web-shell/spec.md`,
> `openspec/specs/design-system/spec.md` y `openspec/specs/vendor-bindings/spec.md`
> (este último ya registra `@octanejs/dnd-kit` y `@octanejs/lexical` como
> diferidos con consumidor en este change).
>
> Decisiones de producto CONFIRMADAS por el product owner (preproposal,
> 2026-09-10): research lane unselected · `client` scope = lookup mínimo
> (search-by-name, sin CRUD) · algoritmo `task_kanban_order` = half-step con
> rebalanceo en `|gap| < 1e-6` · ruta `/tasks-config` existe SIN item de nav en
> `SHELL_ROUTES` (acceso por ruedita desde `/tasks`) · edición navega a
> `/tasks/:id` con botón Editar en el detalle (sin inline edit) · bindings
> `@octanejs/dnd-kit` y `@octanejs/lexical` se instalan conforme spec
> `workspace` (verificación npm + peer deps bloqueante; escalar si falla) ·
> adjuntos Fase 2 (PRD §13): tablas creadas, campo "Adjuntos" del form
> deshabilitado con i18n key `tasks.form.attachmentsDisabled`, sin endpoint de
> upload · lista cerrada de verde (theme-quieter-minimalist) SIN nuevos usos;
> los colores de columna del kanban provienen de `task_state.tast_color`,
> nunca del verde primario.

## 1. Intent

Implementar el módulo Tasks del PRD §8.3 MVP Fase 1 sobre el scaffolding
consolidado (backend-auth + frontend-foundation + theme-quieter-minimalist +
stack-alignment). Es la primera pieza de negocio end-to-end del CRM-HOME: un
dominio nuevo (`task` + `task_state` + adjuntos como tablas + `client` mínimo
para lookup + `type_categories_client` join table), una segunda migración
versionada, un segundo contrato orpc, dos wrappers vendor nuevos
(`@octanejs/dnd-kit` y `@octanejs/lexical`, ambos ya registrados como
diferidos con consumidor en este change por `vendor-bindings`), y la
materialización del componente `BaseView` prometido por el PRD §9 con sus
tres vistas (list, grid, kanban).

El backend replica 1:1 el patrón canónico de `backend-auth`: contratos en
`@crm/types` (`oc.prefix("/tasks").router({...})`), puertos en
`src/domain/ports/`, casos de uso puros en `src/application/tasks/`,
adapters kysely en `src/infrastructure/kysely/`, migración `002_tasks.ts`,
wiring en `composition-root.ts` y handlers en `http/tasks/tasks-routes.ts`.
El frontend replica 1:1 el patrón de `frontend-foundation`: atomic design
(organisms + molecules + pages), wrappers vendor confinados, i18n del
catálogo `es.json` con escaneo por glob, y cliente RPC multi-contract.

Los adjuntos llegan a Fase 2 por PRD §13: las tablas (`attachments`,
`task_attachments`) se materializan en la migración para evitar migrar
después, pero el form los muestra deshabilitados con i18n key
`tasks.form.attachmentsDisabled` y NO existe endpoint de upload en MVP.

## 2. Scope

### In scope

**`packages/types` (`@crm/types`)**

- Contrato orpc + zod `tasksContract` con prefijo `/tasks`, siguiendo el
  patrón de `authContract` y `healthContract`:
  `list`, `get`, `create`, `update`, `move` (drag/drop cross-column +
  persistencia de orden), `remove`, `listStates`, `createState`,
  `updateState`, `removeState`, `reorderStates`.
- Contrato auxiliar `lookupsContract` con prefijo `/lookups` (o como
  namespace dentro de `/tasks`) para los endpoints mínimos del form:
  `clients.search` (search-by-name), `types.listForTaskForm` (tipos
  globales + del cliente seleccionado), `categories.listByType`.
- Schemas zod reflejando PRD §11 (`task_title: z.string().min(1).max(200)`,
  `task_description: z.string().nullable`, `task_kanban_order:
  z.number().finite()`).
- Tests `*.test.ts` con `safeParse` por schema (gate del precedent
  `backend-auth`).

**`apps/api` — dominio y aplicación (TS puro)**

- Puertos en `src/domain/ports/`: `TaskStateRepository`,
  `TaskRepository` (con `moveTask`, `listByColumn`, `rebalanceColumn`),
  `AttachmentRepository` (stub Fase 2, implementación kysely mínima que
  satisface la interfaz; ningún endpoint lo consume en MVP),
  `ClientLookupRepository` (search-by-name), `TypeLookupRepository`,
  `CategoryLookupRepository`. Reutiliza `IdGenerator` (UUIDv7) y `Clock`
  ya cableados en el composition root.
- Casos de uso en `src/application/tasks/`: `ListTasks`, `GetTask`,
  `CreateTask`, `UpdateTask`, `MoveTask` (drag/drop cross-column +
  rebalanceo de gap), `DeleteTask`, `ListTaskStates`, `CreateTaskState`,
  `UpdateTaskState`, `DeleteTaskState`, `ReorderTaskStates`,
  `ListClientsForSelector`, `ListTypesForForm`, `ListCategoriesByType`.
- Reglas de dominio en `tasks/constants.ts`:
  `KANBAN_GAP_REBALANCE_THRESHOLD = 1e-6`,
  `TASK_TITLE_MAX = 200`, `TASK_DESCRIPTION_MAX = 50_000`,
  `KANBAN_DEFAULT_STEP = 1024` (gap inicial entre nuevas tasks), y
  helpers puros `computeInsertOrder(prev, next)` (half-step) +
  `shouldRebalance(gap)` (umbral 1e-6) + `rebalanceColumn(rows)` (densifica
  cuando `|gap|` cae bajo umbral, asignando múltiplos de
  `KANBAN_DEFAULT_STEP`).
- Reglas de dominio en `tasks/errors.ts`: `TaskNotFound`,
  `TaskStateNotFound`, `InvalidKanbanOrder`, `InvalidStateTransition`,
  `Unauthorized` (mapeados a códigos orpc + status HTTP en el handler).
- Tests unit-first `*.test.ts` por cada caso de uso, con `FixedClock`,
  repos in-memory y `FakeIdGenerator` (patrón del precedent
  `backend-auth`).

**`apps/api` — infraestructura y http**

- Migración `002_tasks.ts` en `src/infrastructure/kysely/migrations/` con
  `up(db)` / `down(db)` en SQL raw vía `sql\`...\`.execute(db)`. Crea en
  orden de dependencias:`client`,`type_categories_client`,`attachments`,
  `task_attachments`,`task`.`task_state` ya existe desde `001_initial.ts`
  (decisión de `backend-auth`); se reutiliza. Todas las sentencias usan
  `CREATE TABLE IF NOT EXISTS` / `CREATE INDEX IF NOT EXISTS` (defensa en
  profundidad además del tracking nativo de kysely migrator). `down`
  documentado como destructivo.
- Adapters kysely espejados de los adapters auth:
  `task-state-repository.ts`, `task-repository.ts` (con `moveTask` y
  `rebalanceColumn` que aceptan `trx?: Transaction`), `attachment-repository.ts`
  (Fase 2 stub), `client-lookup-repository.ts`,
  `type-lookup-repository.ts`, `category-lookup-repository.ts`. Cada
  adapter implementa `mapRow` + `resolve(trx)` + mappers de filas a
  entidades de dominio.
- `DatabaseSchema` extendido con las nuevas tablas (los nombres de columnas
  siguen los prefijos de 4 letras del precedent: `task_`, `clie_`,
  `tccl_`, `atta_`, `taat_`).
- Extender `test-cleanup.ts` con `cleanupTasksTables(db)` (sin romper el
  contrato de `cleanupAuthTables`): borra `task_attachments`, `attachments`,
  `task`, `type_categories_client`, `client` en orden inverso de FKs.
- Tests de integración opt-in `*.integration.test.ts` con
  `describe.skipIf(!databaseUrl)` (patrón precedent). Suite cubre:
  `moveTask` cross-column persiste estado y orden; `rebalanceColumn`
  densifica cuando `|gap| < 1e-6`; lookup endpoints devuelven resultados
  esperados con FKs del cliente correcto.
- HTTP handlers en `src/http/tasks/tasks-routes.ts` (espejado de
  `auth-routes.ts`) con `createXHandler(deps)` + `readValidatedBody(event,
  schema.parse)` + `Response.json(result)` + mapeo de errores a status HTTP
  (`TaskNotFound` → 404, `Unauthorized` → 401, validación → 400).
- Composition root: extender `createCompositionRoot({ env })` para cablear
  los nuevos repos + casos de uso + registrar los handlers en
  `createRpcHandler({ ..., tasks: { list, get, create, update, move,
  remove, listStates, createState, updateState, removeState,
  reorderStates, clients: { search }, types: { list }, categories: {
  listByType } } })`.
- Telemetría: spans `task.create`, `task.update`, `task.move`,
  `task.delete`, `task_state.create`, `task_state.reorder` con atributos
  sin PII (`task_id`, `task_tast_id_from`, `task_tast_id_to`,
  `task.kanban_order_rebalanced`). NUNCA `attributes.title`,
  `attributes.description`, `attributes.email`. Regla PRD §10.

**`apps/web` — frontend**

- **BaseView materializado** (`components/base-view/`) según PRD §9:
  `<BaseView id="tasks-list" filters={{ search }} records={tasks}
  views={["list","grid","kanban"]} gridStructure={...}
  listStructure={...} kanbanStructure={...} />`. Filtros se persisten en
  `localStorage["tasks-list"]` (generalización del patrón
  `crm-sidebar-layout`). El componente es compartido por futuros módulos
  (clients, finance); NO se añaden overrides por módulo.
- **Wrappers vendor nuevos** en `components/vendor/dnd-kit/` y
  `components/vendor/lexical/` (alias `rich-text-editor/`) siguiendo el
  patrón §9: encapsulan `@octanejs/dnd-kit` y `@octanejs/lexical`,
  únicos puntos de import de esas librerías. READMEs propios siguiendo el
  patrón de `vendor/i18n/README.md` y `vendor/icons/README.md`.
- **Cliente RPC multi-contract** en `lib/api/rpc.ts`: generaliza el
  cliente actual para recibir un objeto de contratos
  (`{ auth, tasks, lookups }`) y exponer namespaces tipados. Hoy
  `RpcClient = ContractRouterClient<typeof authContract>`; el cambio
  preserva `rpc.verifyOtp` y suma `rpc.tasks.list`, `rpc.tasks.move`,
  `rpc.tasks.create`, etc.
- **Rutas**:
  - `routes/tasks.tsrx` reemplaza el placeholder `<PlaceholderPage />`
    con `TasksRoute` real (lista/grilla/kanban + botón "Nueva tarea" +
    ruedita de configuración → `/tasks-config`).
  - `routes/tasks-config.tsrx` nueva ruta del shell SIN item de nav en
    `SHELL_ROUTES` (decisión confirmada; preserva el árbol §7 intacto).
  - `routes/tasks/$id.tsrx` detalle de tarea con botón Editar (que abre
    el form lateral derecho sobre la misma página) y Eliminar (con
    confirmación).
  - Registro de `/tasks-config` y `/tasks/:id` en `octane.config.ts`
    con `shellRoute(path, entry)` helper (sin tocar las ocho rutas
    canónicas del árbol §7; el `before: [requireSession]` ya cubre todo
    el shell).
- **Páginas** (`components/pages/`): `tasks-page.tsrx`,
  `task-detail-page.tsrx`, `tasks-config-page.tsrx`. La config page
  tiene tabs Estados por ahora (tab Tipos/Categorías queda para Fase 2).
- **Organisms** (`components/organisms/`): `task-form/`,
  `task-card.tsrx`, `task-kanban-column.tsrx`, `task-kanban-board.tsrx`
  (`DndContext` + columnas + drop handlers que llaman
  `rpc.tasks.move`), `task-list-row.tsrx`, `task-grid-card.tsrx`,
  `task-state-form/`.
- **Molecules** (`components/molecules/`): `task-state-badge.tsrx`,
  `task-priority-badge.tsrx`, `task-type-icon.tsrx` (mini wrapper del
  `Icon`), `search-input.tsrx` (input + debounce vía
  `useDebounceValue` del binding `@octanejs/usehooks-ts`).
- **Validación** en `src/lib/validation/task.ts`: título no vacío (min 1,
  max 200), descripción opcional (max 50_000), orden kanban finito.
- **Catálogo i18n** extendido en `lib/i18n/locales/es.json` con
  `tasks.*` agrupado: `page.*`, `search.*`, `views.*`, `state.*`,
  `card.*`, `form.*` (incluye `attachmentsDisabled: "Los adjuntos llegan
  en una próxima entrega."`), `statuses.*`, `errors.*`. El test de
  escaneo por glob detecta claves faltantes (gate del precedent
  `web`).
- **Telemetría PII gate**: ningún `console.log` ni `attributes.*` lleva
  título/descripción/email; lint ad-hoc en apply (grep
  `attributes.*title\|attributes.*description`).

### Out of scope / non-goals

- **CRUD completo de `client`**: queda para su change dedicado; este
  change solo entrega el endpoint `tasks.clients.search`
  (search-by-name, id + name + email). El form de tarea consume ese
  endpoint en el dropdown; nada más de clientes entra en MVP.
- **Adjuntos**: el campo "Adjuntos" del form está deshabilitado con
  i18n key `tasks.form.attachmentsDisabled`; NO hay endpoint de upload,
  NO hay UI de listado de adjuntos en el detalle, NO hay endpoint de
  descarga. Las tablas (`attachments`, `task_attachments`) se crean en
  la migración `002_tasks.ts` para evitar migración posterior.
- **Categorías globales** gestionadas en `/tasks-config`: el tab Tipos
  y Categorías queda para Fase 2; MVP solo expone el tab Estados.
- **Cambio de tema de colores de estado**: el seed inicial
  (`backend-auth`) ya crea los estados Pendiente / En curso / Hecho;
  no se introduce un selector visual de color en MVP.
- **Plantilla de email transaccional para tasks**: PRD §13 lo difiere;
  no se crea plantilla nueva en `@crm/email`.
- **Reorden de columnas del kanban entre usuarios / workspace**: la
  columna es por usuario (`task_state.tast_user_id`); no se comparte
  entre miembros.
- **Inline edit del título en la card kanban**: PRD §8.3 menciona
  "botón editar" pero la decisión CONFIRMADA es navegación a
  `/tasks/:id` con botón Editar en el detalle.
- **Tests golden/snapshot de BaseView** con DOM: se difieren al primer
  change que monte DOM tests (probablemente data layer); este change
  mantiene unit-first TS puro + integración opt-in.
- **Reemplazo de `@octanejs/lexical` o `@octanejs/dnd-kit` por
  librerías alternativas si la verificación npm falla**: prohibido por
  spec `workspace`; se escala al product owner.

## 3. Affected areas

| Área | Naturaleza del impacto |
| --- | --- |
| `packages/types/src/contracts/` | Nuevos contratos `tasks.ts` y `lookups.ts` (extensión del precedent `auth.ts`) |
| `apps/api/src/domain/ports/` | ~6 puertos nuevos (`TaskStateRepository`, `TaskRepository`, `AttachmentRepository` stub, `ClientLookupRepository`, `TypeLookupRepository`, `CategoryLookupRepository`) |
| `apps/api/src/application/tasks/` | ~13 casos de uso + constants + errors + tests |
| `apps/api/src/infrastructure/kysely/` | Migración 002, ~6 adapters kysely + tests unit + integración + extensión de `test-cleanup.ts` |
| `apps/api/src/http/` | `tasks/tasks-routes.ts` + handlers + extensión del composition root |
| `apps/web/src/components/base-view/` | Materialización del componente compartido (era placeholder README) |
| `apps/web/src/components/vendor/dnd-kit/` | Wrapper nuevo sobre `@octanejs/dnd-kit` |
| `apps/web/src/components/vendor/lexical/` | Wrapper nuevo sobre `@octanejs/lexical` (alias `rich-text-editor/`) |
| `apps/web/src/components/{atoms,molecules,organisms,pages}/` | Componentes nuevos del módulo tasks |
| `apps/web/src/lib/api/rpc.ts` | Generalización a cliente multi-contract |
| `apps/web/src/lib/i18n/locales/es.json` | Sección `tasks.*` (~40 claves) |
| `apps/web/octane.config.ts` | Rutas `/tasks/:id` y `/tasks-config` (sin modificar `SHELL_ROUTES`) |
| `apps/web/src/lib/validation/` | Validadores de tarea |
| Specs canónicas | Se respetan sin relajar reglas; no se modifican (constraint del task) |

## 4. Design flags — resoluciones propuestas (D1-D10)

Estos flags vienen del pre-proposal handoff; las resoluciones son propuestas
del proposal y quedan sujetas a sdd-design.

- **D1 — RPC client expansion**: cliente multi-contract en
  `lib/api/rpc.ts` que recibe `{ auth, tasks, lookups }` y expone
  namespaces tipados (`rpc.auth.verifyOtp`, `rpc.tasks.move`,
  `rpc.lookups.clients.search`). Preserva el contrato actual
  (`rpc.verifyOtp` sigue funcionando vía adapter o namespace).

- **D2 — BaseView contract** (PRD §9): props públicas
  `{ id, records, filters?, views?, gridStructure, listStructure,
  kanbanStructure, onFilterChange? }`. `views?: Array<"list" | "grid" |
  "kanban">` filtra qué vistas mostrar (default: las tres). El
  switch de vista es estado interno controlado por `BaseView`. Filtros
  se persisten en `localStorage[\`base-view:\${id}\`]` (nueva clave
  namespaced; generaliza el patrón `crm-sidebar-layout`).

- **D3 — half-step kanban con rebalanceo**: `computeInsertOrder(prev,
  next) = (prev + next) / 2` para mover entre dos existentes;
  `KANBAN_GAP_REBALANCE_THRESHOLD = 1e-6` activa
  `rebalanceColumn(rows)` que densifica asignando múltiplos de
  `KANBAN_DEFAULT_STEP = 1024`. `CreateTask` al final recibe
  `max + 1024`. Tests unitarios cubren: gap normal (sin rebalanceo),
  gap bajo umbral (rebalanceo), insert al inicio, insert al final,
  mover entre columnas adyacentes, mover entre columnas distantes.

- **D4 — migración idempotente**: `002_tasks.ts` usa `CREATE TABLE IF
  NOT EXISTS` y `CREATE INDEX IF NOT EXISTS` para todas las
  sentencias; el kysely migrator nativo trackea versiones pero la
  defensa en profundidad evita fallos si `db:migrate` corre dos veces.
  `down` documenta orden de drops inverso al de creación.

- **D5 — lexical serialization JSON**: `task_description` persiste el
  JSON serializado de lexical (no HTML). Esto evita XSS en el render
  futuro, soporta re-edición exacta del documento, y mantiene un
  payload estable. El schema zod es `z.string().nullable()`; el wrapper
  `RichTextEditor` expone `onChange(jsonString)` y
  `defaultValue={JSON.parse(jsonString)}`.

- **D6 — PII telemetry gate**: atributos permitidos: `task_id`,
  `task_tast_id`, `task_tast_id_from`, `task_tast_id_to`,
  `task.kanban_order_rebalanced`, `task_state_id`, `user_id`,
  `result.success`, `result.error_code`. Prohibidos:
  `task.title`, `task.description`, `client.name`, `client.email`,
  cualquier campo de adjuntos. Gate verificable por grep en apply
  (`grep -r "attributes.*title\|attributes.*description" apps/api/src`).

- **D7 — i18n auto-detection**: el test existente
  `i18n.test.ts` (escaneo por glob `src/**/*.{tsrx,ts}`) ya detecta
  claves `t("...")` ausentes del catálogo `es.json`. Extender el
  catálogo con la sección `tasks.*` ANTES de mergear el primer PR;
  el test falla automáticamente si una clave usada no existe.

- **D8 — kanban SSR-stable**: el kanban es interactivo puro (drag/drop
  es client-side). El SSR renderiza el estado inicial de las columnas
  sin el `DndContext` activo (acorde al precedent del sidebar
  resizable: `defaultLayout` SSR estable). El binding `dnd-kit` se
  monta client-side después de hidratación. No debe haber mismatch de
  hidratación en el orden de las columnas ni en el contenido de las
  cards.

- **D9 — drag/drop concurrency**: last-write-wins para MVP. `moveTask`
  lee el orden actual y lo sobrescribe; si dos browsers mueven en la
  misma columna simultáneamente, el último PATCH gana. Limitación
  documentada en el README de `move-task.ts`. La heurística de
  rebalanceo (`|gap| < 1e-6`) detecta naturalmente drift acumulado.
  Fase 2 puede añadir optimistic locking con `updated_at` o `If-Match`.

- **D10 — client lookup endpoint shape**:
  `POST /rpc/tasks/clients/search { query: string, limit?: number =
  20 } → { clients: Array<{ clie_id, clie_name, clie_email }> }`.
  Búsqueda por substring case-insensitive sobre `clie_name` (y
  opcionalmente `clie_email`), filtrada por `clie_user_id` (sesión
  activa). Limita a 50 resultados máximo. NO incluye CRUD; ese cambio
  queda para `clients` dedicado.

## 5. Risks

- **Size (🔴)**: forecast del change es **~1500-2500 líneas** (backend
  ~700 + frontend ~1200). Supera con creces el review budget canónico
  de 400. La estrategia de delivery queda explícitamente diferida al
  apply gate vía `ask-on-risk` (no se asume chaining ni `size:exception`
  ahora). Forecast de chaining:
  - **PR-A (backend foundation)**: migración 002 + puertos +
    constantes + errores + tests de constantes/errores.
  - **PR-B (backend use cases + adapters)**: casos de uso puros +
    adapters kysely + tests unit + tests integración opt-in.
  - **PR-C (backend HTTP + composition)**: handlers orpc + extensión
    del composition root + cliente RPC web multi-contract.
  - **PR-D (frontend wrappers + BaseView)**: wrappers
    `dnd-kit`/`lexical` + componente `BaseView` materializado.
  - **PR-E (frontend /tasks UI)**: rutas, páginas, organismos, form,
    i18n, tests.
  - **PR-F (frontend /tasks-config + /tasks/:id)**: ruta config +
    tabs Estados + página de detalle + edición.

- **Bindings npm verification gate (🔴)**: `@octanejs/dnd-kit` y
  `@octanejs/lexical` NO están instalados ni verificados. Si no
  existen en npm o sus peer deps chocan con `octane@0.2.3` /
  `react@18`, se escala al product owner (prohibido sustituir stack
  por decisión propia). Verificación temprana al inicio de apply;
  si falla, el change se pausa.

- **`task_kanban_order` collisions (🟡)**: bajo drag/drop frecuente,
  los gaps pueden encogerse hasta el umbral 1e-6 y disparar
  rebalanceo. Documentado en `move-task.ts`. Tests unitarios cubren
  el caso de rebalanceo; tests de integración verifican que el orden
  persiste tras un rebalanceo.

- **Drag/drop concurrency (🟡)**: dos browsers simultáneos en la
  misma columna pueden generar órdenes en colisión. Last-write-wins
  MVP (§4 D9); limitación documentada en el README del caso de uso.
  Si la sección "orden" se vuelve contenciosa, Fase 2 añade
  optimistic locking.

- **`client` lookup mínimo (🟡)**: el FK `task_clie_id` se crea pero
  `client` no tiene CRUD en este change; depende del change `clients`
  siguiente para gestión completa. Por ahora solo `clie_name` se
  popula en el seed (decisión de apply: el seed auth puede crear
  opcionalmente un cliente de ejemplo para que el dropdown no esté
  vacío en dev).

- **`/tasks-config` sin nav (🟡)**: la decisión CONFIRMADA es ruta
  sin item de nav, accedida solo por la ruedita desde `/tasks`.
  Riesgo: usuario sin descubrir la ruedita no encuentra la
  configuración. Mitigación: tooltip en la ruedita con i18n key
  `tasks.page.configTooltip` ("Configurar estados").

- **Adjuntos Fase 2 — UX honesto (🟡)**: el campo "Adjuntos" del form
  está deshabilitado con texto claro (`tasks.form.attachmentsDisabled`)
  en vez de oculto. Esto evita que el usuario crea que es un bug.
  El detalle de tarea NO menciona adjuntos hasta Fase 2.

- **Catálogo i18n inflado (🟡)**: ~40 claves nuevas en `es.json`. El
  test de escaneo por glob detecta claves faltantes automáticamente;
  la sección `tasks.*` se agrega completa en el PR frontend (no se
  permite PR parcial con claves faltantes).

- **Telemetría PII inadvertida (🟡)**: gate de grep en apply
  (`attributes.*title\|attributes.*description\|attributes.*email`).
  Revisión manual de los spans en review.

- **BaseView contract surface (🟡)**: si futuras firmas especiales por
  módulo rompen la generalización, se acabó la promesa del precedent.
  Design debe velar por una firma común; si algo no encaja, se
  GENERALIZA (no se hace fork por módulo). Esta es una decisión de
  design deliberada.

- **SSR de `dnd-kit` (🟡)**: drag/drop es client-side; el SSR renderiza
  columnas y cards sin DnD activo. Hidratación monta el binding. Si
  el binding tiene requisitos de SSR específicos, el snapshot inicial
  debe coincidir con el primer render client. Documentar el patrón en
  el README del wrapper.

- **Closed-list green enforcement (🟡)**: grep gate en apply
  (`grep -r "bg-primary\|text-primary\|outline-primary"
  apps/web/src/components/{organisms,molecules,pages}/task*` debe
  devolver solo usos en los 5 lugares canónicos). El color de las
  columnas del kanban viene de `task_state.tast_color` (definido por
  el usuario), NO del verde primario.

- **Concurrency rollback safety (🟢)**: la migración `002_tasks.ts`
  es aditiva; `down` está documentado. Rollback del change = revert
  del/los commits + `db:migrate` no se ejecuta. Sin datos productivos
  aún.

## 6. Rollback

- **Backend**: revert del/los commits. El composition root vuelve al
  estado pre-change (sin handlers de tasks). La migración `002_tasks.ts`
  no se ejecuta si se aborta antes de mergear; si ya se mergeó,
  `db:migrate` down (DROP TABLE en orden inverso). Los nuevos puertos
  no son usados por el composition root anterior (no rompe compilación).
- **Frontend**: revert del/los commits. La ruta `/tasks` vuelve a ser
  el placeholder `<PlaceholderPage />` original. Los wrappers vendor
  `dnd-kit` y `lexical` se eliminan (sin consumidores). El cliente
  RPC vuelve al single-contract (`authContract`).
- **`/tasks-config` y `/tasks/:id`**: revert del commit que las
  registra; el shell sigue funcionando con el árbol §7 intacto.
- **Catálogo i18n**: revert de la sección `tasks.*` agregada a
  `es.json`. Sin consumidores = sin uso = sin efecto runtime.
- **BaseView**: revert del commit; el README placeholder queda
  intacto. Sin consumidores = sin regresión.
- **Sin datos productivos**: el seed auth no se ve afectado; el
  rollback de la migración no tiene costos de datos.

## 7. Success criteria

Derivados de PRD §8.3 + §11 + §MVP Fase 1 + decisiones confirmadas:

1. Una task creada en `/tasks` (kanban) aparece en la columna Pendiente
   del seed del usuario con `task_kanban_order` consistente.
2. Drag & drop **dentro de la misma columna** reordena las cards y
   persiste el orden en backend; reload preserva el orden.
3. Drag & drop **entre columnas** actualiza `task_tast_id` y
   `task_kanban_order` atómicamente (un solo endpoint `move`);
   reload preserva estado y orden.
4. Mover dos cards adyacentes con `|gap|` menor a 1e-6 activa
   `rebalanceColumn`; el endpoint siguiente `listTasks` devuelve
   orden estable (múltiplos de 1024).
5. La grilla muestra: ícono de tipo, título, descripción breve,
   categoría, cliente, estado. La lista muestra: ícono a la
   izquierda, header cliente/estado, centro título, footer
   descripción.
6. El botón "Editar" de una card navega a `/tasks/:id` con detalle
   y botón Editar en la página (no inline edit).
7. El form lateral deshabilita el campo "Categoría" hasta que se
   selecciona un tipo; al cambiar cliente/tipo, las categorías
   incompatibles se resetean.
8. El campo "Adjuntos" del form está deshabilitado con tooltip
   "Los adjuntos llegan en una próxima entrega." (i18n key
   `tasks.form.attachmentsDisabled`); NO existe botón de upload ni
   endpoint asociado en MVP.
9. La ruedita de configuración al lado del botón "Nueva tarea"
   navega a `/tasks-config`; ahí se pueden crear/editar/eliminar
   `task_state` (solo tab Estados en MVP); `/tasks-config` NO aparece
   en el sidebar.
10. El dropdown "Cliente" consume `rpc.tasks.clients.search` con
    búsqueda por substring; el resultado es `{ clie_id, clie_name,
    clie_email }` filtrado por usuario activo.
11. La descripción rich text se edita vía wrapper `RichTextEditor`
    (sobre `@octanejs/lexical`); se persiste como JSON serializado;
    re-edición exacta del documento.
12. `bun test` verde en workspace raíz con los tests existentes
    (web + api) + tests nuevos unit-first del change.
13. Ningún import de `@octanejs/dnd-kit` ni `@octanejs/lexical`
    fuera de `components/vendor/{dnd-kit,lexical}/` (grep gate).
14. Ningún uso de verde primario fuera de los 5 lugares canónicos
    (CTA fill, nav activo, outline-focus, success, links inline);
    los colores de columna del kanban vienen de
    `task_state.tast_color` (grep gate).
15. Ningún span/atributo de telemetría lleva título, descripción
    o email (grep gate).
16. `@octanejs/dnd-kit` y `@octanejs/lexical` verificados en npm
    (existencia + peer deps contra `octane@0.2.3`) antes de commitear
    `apps/web/package.json`.
17. La migración `002_tasks.ts` es idempotente (correr `db:migrate`
    dos veces no falla); `down` documentado.
18. La base fundacional de `effect` y `xstate` (ya pineados en api
    por `vendor-bindings`) se mantiene confinada bajo
    `src/infrastructure/` y `src/http/`; el cambio no introduce
    nuevos imports fuera de esos paths.
19. `packages/types` exporta `tasksContract` y `lookupsContract`
    con tests de schema verdes (safeParse por input).

## 8. Proposal question round

**No aplica** en esta ejecución: el pre-proposal handoff llegó con las
**8 decisiones de producto CONFIRMADAS** por el product owner
(2026-09-10): research lane unselected · `client` scope lookup only ·
`task_kanban_order` half-step + rebalanceo 1e-6 · `/tasks-config` ruta
sin nav · edición navega a `/tasks/:id` · bindings dnd-kit/lexical con
verificación npm bloqueante · adjuntos Fase 2 con i18n key
`attachmentsDisabled` · lista cerrada de verde sin nuevos usos. Las
incógnitas restantes son técnicas (D1-D10) y quedan delegadas a
sdd-design, con las resoluciones propuestas en §4.

## 9. Skill resolution

`none` — fase de propuesta sobre artefactos ya explorados
(explore.md + preproposal.md). No se inyectaron paths de skills por el
padre, y ninguna skill especializada era requerida para esta fase (la
exploración read-only usó el precedent archivado como cuerpo de
decisiones vinculantes; el proposal no ejecuta código, no toca UI, no
corre tests). El gate de `vendor-bindings` (instalación con verificación
npm bloqueante) es responsabilidad del apply, no del proposal.
