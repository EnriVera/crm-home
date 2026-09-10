# Tasks Specification

> Change: `tasks` · Dominio nuevo (spec completa).
> Fuente de verdad: PRD §8.3 (Tareas MVP Fase 1), §11 (schema `task` / `task_state` /
> `client` / `type_categories_client` / `attachments` / `task_attachments`), §13
> (riesgos/pendientes — adjuntos Fase 2), §9 (BaseView + wrappers vendor), §10
> (puertos y telemetría).
> Decisiones de producto CONFIRMADAS (preproposal 2026-09-10): research lane
> unselected · `client` scope lookup only · `task_kanban_order` half-step con
> rebalanceo `|gap| < 1e-6` · `/tasks-config` ruta sin item de nav · edición
> navega a `/tasks/:id` · bindings `@octanejs/dnd-kit` y `@octanejs/lexical`
> con verificación npm bloqueante · adjuntos Fase 2 (tablas creadas, form
> deshabilitado, sin endpoint) · lista cerrada de verde sin nuevos usos.
> Baseline a preservar: `openspec/specs/api/spec.md`, `openspec/specs/web/spec.md`,
> `openspec/specs/web-shell/spec.md`, `openspec/specs/design-system/spec.md`,
> `openspec/specs/vendor-bindings/spec.md`, `openspec/specs/workspace/spec.md`.
> Precedente canónico: `backend-auth` (backend 1:1) y `frontend-foundation`
> (frontend 1:1).

## Purpose

Define el módulo Tasks del PRD §8.3 MVP Fase 1 como primera pieza de negocio
end-to-end del CRM-HOME: dominio nuevo (`task` + `task_state` + adjuntos como
tablas + `client` mínimo para lookup + `type_categories_client` join table),
segunda migración versionada idempotente (`002_tasks.ts`), segundo contrato
orpc (`tasksContract` con schemas compartidos de lookups), wrappers vendor
nuevos para `@octanejs/dnd-kit` y `@octanejs/lexical` (consumiendo los
bindings diferidos con consumidor en este change por `vendor-bindings`),
materialización del componente `BaseView` prometido por PRD §9 con sus tres
vistas (list, grid, kanban), y cliente RPC web multi-contract (`rpc.auth.*`

+ `rpc.tasks.*`).

## Requirements

### Requirement: Contratos RPC del módulo tasks en @crm/types

`packages/types` DEBE exponer un contrato orpc/zod `tasksContract` bajo el
prefijo `/tasks` siguiendo el patrón de `authContract`, con las operaciones
`list` (POST), `get` (POST), `create` (POST), `update` (POST), `move` (POST,
drag/drop cross-column + persistencia de orden), `remove` (POST),
`states.list` (POST), `states.create` (POST), `states.update` (POST),
`states.remove` (POST), `states.reorder` (POST) y `clients.search` (POST,
lookup D10 namespaced bajo `/tasks`). Los schemas zod DEBEN reflejar PRD §11:
`task_title: z.string().min(1).max(200)`, `task_description:
z.string().max(50_000).nullable()`, `task_kanban_order: z.number().finite()`,
`tast_name: z.string().min(1).max(50)`, `tast_order:
z.number().int().nonnegative()`. `packages/types` DEBE además exponer un
módulo `lookups.ts` con los schemas compartidos de tipos y categorías
(`typeForFormSchema`, `categoryForFormSchema`, `listTypesForForm*`,
`listCategoriesByType*`) para reuso en los endpoints auxiliares; este módulo
NO DEBE exportar un router con prefix propio (los endpoints de lookups se
montan directamente bajo `tasksContract` para mantener paths planos). El
contrato `tasksContract` y cada uno de sus schemas DEBEN contar con tests
`safeParse` en `tasks.test.ts` siguiendo el patrón de `auth.test.ts` (gate
del precedent `backend-auth`).

#### Scenario: Prefijo /tasks estable para todas las operaciones

+ GIVEN el contrato `tasksContract` exportado por `@crm/types`
+ WHEN se inspeccionan las rutas generadas
+ THEN existen exactamente las operaciones `list`, `get`, `create`, `update`, `move`, `remove` y los sub-routers `states` y `clients` bajo el prefijo `/tasks`

#### Scenario: task_title acepta rango 1..200 caracteres

+ GIVEN el schema `createTaskInputSchema`
+ WHEN se valida `{ task_title: "Implementar onboarding", … }`
+ THEN el input es aceptado y `task_title` queda como string no vacío dentro del rango

#### Scenario: task_title vacío o demasiado largo rechazado

+ GIVEN el schema `createTaskInputSchema`
+ WHEN se valida con `task_title: ""` o con 201 caracteres
+ THEN el input es rechazado por validación del contrato

#### Scenario: task_description nullable con tope 50_000

+ GIVEN el schema `taskDescriptionSchema`
+ WHEN se valida con `null` o con un string de 50_000 caracteres
+ THEN el input es aceptado; con 50_001 caracteres es rechazado

#### Scenario: moveTaskInput exige target_state_id

+ GIVEN el schema `moveTaskInputSchema`
+ WHEN se valida sin `target_state_id`
+ THEN el input es rechazado por validación del contrato

#### Scenario: tast_order acepta enteros no negativos

+ GIVEN el schema `tastOrderSchema`
+ WHEN se valida con `0`, `5` o `1000`
+ THEN el input es aceptado; con `-1` o `2.5` es rechazado

#### Scenario: clients.search acepta query mínima de 1 char y limit cap 50

+ GIVEN el schema de input de `tasks.clients.search`
+ WHEN se valida con `query: ""` o `limit: 51`
+ THEN el input es rechazado; con `query: "a"` y `limit: 50` es aceptado (defaults a `limit: 20` cuando se omite)

#### Scenario: Tests safeParse verdes por schema

+ GIVEN `packages/types/src/contracts/tasks.test.ts`
+ WHEN se ejecuta `bun test`
+ THEN existe al menos un caso `safeParse` verde por cada schema exportado (`taskSchema`, `taskStateSchema`, `listTasksInputSchema`, `createTaskInputSchema`, `updateTaskInputSchema`, `moveTaskInputSchema`, `removeTaskInputSchema`, `createTaskStateInputSchema`, `updateTaskStateInputSchema`, `removeTaskStateInputSchema`, `reorderTaskStatesInputSchema`, `listTypesForFormInputSchema`, `listCategoriesByTypeInputSchema`, `listClientsSearchInputSchema`)

### Requirement: Puertos de dominio del módulo tasks

`apps/api/src/domain/ports/` DEBE definir los puertos puros en TypeScript del
módulo tasks: `TaskStateRepository` (CRUD de `task_state`),
`TaskRepository` (CRUD de `task` + `moveTask`, `listByColumn`,
`rebalanceColumn`, `persistOrders`), `AttachmentRepository` (Fase 2: stub con
implementación kysely mínima que satisface la interfaz; ningún endpoint lo
consume en MVP), `ClientLookupRepository` (search-by-name),
`TypeLookupRepository` (listado de tipos para el form: globales + del
cliente), `CategoryLookupRepository` (categorías filtradas por tipo). Los
puertos DEBEN extender la regla ports & adapters de la spec `api`: NUNCA
DEBEN importar kysely, h3, nitro ni SDKs externos. Los métodos que
participen en unidades de trabajo (p. ej. `moveTask`, `rebalanceColumn`)
DEBEN aceptar una transacción opcional (`trx?: Transaction`). Los puertos
del módulo DEBEN reutilizar los ya existentes (`IdGenerator` UUIDv7, `Clock`,
`TransactionManager`, `Telemetry`) sin redefinirlos.

#### Scenario: Puertos definidos y aislados de SDKs

+ GIVEN el árbol `src/domain/ports/` de `apps/api` tras el change
+ WHEN se inspeccionan los archivos `task-state-repository.ts`, `task-repository.ts`, `attachment-repository.ts`, `client-lookup-repository.ts`, `type-lookup-repository.ts` y `category-lookup-repository.ts`
+ THEN cada uno define una interfaz TypeScript sin imports de kysely, h3, nitro ni SDKs externos

#### Scenario: Métodos transaccionales aceptan trx opcional

+ GIVEN las firmas de `TaskRepository.moveTask`, `TaskRepository.rebalanceColumn` y `TaskRepository.persistOrders`
+ WHEN se inspeccionan sus tipos
+ THEN aceptan un parámetro `trx?: Transaction` opcional

#### Scenario: AttachmentRepository sin consumidores MVP

+ GIVEN el puerto `AttachmentRepository` tras el change
+ WHEN se inspecciona el composition root y los handlers HTTP
+ THEN ningún handler lo invoca en MVP y la interfaz existe solo como asiento del contrato Fase 2

### Requirement: Casos de uso del módulo tasks

`apps/api/src/application/tasks/` DEBE implementar los casos de uso en
TypeScript puro como clases con `constructor(private deps)` + `execute(input)`,
replicando 1:1 el patrón del precedent `backend-auth`: `ListTasks`,
`GetTask`, `CreateTask`, `UpdateTask`, `MoveTask`, `DeleteTask`,
`ListTaskStates`, `CreateTaskState`, `UpdateTaskState`, `DeleteTaskState`,
`ReorderTaskStates`, `ListClientsForSelector`, `ListTypesForForm`,
`ListCategoriesByType`. `CreateTask` DEBE asignar `task_kanban_order =
max(existingOrderInColumn) + KANBAN_DEFAULT_STEP` al crear al final, o
`min(existingOrderInColumn) / 2` al prepend, o `(prev + next) / 2` al insertar
entre dos. `MoveTask` DEBE aplicar el algoritmo half-step con rebalanceo
(véase el requisito "Algoritmo half-step kanban con rebalanceo"). Cada caso
de uso DEBE contar con su test unit-first `*.test.ts` siguiendo el patrón del
precedent (`FixedClock`, repos in-memory, `FakeIdGenerator`). Los errores de
dominio (`TaskNotFound`, `TaskStateNotFound`, `InvalidKanbanOrder`,
`InvalidStateTransition`, `Unauthorized`) DEBEN vivir en
`tasks/errors.ts` y ser mapeados a status HTTP en el handler.

#### Scenario: CreateTask appendea con max + KANBAN_DEFAULT_STEP

+ GIVEN una columna con `task_kanban_order` máximo `4096` y un caso de uso `CreateTask` ejecutando
+ WHEN se invoca `execute({...})` sin posición explícita
+ THEN la nueva task se persiste con `task_kanban_order = 5120` (= 4096 + 1024) sin disparar rebalanceo

#### Scenario: GetTask lanza TaskNotFound si no existe

+ GIVEN un `task_id` que no existe en el repositorio
+ WHEN se invoca `GetTask.execute({ task_id })`
+ THEN se lanza `TaskNotFound` y la operación no consulta ni muta otros repos

#### Scenario: MoveTask cross-column actualiza estado y orden atómicamente

+ GIVEN una task en estado A y una columna destino en estado B con posición de drop entre dos tasks existentes
+ WHEN se invoca `MoveTask.execute({ task_id, target_state_id: B, prev_task_id, next_task_id })`
+ THEN el caso de uso actualiza `task_tast_id = B`, recalcula `task_kanban_order` con half-step (o rebalancea si corresponde) y persiste todo dentro de una transacción

#### Scenario: ReorderTaskStates aplica el nuevo orden atómicamente

+ GIVEN un set de `task_state` del usuario con un array `{ tast_id, tast_order }[]` no vacío
+ WHEN se invoca `ReorderTaskStates.execute({ items })`
+ THEN el caso de uso persiste los nuevos `tast_order` en una sola transacción y devuelve los estados actualizados en orden

#### Scenario: Tests unitarios verdes para los 13 casos de uso

+ GIVEN los archivos `*.test.ts` junto a cada caso de uso en `apps/api/src/application/tasks/`
+ WHEN se ejecuta `bun test`
+ THEN existe al menos un test verde por caso de uso (los 13), cubriendo happy path y al menos un error path

### Requirement: Constantes y helpers puros del algoritmo kanban

`apps/api/src/application/tasks/constants.ts` DEBE exportar las constantes
`KANBAN_DEFAULT_STEP = 1024`, `KANBAN_GAP_REBALANCE_THRESHOLD = 1e-6`,
`TASK_TITLE_MAX = 200` y `TASK_DESCRIPTION_MAX = 50_000`. `move-task.ts`
DEBE exportar los helpers puros `computeInsertOrder(prev, next) =
(prev + next) / 2`, `shouldRebalance(gap) = Math.abs(gap) <
KANBAN_GAP_REBALANCE_THRESHOLD`, `rebalanceColumn(rows)` que ordena las filas
por `order` y reasigna múltiplos de `KANBAN_DEFAULT_STEP` (1·step, 2·step,
3·step, …), `appendOrder(rows)` que devuelve `max + KANBAN_DEFAULT_STEP` (o
`KANBAN_DEFAULT_STEP` si la columna está vacía) y `prependOrder(rows)` que
devuelve `min / 2` (o `KANBAN_DEFAULT_STEP` si la columna está vacía). Los
helpers DEBEN ser funciones puras testeables sin repos ni reloj.

#### Scenario: computeInsertOrder aplica half-step entre dos adyacentes

+ GIVEN `computeInsertOrder(1024, 2048)`
+ WHEN se invoca
+ THEN el resultado es exactamente `1536`

#### Scenario: shouldRebalance true cuando |gap| < 1e-6

+ GIVEN `shouldRebalance(5e-7)`
+ WHEN se invoca
+ THEN devuelve `true`; con `1e-5` devuelve `false`

#### Scenario: rebalanceColumn densifica a múltiplos de step

+ GIVEN una columna con rows `[{id:"a",order:1024},{id:"b",order:1024.0000005}]`
+ WHEN se invoca `rebalanceColumn(rows)`
+ THEN el resultado es `[{id:"a",order:1024},{id:"b",order:2048}]` (múltiplos de `KANBAN_DEFAULT_STEP`)

#### Scenario: appendOrder y prependOrder manejan columna vacía

+ GIVEN una columna sin filas
+ WHEN se invocan `appendOrder([])` y `prependOrder([])`
+ THEN ambos devuelven `KANBAN_DEFAULT_STEP` (= 1024) y no lanzan errores

### Requirement: Algoritmo half-step kanban con rebalanceo

`MoveTask.execute` DEBE decidir el orden resultante con `planMove(column,
prev, next)`: si `prev === null`, prepend; si `next === null`, append; si
ambos presentes, `computeInsertOrder(prev.order, next.order)`. Si ambos
adyacentes están presentes y `shouldRebalance(next.order - prev.order)`
devuelve `true`, DEBE invocar `rebalanceColumn(column)` antes de aplicar el
nuevo `task_kanban_order`, persistir los órdenes reasignados con
`taskRepo.persistOrders(...)` y emitir un span `task.move` con atributo
`task.kanban_order_rebalanced = true`. Si el move es cross-column
(`task.task_tast_id !== target_state_id`), DEBE cambiar el `task_tast_id`
dentro de la misma transacción. La concurrencia drag/drop es
**last-write-wins** para MVP (decisión D9 del design): el último PATCH gana
y el rebalanceo detecta drift acumulado en el siguiente `ListTasks`. La
limitación DEBE quedar documentada en el JSDoc del caso de uso.

#### Scenario: MoveTask con gap normal no dispara rebalanceo

+ GIVEN una columna `[1024, 4096]` y `prev.order=1024`, `next.order=4096`
+ WHEN se invoca `MoveTask` insertando entre ambas
+ THEN `task_kanban_order = 2560` y `persistOrders` NO es llamado

#### Scenario: MoveTask con gap < 1e-6 dispara rebalanceo

+ GIVEN una columna `[1024, 1024.0000005]` y `prev.order=1024`, `next.order=1024.0000005`
+ WHEN se invoca `MoveTask` insertando entre ambas
+ THEN `persistOrders` es llamado con `[{id:a,order:1024},{id:b,order:2048}]` y la nueva task recibe un orden estable dentro del rango reasignado

#### Scenario: MoveTask cross-column preserva orden estable

+ GIVEN una task en estado A y un drop en estado B entre dos tasks con orden `[1024, 2048]`
+ WHEN se invoca `MoveTask.execute({ target_state_id: B, prev_task_id, next_task_id })`
+ THEN `task_tast_id` pasa a `B`, `task_kanban_order = 1536` y ambos cambios persisten atómicamente

#### Scenario: Concurrencia documentada last-write-wins

+ GIVEN el JSDoc del caso de uso `MoveTask`
+ WHEN se inspecciona
+ THEN describe explícitamente la limitación "last-write-wins MVP" y referencia el riesgo de drift entre browsers simultáneos

### Requirement: Migración versionada 002_tasks con idempotencia

`apps/api/src/infrastructure/kysely/migrations/002_tasks.ts` DEBE exportar
`up(db)` y `down(db)` usando `sql\`...\`.execute(db)` con SQL raw. `up` DEBE
crear, en orden de dependencias, las tablas `client`,
`type_categories_client`,`attachments`,`task_attachments` y `task`con
sus índices (`idx_client_user`,`idx_task_user`,`idx_task_kanban`) y
foreign keys del hijo al padre según PRD §11 convención 6. La tabla
`task_state` ya existe desde `001_initial.ts` y NO DEBE recrearse ni
alterarse en esta migración. Toda sentencia de creación DEBE usar `CREATE
TABLE IF NOT EXISTS` / `CREATE INDEX IF NOT EXISTS` (defensa en
profundidad, además del tracking nativo del kysely migrator). `down` DEBE
dropar las cinco tablas del change en orden inverso al de creación
respetando las FKs y DEBE estar documentado como destructivo (solo stage
único, sin datos productivos). La migración DEBE ser ejecutable con
`bun run db:migrate` y DEBE poder correrse dos veces seguidas sin fallar.

#### Scenario: db:migrate crea el schema del módulo tasks

+ GIVEN una base postgres vacía y `DATABASE_URL` definida
+ WHEN se ejecuta `bun run db:migrate`
+ THEN existen las cinco tablas nuevas del change con sus índices y FKs, y `task_state` queda intacta

#### Scenario: Migración idempotente al ejecutarse dos veces

+ GIVEN el schema ya migrado por una corrida previa
+ WHEN se ejecuta `bun run db:migrate` una segunda vez sin cambios
+ THEN la migración termina sin error y el schema resultante es idéntico

#### Scenario: down documentado como destructivo

+ GIVEN el archivo `002_tasks.ts`
+ WHEN se inspecciona `down(db)`
+ THEN dropea las cinco tablas en orden inverso y contiene un comentario explícito que lo declara destructivo y limitado a stage único

#### Scenario: DatabaseSchema extendido con las nuevas tablas

+ GIVEN `apps/api/src/infrastructure/kysely/database.ts` tras el change
+ WHEN se inspecciona `DatabaseSchema`
+ THEN incluye las tablas `task`, `client`, `type_categories_client`, `attachments` y `task_attachments` con sus prefijos de 4 letras (`task_`, `clie_`, `tccl_`, `atta_`, `taat_`)

#### Scenario: test-cleanup.ts extendido sin romper cleanupAuthTables

+ GIVEN `apps/api/src/infrastructure/kysely/test-cleanup.ts` tras el change
+ WHEN se inspecciona el archivo
+ THEN existe `cleanupTasksTables(db)` que borra las cinco tablas del change en orden inverso de FKs, y `cleanupAuthTables` permanece intacto

### Requirement: Serialización JSON del rich text (lexical)

`task_description` DEBE persistirse como string con JSON serializado del
editor lexical (`JSON.stringify(editorState)`), NO HTML. El schema zod
`taskDescriptionSchema = z.string().max(50_000).nullable()` refleja el
contrato de transporte. El wrapper vendor `RichTextEditor` DEBE exponer
`onChange(jsonString)` y `defaultValue={JSON.parse(jsonString)}` para
soportar re-edición exacta del documento. La elección DEBE evitar XSS en el
render futuro y mantener un payload estable sin migraciones de formato.

#### Scenario: task_description acepta string JSON de lexical

+ GIVEN el schema `taskDescriptionSchema`
+ WHEN se valida con un string que contiene un JSON serializado válido del editor (p. ej. `JSON.stringify({root:{children:[...]}})`)
+ THEN el input es aceptado como string

#### Scenario: task_description null es válido

+ GIVEN el schema `taskDescriptionSchema`
+ WHEN se valida con `null`
+ THEN el input es aceptado

#### Scenario: Wrapper RichTextEditor serializa a JSON en onChange

+ GIVEN el componente `RichTextEditor` con `defaultValue={JSON.parse("{\"root\":{...}}")}`
+ WHEN el usuario edita y el editor emite `onChange`
+ THEN el argumento recibido es un string con `JSON.stringify(editorState)` (no HTML)

### Requirement: Endpoint lookup /tasks/clients/search (sin CRUD)

`apps/api` DEBE exponer `POST /rpc/tasks/clients/search` con input `{ query:
string, limit?: number = 20 }` y output `{ clients: Array<{ clie_id,
clie_name, clie_email }> }`. El caso de uso `ListClientsForSelector` DEBE
filtrar por `clie_user_id` de la sesión activa (multi-user con aislamiento
total), aplicar `clie_name ILIKE '%' || query || '%'` (case-insensitive;
opcionalmente también sobre `clie_email` si la query contiene `@`), y limitar
a 50 resultados máximo. El endpoint NO DEBE incluir operaciones de CRUD
sobre `client`; ese cambio queda diferido a su change dedicado. El campo
`clie_email` DEBE ser `nullable` en el output.

#### Scenario: Búsqueda por substring devuelve resultados del usuario activo

+ GIVEN el usuario activo `user_id = u1` con dos clientes "Acme SA" y "Beta SRL" y un tercer cliente "Acme Norte" del usuario `u2`
+ WHEN se invoca `tasks.clients.search({ query: "acme" })`
+ THEN el resultado contiene solo `Acme SA` del usuario `u1` (no `Acme Norte`)

#### Scenario: limit se trunca a 50

+ GIVEN `limit: 100` en el input
+ WHEN se valida el input
+ THEN se rechaza por el cap superior de 50 del schema (validación zod → 400)

#### Scenario: Endpoint sin CRUD de clientes

+ GIVEN el router `tasksContract` exportado
+ WHEN se inspeccionan sus operaciones bajo `tasks.clients`
+ THEN solo existe `search`; no hay `create`, `update`, `remove` ni `list` para `client`

### Requirement: Cliente RPC web multi-contract

`apps/web/src/lib/api/rpc.ts` DEBE generalizar el tipo `RpcClient` para
exponer namespaces tipados a partir de los contratos: `rpc.auth.*` (ya
existente, conservando `rpc.auth.verifyOtp.mutate({ email, code })`) y
`rpc.tasks.*` (nuevo: `rpc.tasks.list`, `rpc.tasks.get`, `rpc.tasks.create`,
`rpc.tasks.update`, `rpc.tasks.move`, `rpc.tasks.remove`,
`rpc.tasks.states.list/create/update/remove/reorder`,
`rpc.tasks.clients.search`). `createRpcClient(baseURL)` DEBE construir un
link compartido (`RPCLink` con `credentials: 'include'`) e instanciar un
cliente por contrato (`createORPCClient(contract, link)`). El adapter
existente `lib/otp/rpc-verifier.ts` DEBE migrar de `rpc.verifyOtp` a
`rpc.auth.verifyOtp.mutate(...)` en el punto de composición, sin tocar la
UI ni la máquina OTP. La validación de `baseURL` contra
`ALLOWED_BASE_URL_PATTERN` DEBE mantenerse.

#### Scenario: RpcClient expone namespaces auth y tasks

+ GIVEN el tipo `RpcClient` exportado por `apps/web/src/lib/api/rpc.ts`
+ WHEN se inspecciona su definición
+ THEN contiene `auth: ContractRouterClient<typeof authContract>` y `tasks: ContractRouterClient<typeof tasksContract>`

#### Scenario: Migración de rpc.verifyOtp a rpc.auth.verifyOtp.mutate

+ GIVEN `apps/web/src/lib/otp/rpc-verifier.ts` tras el change
+ WHEN se inspecciona el call site
+ THEN invoca `rpc.auth.verifyOtp.mutate({ email, code })` (no `rpc.verifyOtp` directo)

#### Scenario: createRpcClient valida baseURL

+ GIVEN `createRpcClient("javascript:alert(1)")`
+ WHEN se invoca
+ THEN lanza un error de `Invalid RPC base URL` y no se inicializa ningún cliente

### Requirement: Wrapper vendor dnd-kit para kanban

`apps/web/src/components/vendor/dnd-kit/` DEBE encapsular
`@octanejs/dnd-kit` como únicos puntos de import del binding y su paquete
upstream (`@dnd-kit/core`, etc.). El wrapper DEBE exportar una API pública
mínima (`DndContext`, `useDraggable`, `useDroppable`) y un README que
documente: (a) qué encapsula, (b) su API pública, (c) la regla §9 (único
módulo autorizado a importar el binding), (d) el patrón SSR: el
`DndContext` se monta tras hidratación dentro del cliente (Octane `0.2.3`
soporta `useEffect`-only mount sin mismatch) y el SSR renderiza las
columnas + cards sin DnD activo (D8). El commit de `apps/web/package.json`
NUNCA DEBE ocurrir antes de la verificación npm bloqueante definida en la
spec `workspace`: existencia en npm, peer deps compatibles con
`octane@0.2.3` y `react@18`, versión exacta pineada y lockfile commitado.
Si la verificación falla, el work DEBE detenerse y escalar al product
owner; la sustitución del binding NUNCA DEBE decidirse por cuenta propia.

#### Scenario: Imports del binding confinados al wrapper

+ GIVEN el árbol `src/` de `apps/web` tras el change
+ WHEN se ejecuta `grep -RE "from ['\"]@octanejs/dnd-kit['\"]" apps/web/src/`
+ THEN los matches aparecen únicamente bajo `apps/web/src/components/vendor/dnd-kit/`

#### Scenario: README documenta la regla §9 y el patrón SSR

+ GIVEN `apps/web/src/components/vendor/dnd-kit/README.md`
+ WHEN se inspecciona
+ THEN documenta (a) qué encapsula, (b) API pública, (c) regla §9, (d) patrón SSR con montaje del `DndContext` en `useEffect`

#### Scenario: Verificación npm previa al commit

+ GIVEN el primer commit del change que toca `apps/web/package.json` para añadir `@octanejs/dnd-kit`
+ WHEN se inspecciona el commit
+ THEN el commit incluye `bun pm view @octanejs/dnd-kit versions` + `bun pm view @octanejs/dnd-kit peerDependencies` en su historial de apply, con peer deps compatibles con `octane@0.2.3` / `react@18`; si no, el commit no existe y el work se detuvo

### Requirement: Wrapper vendor lexical (alias rich-text-editor) para descripciones

`apps/web/src/components/vendor/lexical/` (alias de import público
`rich-text-editor/`) DEBE encapsular `@octanejs/lexical` como únicos puntos
de import del binding y su paquete upstream (`lexical`, etc.). El wrapper
DEBE exportar el componente `RichTextEditor` con props `{ value,
onChange, placeholder, maxLength? }` donde `value` es string JSON
serializado (no HTML) y `onChange` recibe el string JSON nuevo (D5). El
README DEBE documentar (a) el binding encapsulado, (b) la API pública,
(c) la regla §9 (único módulo autorizado a importar el binding), (d) el
patrón SSR (el editor monta tras hidratación; el SSR renderiza un
placeholder con `value` parseado a texto plano). El commit de
`apps/web/package.json` NUNCA DEBE ocurrir antes de la verificación npm
bloqueante definida en la spec `workspace`: existencia en npm, peer deps
compatibles con `octane@0.2.3` y `react@18`, versión exacta pineada y
lockfile commitado. Si la verificación falla, el work DEBE detenerse y
escalar al product owner.

#### Scenario: Imports del binding confinados al wrapper

+ GIVEN el árbol `src/` de `apps/web` tras el change
+ WHEN se ejecuta `grep -RE "from ['\"]@octanejs/lexical['\"]" apps/web/src/`
+ THEN los matches aparecen únicamente bajo `apps/web/src/components/vendor/lexical/`

#### Scenario: README documenta regla §9, API pública y patrón SSR

+ GIVEN `apps/web/src/components/vendor/lexical/README.md`
+ WHEN se inspecciona
+ THEN documenta (a) binding encapsulado, (b) props de `RichTextEditor`, (c) regla §9, (d) patrón SSR con montaje en cliente y placeholder server-side

#### Scenario: Verificación npm previa al commit

+ GIVEN el primer commit del change que toca `apps/web/package.json` para añadir `@octanejs/lexical`
+ WHEN se inspecciona el commit
+ THEN el commit incluye `bun pm view @octanejs/lexical versions` + `bun pm view @octanejs/lexical peerDependencies` en su historial de apply, con peer deps compatibles; si no, el commit no existe y el work se detuvo

### Requirement: Componente BaseView compartido (PRD §9)

`apps/web/src/components/base-view/` DEBE materializar el componente
`BaseView` prometido por PRD §9, con la firma `{ id?, filters, records,
views?, onFilterChange?, gridStructure, listStructure, kanbanStructure }`
donde `views?: ViewKind[]` (default `["list","grid","kanban"]`),
`ViewKind = "list" | "grid" | "kanban"`. El switch de vista DEBE ser
estado interno controlado por `BaseView` (no por el padre). Los filtros
DEBEN persistirse en `localStorage["base-view:" + id]` (clave namespaced
que NO colisiona con `crm-sidebar-layout`). Las tres vistas DEBEN
renderizar a partir de sus `*Structure` props:
`gridStructure: { card: (record) => ReactNode, columns?: number }`,
`listStructure: { row: (record) => ReactNode }`,
`kanbanStructure: { board: ({records,onMove}) => ReactNode, card: (record)
=> ReactNode }`. El componente DEBE ser compartido por futuros módulos
(clients, finance); NO DEBE admitir overrides por módulo — si un módulo
necesita algo que la firma común no cubre, la firma DEBE extenderse
(F extends BaseViewFilters) en `BaseView` mismo, NO hacerse fork por
módulo. El `README.md` de la carpeta DEBE documentar el contrato real
(reemplazando el placeholder previo).

#### Scenario: Switch interno de vista persiste elección

+ GIVEN `BaseView` en `/tasks` con `views={["list","grid","kanban"]}`
+ WHEN el usuario hace clic en el tab "Kanban"
+ THEN el componente renderiza `kanbanStructure.board` sin que el padre cambie su estado de vista

#### Scenario: Filtros persisten en localStorage namespaced

+ GIVEN el usuario tipea `search: "fact"` en el filtro de `BaseView id="tasks-list"`
+ WHEN recarga la página
+ THEN el filtro reaplica con `search: "fact"` desde `localStorage["base-view:tasks-list"]`

#### Scenario: Firma común sin overrides por módulo

+ GIVEN el componente `BaseView` exportado
+ WHEN se inspecciona su API pública
+ THEN no existen props específicas de tasks (p. ej. `taskOnly*`); cualquier extensión debe pasar por `F extends BaseViewFilters`

#### Scenario: views filtra qué vistas se muestran

+ GIVEN `<BaseView views={["list","grid"]} />` (sin kanban)
+ WHEN se renderiza el switcher de vistas
+ THEN solo aparecen los tabs "Lista" y "Grilla" (no "Kanban")

### Requirement: Catálogo i18n extendido con sección tasks.*

`apps/web/src/lib/i18n/locales/es.json` DEBE incorporar la sección `tasks.*`
agrupada, completa antes del primer PR frontend que use una clave `tasks.*`
(no se permite PR parcial con claves faltantes): `tasks.page.*` (title,
newTask, configTooltip), `tasks.search.*` (placeholder, label), `tasks.views.*`
(list, grid, kanban), `tasks.state.*` (empty, moveToStart, moveToEnd),
`tasks.card.*` (edit, delete, noDescription, noClient, noCategory),
`tasks.form.*` (titleLabel, titlePlaceholder, titleRequired, titleTooLong,
descriptionLabel, descriptionPlaceholder, clientLabel, clientNone,
typeLabel, typeRequired, categoryLabel, categoryDisabled, priorityLabel,
attachmentsLabel, attachmentsDisabled, submit, submitUpdate, cancel),
`tasks.statuses.*` (label, add, edit, delete, deleteConfirm),
`tasks.errors.*` (notFound, loadFailed, saveFailed, moveFailed,
invalidKanbanOrder). El test de escaneo por glob (`i18n.test.ts`) ya cubre
`src/**/*.{ts,tsrx}`; cualquier `t("tasks.*")` usado en código cuya clave no
exista en el catálogo DEBE provocar el fallo del test.

#### Scenario: Clave usada no presente en catálogo falla el test

+ GIVEN un componente nuevo que llama `t("tasks.form.inexistente")` y `es.json` no contiene esa clave
+ WHEN se ejecuta `bun test apps/web/src/lib/i18n/i18n.test.ts`
+ THEN el test falla con el error "clave ausente en es.json: tasks.form.inexistente"

#### Scenario: Catálogo contiene las 43 claves del módulo

+ GIVEN `apps/web/src/lib/i18n/locales/es.json` tras el change
+ WHEN se cuentan las claves bajo `tasks.*`
+ THEN existen al menos las 43 claves listadas en este requisito (page 3, search 2, views 3, state 3, card 4, form 17, statuses 5, errors 5)

### Requirement: Telemetría sin PII (allowlist explícito)

Los spans emitidos por los casos de uso del módulo tasks DEBEN limitar sus
atributos a la allowlist explícita: `task.task_id`, `task.task_tast_id`,
`task.task_tast_id_from`, `task.task_tast_id_to`, `task.task_kanban_order`,
`task.kanban_order_rebalanced`, `task_state.tast_id`, `task_state.tast_order`,
`user.user_id`, `result.success`, `result.error_code`. NUNCA DEBEN incluir
`task.task_title`, `task.task_description`, `client.clie_name`,
`client.clie_email`, ningún campo de adjuntos (`atta_*`) ni ninguna dirección
de email. Los nombres de span canónicos son `task.create`, `task.update`,
`task.move`, `task.delete`, `task_state.create`, `task_state.reorder`. El
gate de apply DEBE verificar por `grep -RE
'attributes\.(title|description|email)' apps/api/src/` que NO existan
atributos prohibidos; un hit DEBE ser remediado antes del commit (cambiar
el nombre del atributo o eliminar el atributo; nunca emitir PII).

#### Scenario: Atributos permitidos se emiten en task.move

+ GIVEN el caso de uso `MoveTask` ejecutando con `task_id = t1`, `target_state_id = s2`, `prev = s1`, `next = s3`, `rebalance = false`
+ WHEN se inspecciona la llamada a `telemetry.startSpan("task.move", ...)`
+ THEN los atributos emitidos son exactamente `{ "task.task_id": "t1", "task.task_tast_id_from": "s1", "task.task_tast_id_to": "s2", "result.success": true }` (sin title/description/email)

#### Scenario: Gate de grep sin atributos prohibidos

+ GIVEN el árbol `apps/api/src/` tras el change
+ WHEN se ejecuta `grep -RE 'attributes\.(title|description|email)' apps/api/src/`
+ THEN el comando devuelve 0 coincidencias

#### Scenario: Atributo kanban_order_rebalanced se emite en rebalanceo

+ GIVEN el caso de uso `MoveTask` ejecutando con `shouldRebalance(gap) === true`
+ WHEN se ejecuta la rama de rebalanceo
+ THEN se emite `telemetry.startSpan("task.move", { "task.kanban_order_rebalanced": true, ... })` antes del `persistOrders`

### Requirement: Closed-list green enforcement para el módulo tasks

El módulo tasks DEBE respetar la lista cerrada de usos del acento verde
establecida por `design-system` y `theme-quieter-minimalist`: el verde
primario (`bg-primary`, `text-primary`, `border-primary`, `outline-primary`,
`ring-primary`) NUNCA DEBE aparecer en los componentes del módulo (`apps/web/
src/components/{organisms,molecules,pages}/task*`,
`apps/web/src/components/pages/{tasks-page,task-detail-page,
tasks-config-page}.tsrx`, `apps/web/src/components/base-view/`). Las
excepciones permitidas son exclusivamente las cinco canonicas: (1) relleno
del botón primario (`Button variant="primary"`), (2) nav item activo, (3)
`outline-focus` del foco visible, (4) `StatusMessage variant="success"`, (5)
links inline. Los colores de las columnas del kanban DEBEN provenir del
campo `task_state.tast_color` (placeholder: Fase 2 con `@octanejs/colorful`;
en MVP las columnas heredan tokens neutrales del sidebar), NUNCA del verde
primario.

#### Scenario: Grep gate sin verde primario fuera de los 5 lugares canónicos

+ GIVEN el árbol `apps/web/src/components/{organisms,molecules,pages}/task*` y `apps/web/src/components/base-view/` tras el change
+ WHEN se ejecuta `grep -RnE "bg-primary|text-primary|border-primary|outline-primary|ring-primary"` sobre esos paths
+ THEN el comando devuelve 0 coincidencias (los hits solo aparecen en los cinco archivos canónicos del design system)

#### Scenario: Columnas del kanban no usan verde primario

+ GIVEN el componente `task-kanban-column.tsrx` tras el change
+ WHEN se inspecciona su markup y estilos
+ THEN los colores de las columnas resuelven a `tast_color` del estado (o a un token neutral como `--color-surface` en MVP) y NUNCA a `bg-primary`/`text-primary`

#### Scenario: Foco drag preview usa token --color-focus (no verde decorativo)

+ GIVEN el wrapper `vendor/dnd-kit/` puede emitir un outline durante el drag preview
+ WHEN se inspecciona su estilo
+ THEN usa `outline: 2px solid var(--color-focus)` (token canónico de foco), nunca `outline-primary` decorativo

### Requirement: Validación de tareas en cliente

`apps/web/src/lib/validation/task.ts` DEBE exportar validadores puros en TS
sin DOM: `taskTitleRequired(value): string | null` que devuelve mensaje
i18n cuando el valor está vacío o supera `TASK_TITLE_MAX = 200`, y
`taskDescriptionLength(value): string | null` que devuelve mensaje cuando
el valor supera `TASK_DESCRIPTION_MAX = 50_000` (acepta `null` o string
válido). Los validadores DEBEN ser testeables con `bun test` en TS puro.

#### Scenario: Título vacío detectado

+ GIVEN `taskTitleRequired("")`
+ WHEN se invoca
+ THEN devuelve el mensaje i18n `tasks.form.titleRequired` y NO `null`

#### Scenario: Título de 200 chars aceptado

+ GIVEN `taskTitleRequired("x".repeat(200))`
+ WHEN se invoca
+ THEN devuelve `null`

#### Scenario: Título de 201 chars rechazado

+ GIVEN `taskTitleRequired("x".repeat(201))`
+ WHEN se invoca
+ THEN devuelve el mensaje i18n `tasks.form.titleTooLong`

#### Scenario: Descripción null es válida

+ GIVEN `taskDescriptionLength(null)`
+ WHEN se invoca
+ THEN devuelve `null`

### Requirement: Form de tareas con adjuntos deshabilitados (Fase 2 honesto)

`apps/web/src/components/organisms/task-form/` DEBE renderizar el campo
"Adjuntos" del form deshabilitado (no oculto) con la etiqueta i18n
`tasks.form.attachmentsLabel` y el tooltip / texto i18n
`tasks.form.attachmentsDisabled` cuyo valor es "Los adjuntos llegan en una
próxima entrega." (PRD §13 — UX honesto: el usuario debe entender que la
limitación es intencional, no un bug). El form DEBE deshabilitar el campo
"Categoría" hasta que se seleccione un "Tipo"; al cambiar el "Cliente" o el
"Tipo", las categorías incompatibles DEBEN resetearse (helper en
`lib/tasks/tasks-form.ts`). El detalle de tarea (`/tasks/:id`) NO DEBE
mencionar adjuntos hasta Fase 2. NO DEBE existir endpoint de upload ni UI de
listado de adjuntos en MVP.

#### Scenario: Campo Adjuntos deshabilitado con tooltip honesto

+ GIVEN el form de tarea (`/tasks` o `/tasks/:id` con botón Editar)
+ WHEN se renderiza
+ THEN el campo "Adjuntos" está visible con label i18n, está deshabilitado (`disabled` true) y muestra el texto `tasks.form.attachmentsDisabled`

#### Scenario: Sin endpoint de upload

+ GIVEN el router `tasksContract` exportado
+ WHEN se inspeccionan sus operaciones
+ THEN no existe ninguna operación `attachments.upload` ni equivalente; el puerto `AttachmentRepository` queda como asiento Fase 2 sin handler HTTP

#### Scenario: Categoría deshabilitada sin tipo

+ GIVEN el form con `Tipo` sin seleccionar
+ WHEN se renderiza el campo "Categoría"
+ THEN está deshabilitado con tooltip `tasks.form.categoryDisabled`

#### Scenario: Cambio de cliente resetea categoría incompatible

+ GIVEN el form con `Tipo = T1`, `Categoría = C1` (válida para T1) y `Cliente = X`
+ WHEN el usuario cambia `Cliente` a `Y` y `C1` no es válida para `Y + T1`
+ THEN el campo "Categoría" se resetea a `null`/vacío

### Requirement: Rutas /tasks, /tasks/:id y /tasks-config registradas

`apps/web/octane.config.ts` DEBE registrar las tres rutas del módulo tasks
preservando el árbol canónico del PRD §7 intacto (la lista `SHELL_ROUTES`
NO DEBE modificarse):

1. `/tasks` se registra con `shellRoute("/tasks", …)` apuntando a
   `TasksPage` (que reemplaza el placeholder previo), con
   `views={["list","grid","kanban"]}` y `id="tasks-list"` en su `BaseView`.
2. `/tasks/:id` se registra con `shellRoute("/tasks/:id", …)` apuntando a
   `TaskDetailPage`, que incluye el botón "Editar" (abre el form lateral
   derecho sobre la misma página) y "Eliminar" (con confirmación).
3. `/tasks-config` se registra como ruta adicional del shell (helper
   `shellRoute("/tasks-config", …)` apuntando a `TasksConfigPage`) SIN
   agregar item de nav en `SHELL_ROUTES` (decisión CONFIRMADA; acceso solo
   por la ruedita desde `/tasks`). El acceso DEBE mostrar tooltip
   `tasks.page.configTooltip` ("Configurar estados") sobre la ruedita.

Las tres rutas heredan el middleware `before: [requireSession]` del helper
`shellRoute` (punto único del guard). El test `tree.test.ts` DEBE seguir
verde porque `SHELL_ROUTES` no cambia.

#### Scenario: SHELL_ROUTES permanece intacto tras el change

+ GIVEN `apps/web/octane.config.ts` antes y después del change
+ WHEN se comparan las constantes `SHELL_ROUTES`
+ THEN son idénticas (las ocho rutas canónicas del PRD §7 sin modificaciones)

#### Scenario: Rutas /tasks, /tasks/:id y /tasks-config registradas con guard

+ GIVEN la tabla de rutas resultante
+ WHEN se inspecciona
+ THEN `/tasks` y `/tasks/:id` y `/tasks-config` están registradas con `shellRoute(path, entry)` y heredan `before: [requireSession]`

#### Scenario: /tasks-config no aparece en el sidebar

+ GIVEN el árbol de navegación renderizado en el sidebar
+ WHEN el usuario navega a `/tasks`
+ THEN no existe item de nav que apunte a `/tasks-config`; la única vía de acceso es la ruedita (ícono gear) con tooltip `tasks.page.configTooltip`

#### Scenario: Edición navega a /tasks/:id

+ GIVEN una card de task en `/tasks`
+ WHEN el usuario hace clic en el botón "Editar" de la card
+ THEN la app navega a `/tasks/:id` y la página de detalle muestra el botón "Editar" propio (sin inline-edit en la card)

### Requirement: Configuración de /tasks-config limitada a Estados (MVP)

`apps/web/src/components/pages/tasks-config-page.tsrx` DEBE implementar el
MVP de `/tasks-config` con un único tab "Estados" (tab Tipos y Categorías
queda para Fase 2). El tab DEBE permitir crear, listar, editar, eliminar y
reordenar `task_state` vía los endpoints RPC `tasks.states.*`. El form de
estado (`task-state-form`) DEBE trabajar con `tast_name` (string 1..50) y
`tast_order` (int no negativo); NO DEBE incluir color picker en MVP (PRD
§11 menciona `tast_color` / `tast_icono` pero la implementación actual
solo tiene `tast_name` + `tast_order`; esos campos adicionales se difieren
a una migración `003_task_state_columns.ts` posterior, fuera de este
change). La confirmación de borrado de estado DEBE mostrar el mensaje i18n
`tasks.statuses.deleteConfirm` ("¿Eliminar este estado? Las tareas en este
estado no se borran, pero quedan sin estado válido.").

#### Scenario: Tab Estados visible sin tabs Tipos/Categorías

+ GIVEN `/tasks-config` renderizada
+ WHEN se inspecciona el switcher de tabs
+ THEN solo aparece el tab "Estados" (i18n `tasks.statuses.label`)

#### Scenario: CRUD de estados contra el backend

+ GIVEN el usuario autenticado en `/tasks-config`
+ WHEN crea un estado con `tast_name: "En revisión"`, lo lista, lo renombra a "En revisión QA", lo reordena y lo elimina
+ THEN cada acción invoca `rpc.tasks.states.{create,list,update,reorder,remove}` con `mutate` y la UI se actualiza sin recarga

#### Scenario: Sin color picker en MVP

+ GIVEN el `task-state-form` tras el change
+ WHEN se renderiza
+ THEN no existe input de color ni selector visual de color para `tast_color`/`tast_icono`

### Requirement: Atomic design respetado para el módulo tasks

`apps/web/src/components/` DEBE mantener la regla atomic design del
precedent `frontend-foundation`: las páginas (`TasksPage`,
`TaskDetailPage`, `TasksConfigPage`) viven en `components/pages/`; los
organismos (form, cards, board) viven en `components/organisms/`; las
piezas reusables (`task-state-badge`, `task-priority-badge`,
`task-type-icon`, `search-input`) viven en `components/molecules/`. Los
atoms existentes NO DEBEN modificarse. La carpeta `templates/` permanece
vacía. Ningún componente del módulo DEBE importar librerías de UI de
terceros directamente: cualquier import de `@octanejs/dnd-kit`,
`@octanejs/lexical`, `@octanejs/phosphor-icons`, `react-resizable-panels`,
etc. debe pasar por su wrapper `components/vendor/*` correspondiente.

#### Scenario: Sin imports directos de bindings fuera de vendor/

+ GIVEN el árbol `src/` de `apps/web` tras el change
+ WHEN se ejecuta `grep -RE "from ['\"]@octanejs/(dnd-kit|lexical|phosphor-icons|resizable-panels|usehooks-ts|sonner|i18next)" apps/web/src/`
+ THEN las coincidencias aparecen únicamente bajo `apps/web/src/components/vendor/`

#### Scenario: Atoms no se modifican

+ GIVEN el directorio `apps/web/src/components/atoms/` antes y después del change
+ WHEN se comparan sus archivos
+ THEN no se han añadido, modificado ni eliminado archivos en `atoms/`

### Requirement: Estrategia de tests unit-first con integración opt-in

El módulo tasks DEBE seguir strict TDD siguiendo el patrón del precedent
`backend-auth`: tests unitarios primero para los casos de uso y los helpers
del algoritmo kanban (con `FixedClock`, repos in-memory, `FakeIdGenerator`),
tests de contratos zod con `safeParse` por schema, y tests de integración
postgres opt-in (`*.integration.test.ts` con `describe.skipIf(!databaseUrl)`)
cubriendo `moveTask` cross-column + rebalanceo end-to-end y los lookups con
FKs del cliente correcto. `bun test` en el workspace raíz DEBE seguir
verde sin postgres ni OTLP tras mergear el change.

#### Scenario: bun test verde sin postgres ni OTLP

+ GIVEN el workspace instalado, sin `TEST_DATABASE_URL` ni `OTEL_EXPORTER_OTLP_ENDPOINT`
+ WHEN se ejecuta `bun test` desde la raíz
+ THEN todos los tests unitarios pasan y los `*.integration.test.ts` se saltan

#### Scenario: Integración opt-in con TEST_DATABASE_URL

+ GIVEN `TEST_DATABASE_URL` definida y el schema migrado contra esa base
+ WHEN se ejecuta `bun test`
+ THEN los `*.integration.test.ts` corren contra postgres real, usan `cleanupTasksTables(db)` en `afterAll`, y limpian/revierten sus datos

#### Scenario: Unit tests cubren los 6 casos del algoritmo kanban

+ GIVEN `apps/api/src/application/tasks/move-task.test.ts`
+ WHEN se ejecuta `bun test`
+ THEN existen tests verdes para: gap normal entre A y B (sin rebalanceo), gap < 1e-6 (rebalancea), append al final, prepend al inicio, cross-column y move entre columnas distantes
