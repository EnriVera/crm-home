# Explore — tasks

> Fase exploratoria (read-only) del change SDD `tasks`. Intención: implementar
> el módulo Tasks del PRD §8.3 (MVP Fase 1) — CRUD de tareas, vistas grilla /
> kanban / lista con drag & drop, prioridades, configuración de estados y
> adjuntos como tablas intermedias (PRD §11). Backend completo
> (domain/application/infrastructure + migración kysely) y frontend completo
> (reemplazo del placeholder `/tasks` por UI funcional con detalle, crear, editar
> y kanban drag/drop).
>
> Cambios previos archivados consultados como precedentes: `backend-auth`,
> `transactional-email`, `frontend-foundation`, `theme-quieter-minimalist`,
> `stack-alignment`, `monorepo-scaffold`.

## 1. Resumen ejecutivo

El cambio `tasks` cierra la primera pieza de negocio end-to-end del CRM-HOME
sobre el scaffolding ya consolidado. La base arquitectónica es sólida y
reutilizable: backend-auth dejó el patrón canónico de ports & adapters
(8 puertos + 4 casos de uso + 4 adapters kysely + 1 migración
versionada + 1 tarea de nitro), el frontend tiene el shell con sidebar
redimensionable, guard de sesión, cliente RPC con `credentials: 'include'`,
wrapper i18n, máquina OTP y tipografía/tokens cerrados. El nuevo change
**multiplica ese patrón** a un módulo de negocio: un dominio nuevo (tasks +
task_state + task_attachments), una segunda migración versionada y un
reemplazo completo del placeholder `/tasks` por UI funcional con tres vistas
(drag/drop kanban con `@octanejs/dnd-kit`, grilla, lista) y descripción rich
text con `@octanejs/lexical`.

**Decisiones de producto heredadas (no re-preguntar):** el verde permanece
dentro de la **lista cerrada** confirmada por `theme-quieter-minimalist`
(CTA primario, nav activo, foco, éxito, links inline) — la kanban no introduce
verde nuevo. El orden del kanban es **decimal** (`double precision`) según
PRD §11: el algoritmo "gap" entre dos cards es estable sin re-numerar toda la
columna en cada movimiento. La columna de adjuntos es **Fase 2** por PRD
(§8.3 + §13: "Adjuntos en Fase 2 — las tablas intermedias ya están en el
schema para no migrar después"). Las tablas del schema del change ya existen
declaradas en PRD §11; la migración `002_tasks.ts` las materializa junto a
los índices/FKs respetando las convenciones del repositorio (prefijos 4 letras,
UUIDv7, FKs hijo→padre, soft-delete).

**Riesgos principales:** (a) tamaño probable > 400 líneas (8 archivos de
dominio nuevos + 8 de infra + 8 de tests unit + integración + 4 endpoints
RPC + UI con 3 vistas + drag/drop + i18n + 2 wrappers vendor nuevos) —
`ask-on-risk` debe pausar y proponer chaining; (b) `@octanejs/dnd-kit` y
`@octanejs/lexical` son **bindings diferidos con consumidor en este change**:
exige la verificación npm bloqueante de la spec `workspace` antes de pinear;
(c) la regla `task_kanban_order` exige definir el algoritmo de asignación de
gaps (constantes documentadas), la concurrencia entre drops simultáneos y la
persistencia post-drag; (d) el alcance Fase 2 (adjuntos) **NO entra** en
este change — el campo "adjuntos" en la UI debe ser visible pero deshabilitado
con tooltip "Llega en una próxima entrega", siguiendo el patrón del placeholder
existente.

## 2. Estado actual del backend (`apps/api`)

Inventario en disco verificado:

- **Composition root** (`src/http/composition-root.ts`): cablea telemetry,
  `GetHealth` + `/health`, db kysely lazy, `KyselyTransactionManager`, los
  cuatro casos de uso de auth, `createRpcHandler({ getHealth, requestOtp,
  verifyOtp, getSession, logout })`. Punto único donde el change enchufa los
  casos de uso de tasks + `/rpc/tasks/**`.
- **Router orpc** (`src/http/router.ts`): patrón establecido — contrato en
  `@crm/types` (`oc.prefix("/auth").router({...})`), handlers HTTP en
  `http/auth/auth-routes.ts` con `readValidatedBody(event, schema.parse)`,
  `Response.json(result)` y mapeo de errores (`RateLimitedError` → 429). Los
  endpoints de tasks siguen el mismo patrón (prefijo `/tasks`, handlers en
  `http/tasks/tasks-routes.ts`, todo wireado en `createRpcHandler`).
- **Kysely** (`src/infrastructure/kysely/database.ts`): adapter lazy
  (`createDatabase(url)` solo cuando hay `DATABASE_URL`), `DatabaseSchema` ya
  extendido con `task_state`, `accounts`, `types`, `categories` (tablas
  mínimas del seed de auth). Este change extiende `DatabaseSchema` con las
  tablas del change (`task`, `client`, `type_categories_client`,
  `attachments`, `task_attachments`, `tasks_config` solo si aplica — ver §6).
- **Migración 001** ya existe (`src/infrastructure/kysely/migrations/001_initial.ts`):
  crea lookups globales (`sino`, `apps` con `Core`, `currency` con ARS),
  tablas de auth y de soporte del seed transaccional. El `down` documenta
  que es destructivo y stage-único.
- **Patrón de repositorio** verificado: `LoginRepository`, `SessionRepository`,
  `UserRepository` y `EmailSendingRepository` viven como interfaces en
  `src/domain/ports/*-repository.ts`, sus implementaciones kysely en
  `src/infrastructure/kysely/*-repository.ts`, con métodos que aceptan
  `trx?: Transaction` opcional para participar de unidades de trabajo
  (seed transaccional). Tests in-memory viven en `*.test.ts` (unit-first);
  tests de integración con postgres en `*.integration.test.ts` (skip si no
  hay `TEST_DATABASE_URL`). Patrón a espejar 1:1 para `task_state` y `task`.
- **Telemetría** (`src/infrastructure/otel/`): `Telemetry` ya exporta
  `startSpan(name, attributes)` y `shutdown()`. Las llamadas a `startSpan`
  deben excluir PII (PRD §10: "ningún span ni atributo lleva emails, títulos
  de tareas ni montos").
- **Crypto**: `IdGenerator` (UUIDv7), `Clock`, `OtpGenerator`, `TokenHasher`,
  `SecureComparator` ya inyectados en el composition root. Reutilizables
  literalmente para tasks (IdGenerator para nuevos `task_id`, Clock para
  timestamps).
- **Email**: NO se usa para tasks (no hay email transaccional de tasks en
  MVP). `EmailSender` queda intacto; este change NO crea plantilla nueva en
  `@crm/email` — la regla de "fuera del MVP" del email transaccional de tasks
  la fija PRD §13 (riesgos/pendientes).
- **Task de nitro** (`apps/api/tasks/email-sending.ts`): usa el patrón
  `defineTask({ meta, run })` con `createDatabase(env.DATABASE_URL)` propio
  (no pasa por composition root). El drain drena `email_sending` cada minuto
  vía `nitro.config.ts` (`scheduledTasks: { "*/1 * * * *": ["email-sending"] }`).
  Tasks NO necesitan migración para tasks — el módulo no tiene scheduler.
- **`uuidv7`** ya instalado en `apps/api/package.json` (versión pineada). El
  adapter `infrastructure/crypto/id-generator.ts` ya está implementado.

**Gap relevante**: la tabla `task` en PRD §11 no existe aún — vive solo en el
schema del PRD. La migración `002_tasks.ts` la crea junto a `client`,
`type_categories_client`, `attachments`, `task_attachments`. La columna
 5érica `task_kanban_order` es `double precision` por PRD §11 con índice
`(task_user_id, task_tast_id, task_kanban_order)` para queries rápidas de
columna.

## 3. Estado actual del frontend (`apps/web`)

Inventario verificado:

- **Shell + auth**: `routes/__app-shell.tsrx` con sidebar resizable (binding
  `@octanejs/resizable-panels`, IDs `crm-sidebar-layout`), guard de sesión
  enchufado en `octane.config.ts` (`shellRoute()` con `before: [requireSession]`),
  i18n provider global, `SidebarNav` con árbol §7 (incluido `/tasks`).
- **Cliente RPC** (`src/lib/api/rpc.ts`): `createRpcClient(baseURL)` con
  `credentials: 'include'` y `ALLOWED_BASE_URL_PATTERN` que valida el
  baseURL contra inyecciones. **Hoy solo conoce `authContract`**; este
  change lo extiende a un `tasksContract` (mismo patrón).
- **Wrappers vendor existentes**: `i18n/`, `otp-input/`, `icons/`,
  `resizable/`, `toast/`, `hooks/` (cohorte host-safe). **NO existe**
  `dnd-kit/`, `lexical/`, `rich-text-editor/`, `drag-drop/`. El change los
  introduce siguiendo el patrón §9.
- **Atoms existentes**: `app-title`, `button` (variantes `primary`/`ghost`,
  respeta lista cerrada verde), `skip-link` (fill neutral, outline verde
  canónico), `status-message` (`error`/`success`), `text-input`. Suficientes
  para construir el formulario de tarea; se reutilizan sin cambios.
- **Molecules**: `form-field` (label + input + error), `nav-group`,
  `nav-item`, `theme-toggle`. Sin cambios necesarios.
- **Organisms**: `login-form`, `otp-form`, `sidebar-nav`. Sin cambios.
- **Pages**: `login-page`, `login-verification-page`, `placeholder-page` (la
  actual `/tasks` la usa como placeholder).
- **BaseView placeholder** (`apps/web/src/components/base-view/README.md`):
  el componente **real** llega con su feature (PRD §9) — el change actual lo
  materializa con las 3 vistas requeridas por tasks. README documenta que
  está reservado y no acepta ad-hoc hasta tener el contrato BaseView.
- **Catálogo i18n** (`apps/web/src/lib/i18n/locales/es.json`): tiene
  secciones `app`, `nav`, `theme`, `shell`, `auth.{footer,login,otp}`. Este
  change agrega `tasks.*` (kanban, list, grid, detail, form, statuses,
  priorities, attachments-disabled, errors). El test de escaneo por glob
  (`i18n.test.ts`) **falla automáticamente** si una clave `t("...")` no
  existe en el catálogo — gate natural para i18n completeness.
- **Validación** (`src/lib/validation/`): existe `email.ts` con `isValidEmail`.
  Este change agrega validadores de tarea (título no vacío, descripción
  opcional sin tope, longitud máxima de título 200 chars).
- **xstate** (`src/lib/otp/otp-machine.ts`): xstate v5 ya cableado en web
  (base fundacional) y en api (cohorte infraestructura). **Opcional** para
  tasks: si el flujo de creación/edición se modela con máquina, usa el
  patrón de OTP (puerto + adapter + façade `createXMachine`). Si no, usa
  `useState` puro — decisión de design.
- **Hooks** (`src/components/vendor/hooks/`): cohorte host-safe
  (`useBoolean`, `useCounter`, `useDebounceValue`, `useToggle`, etc.).
  Disponibles para el formulario de tarea. **No usar** `useLocalStorage`,
  `useMediaQuery`, `useIntersectionObserver` — la spec `vendor-bindings` los
  declara AUSENTES; el kanban **no debe usar** `useLocalStorage` para
  persistir el orden localmente (la fuente de verdad es el backend, vía
  PATCH del `task_kanban_order`).

**Gaps relevantes** (a cerrar en este change):

1. **Falta el componente `BaseView`** (`apps/web/src/components/base-view/`)
   con sus tres vistas (`gridStructure`, `listStructure`, `kanbanStructure`)
   y prop `views?: ["list" | "grid" | "kanban"]`. El README de la carpeta
   está como placeholder; este change lo materializa.
2. **Faltan wrappers vendor**: `components/vendor/dnd-kit/` y
   `components/vendor/lexical/` (alias `rich-text-editor/`) — encapsulan los
   bindings `@octanejs/dnd-kit` y `@octanejs/lexical`, únicos puntos de
   import de esas librerías.
3. **Falta el cliente RPC tipado para `tasksContract`**: hoy
   `RpcClient = ContractRouterClient<typeof authContract>`. El change crea
   un cliente multi-contract o uno dedicado a tasks (decisión design).
4. **No existe página real de `/tasks`**: `routes/tasks.tsrx` es una línea
   `<PlaceholderPage />`. El change la reemplaza con `TasksRoute` real
   (lista de tareas + botón "Nueva tarea" + ícono de configuración que
   redirige a `/tasks-config`).
5. **No existe `/tasks-config`**: hay que registrarla en `SHELL_ROUTES` (no,
   ver §6.2 — el cambio del routes.ts es delicado) o tratarla como ruta
   adicional del shell. **Decisión de design** con impacto en spec `web`.

## 4. Requisitos PRD §8.3 + §11 + §MVP Fase 1 (fuente de verdad)

Funcionalidad MVP a implementar:

- **Lista de tareas con tres vistas** (PRD §8.3 #3):
  - **Grilla**: botón editar, ícono del tipo, título, descripción breve,
    categoría, cliente, estado.
  - **Kanban**: columnas por estado ordenadas por `task_state.tast_order`;
    drag & drop entre columnas (cambia estado) y dentro de la columna
    (cambia `task_kanban_order`, persistido).
  - **Lista**: ícono del tipo a la izquierda; header cliente/estado;
    centro título; footer descripción.
- **Nueva tarea**: lateral derecho con título (obligatorio), descripción
  (editor lexical), cliente (opcional), tipo (obligatorio), categoría
  (opcional, deshabilitada sin tipo), adjuntos (Fase 2 — deshabilitado).
- **Ruedita de configuración** al lado del botón "Nueva tarea" → redirige a
  `/tasks-config` (CRUD de `task_state` con tabs Estados por ahora).
- **Criterios de aceptación** (PRD §8.3):
  - Categoría deshabilitada sin tipo (con tooltip).
  - Al cambiar el cliente, tipo y categoría incompatibles se resetean.
  - Drag & drop cross-column persiste estado y orden; reload preserva.
  - Tarea nueva aparece en columna `Pendiente` (seed del usuario).
- **Tareas** (`task`) y **Estados** (`task_state`) según PRD §11:

  ```sql
  CREATE TABLE "task_state" (
      tast_id, tast_user_id, tast_title, tast_color, tast_icono, tast_order,
      tast_created_at, tast_updated_at, tast_deleted_at
  );
  CREATE TABLE "task" (
      task_id, task_user_id, task_title, task_description,
      task_clie_id (FK → client), task_type_id (FK → types, NOT NULL),
      task_cate_id (FK → categories, nullable),
      task_tast_id (FK → task_state, NOT NULL),
      task_kanban_order DOUBLE PRECISION NOT NULL DEFAULT 0,
      task_created_at, task_updated_at, task_deleted_at
  );
  ```

- **Adjuntos como tablas intermedias** (PRD §11): `attachments` global +
  `task_attachments` (join table, FKs reales, PK compuesta `(taat_task_id,
  taat_atta_id)`). **NO usar `uuid[]`** porque no soporta FKs. **Fase 2**:
  la UI muestra "Adjuntos (próximamente)" deshabilitado; las tablas se crean
  en la migración pero el endpoint de upload NO entra en MVP.
- **`type_categories_client`** (PRD §11): join table que materializa la regla
  PRD §8.3 #1 — "tipo dropdown: del cliente + globales; categoría filtrada
  por tipo". `tccl_clie_id NULL` = combinación GLOBAL disponible sin cliente.
- **`client`** (PRD §11): la tabla existe en el schema pero NO tiene CRUD
  en este change — es del change `clients` (siguiente). El FK
  `task_clie_id` se crea; el dropdown de cliente en el form usa un endpoint
  RPC auxiliar (`tasks.clients.list` o reusa lo que exista). **Decisión de
  design**: depende del alcance del change `clients`; el proposal debe
  clarificar si `clients` se entrega en este mismo change o si el dropdown
  consume un endpoint mínimo de "listar clientes del usuario para selector".

## 5. Patrones a replicar del precedent `backend-auth`

Para mantener consistencia arquitectónica, el change tasks replica 1:1 los
patrones establecidos:

| Pieza | Patrón backend-auth | Aplicación a tasks |
| --- | --- | --- |
| Contratos en `@crm/types` | `auth.ts` con `oc.prefix("/auth").router({...})` | `tasks.ts` con `oc.prefix("/tasks").router({...})` |
| Tests de schemas | `auth.test.ts` con `safeParse` por schema | `tasks.test.ts` espejado |
| Puertos de dominio | `TaskStateRepository`, `TaskRepository`, `TaskAttachmentRepository` (Fase 2), `ClientLookupRepository` (aux) |
| Casos de uso puros | `RequestOtp`, `VerifyOtp`, etc. — clases con `constructor(private deps)` + `execute(input)` | `CreateTask`, `UpdateTask`, `MoveTask` (drag/drop), `DeleteTask`, `GetTask`, `ListTasks`, `CreateTaskState`, `UpdateTaskState`, `DeleteTaskState`, `ListTaskStates`, `ReorderTaskStates` |
| Repositorios kysely | Mappers `mapRow` + `resolve(trx)` + `trx?` opcional | Idéntico |
| Migración | `001_initial.ts` con `up(db)` / `down(db)` en SQL raw | `002_tasks.ts` con misma estructura |
| Tests unit-first | `*.test.ts` con `FixedClock`, repos in-memory, `FakeIdGenerator` | Idéntico |
| Tests integración opt-in | `*.integration.test.ts` con `describe.skipIf(!databaseUrl)` | Idéntico |
| `test-cleanup.ts` | `cleanupAuthTables(db)` borra en orden inverso | Extender con `cleanupTasksTables(db)` (no rompe el contrato existente) |
| HTTP handlers | `auth-routes.ts` con `createXHandler(deps)` + mapeo de errores | `tasks-routes.ts` espejado; errores de validación via orpc (`OCError`-style con códigos `TASK_NOT_FOUND`, `TASK_STATE_NOT_FOUND`, `INVALID_KANBAN_ORDER`, `UNAUTHORIZED`) |
| Composition root | `createCompositionRoot` recibe `AppEnv`, cablea repos + casos de uso | Idéntico; nuevos `taskStateRepository`, `taskRepository`, `clientLookupRepository` se inyectan |
| Router | `createRpcHandler({ getHealth, requestOtp, verifyOtp, getSession, logout })` | Extiende a `{ ..., task: { list, get, create, update, move, delete, listStates, createState, updateState, deleteState, reorderStates } }` |
| Cookies | `crm_session` httpOnly 30d deslizante | Sin cambios; session-guard del shell ya cubre `/tasks` |
| Cliente RPC web | `createRpcClient(baseURL)` con `authContract` | Extender a multi-contract o dedicado a tasks; contrato adicional `tasksContract` |

## 6. Decisiones que design/proposal deben resolver (sin re-preguntar lo confirmado)

### 6.1 Decisiones de producto (preguntar al product owner en el proposal gate)

1. **Alcance del CRUD de `client`**: el dropdown de "Cliente" en el form de
   tarea necesita al menos un endpoint `listClientsForUser` (limitado a
   `id` + `name` para el selector). ¿Este change incluye el CRUD mínimo
   de clientes o se coordina con el change `clients` siguiente?
   - **Default sugerido**: entregar el endpoint **mínimo de lookup**
     (`clients.listForSelector` con id + name) en este change, suficiente
     para el dropdown. El CRUD completo de clientes queda para su change
     dedicado. Esto evita bloquear tasks por scope de clients.

2. **Algoritmo de `task_kanban_order`**: PRD §11 usa `double precision`.
   Opciones:
   - **(a) Half-step gap**: nueva task al final de columna recibe `max + 0.5`;
     mover entre dos existentes recibe `(a + b) / 2`. Requiere re-normalización
     periódica cuando los gaps se quedan pequeños.
   - **(b) Sparse integers**: nueva task recibe `max + 1024`; mover recibe
     `floor((a + b) / 2)`. Más simple, menos re-numeración.
   - **(c) Lexorank / fractional indexing** (estilo JIRA): string
     lexicografiable con rebalanceo lazy.
   - **Default sugerido**: **(a) half-step** con rebalanceo cuando
     `|gap| < 1e-6` entre dos adyacentes (heurística simple). Documentado
     en el design; PRD §11 no especifica algoritmo.

3. **Concurrencia de drag/drop simultáneo**: dos browsers moviendo cards
   en la misma columna pueden generar órdenes en colisión. Opciones:
   - **(a) Last-write-wins** con re-numeración del cliente en el siguiente
     `listTasks` si el orden es inconsistente.
   - **(b) Optimistic locking con `If-Match` o `updated_at`** en el body
     del PATCH.
   - **Default sugerido**: **(a)** para MVP (más simple). Documentar la
     limitación; si la sección de "orden" se vuelve contenciosa, Fase 2
     añade lock por columna.

4. **Adjuntos Fase 2 — UI**: el form muestra el campo "Adjuntos" como
   deshabilitado con tooltip "Llega en una próxima entrega". ¿Se incluye
   también el botón "Ver adjuntos" en el detalle de tarea?
   - **Default sugerido**: solo el campo del form deshabilitado; el detalle
     de tarea no menciona adjuntos hasta Fase 2.

5. **`/tasks-config` ruta**: PRD §7 la lista como ruta canónica separada
   (`/tasks-config`). El shell actual (`SHELL_ROUTES` y `NAV_TREE`) NO
   la incluye. Opciones:
   - **(a) Agregar `/tasks-config` a `SHELL_ROUTES`** (afecta `tree.test.ts`
     y `lib/nav/tree.ts`); el árbol §7 debe acomodarlo.
   - **(b) Tratar `/tasks-config` como ruta del shell pero fuera del nav**
     (sub-ruta de `/tasks`, tipo modal/ruta anidada no soportada por Octane
     plano — realmente no aplica).
   - **(c) No tocar el nav y entregar `/tasks-config` como ruta del shell
     que NO aparece en el sidebar pero existe** (acceso solo por la ruedita).
   - **Default sugerido**: **(a)** pero requiere decisión de PRD: el árbol
     §7 dice `/tasks` solo. Una opción limpia es **entregar `/tasks-config`
     como ruta sin item de nav**, accedida por la ruedita. Eso preserva el
     contrato del árbol. Pregunta al product owner para confirmar.

### 6.2 Decisiones técnicas (resuelve design, no requieren product owner)

1. **Schema del contrato RPC**: `tasksContract = oc.prefix("/tasks").router({
   list: GET, get: GET, create: POST, update: POST, move: POST (kanban-only,
   cambia estado + orden en una sola llamada), remove: POST, listStates: GET,
   createState: POST, updateState: POST, removeState: POST, reorderStates: POST
   })`. Los schemas zod reflejan PRD §11 (`task_title: z.string().min(1).max(200)`,
   `task_description: z.string().nullable`, etc.).

2. **Endpoint único de drag/drop**: el cambio cross-column requiere actualizar
   `task_tast_id` + `task_kanban_order` atómicamente. Diseño sugerido: un
   solo endpoint `POST /rpc/tasks/move` con `{ taskId, targetStateId,
   kanbanOrder }` que hace el UPDATE en una transacción (incluyendo el
   caso de colisión de orden: si el gap es muy chico, rebalancea la columna).

3. **Drag/drop librería**: `@octanejs/dnd-kit` (binding diferido con consumidor
   en este change según `vendor-bindings` spec). Verificación npm bloqueante
   obligatoria antes de pinear.

4. **Rich text**: `@octanejs/lexical` (binding diferido con consumidor en este
   change). El wrapper `vendor/lexical/` expone `RichTextEditor` con
   `{ value, onChange, placeholder, maxLength? }` y serializa a/desde el
   formato JSON de lexical (que es lo que se persiste en `task_description`).
   Verificación npm bloqueante.

5. **BaseView**: contrato (PRD §9) — `<BaseView id="tasks-list" filters={
   search } records={tasks} views={["list","grid","kanban"]}
   gridStructure={...} listStructure={...} kanbanStructure={...} />`. El
   filtro de búsqueda persiste en `localStorage["tasks-list"]` (generalización
   del patrón `crm-sidebar-layout`).

6. **Reorden de columnas**: `POST /rpc/tasks/states/reorder` con array
   `{ stateId, order }[]` en una transacción. Atómico, simple.

7. **Migración 002_tasks**: SQL raw vía `sql`\`...\`.execute(db)`, mismo
   estilo que 001. Crea (orden de dependencias):`client`,
   `type_categories_client`,`attachments`,`task_attachments`,`task`,
   `task_state` ya existe. Índices + FKs del hijo al padre según PRD §11.
   `down` documentado como destructivo. **Idempotencia**: si las tablas ya
   existen (caso `db:migrate` corriendo dos veces), usar
   `CREATE TABLE IF NOT EXISTS` o capturar el error de "relation already
   exists" (preferible `IF NOT EXISTS` por convención).

8. **Composición del cliente RPC web**: hoy `RpcClient = ContractRouterClient<
   typeof authContract>`. Para tasks, crear `tasksClient = ContractRouterClient
   <typeof tasksContract>` con su propio `createRpcTasksClient(baseURL)` o
   generalizar a un cliente multi-contract (un objeto `{ auth, tasks, ...}`
   con namespace). **Default sugerido**: cliente multi-contract en
   `lib/api/rpc.ts` que reciba un objeto de contratos y exponga namespaces.
   Decisión de design con impacto en `lib/api/rpc.ts` y `lib/otp/rpc-verifier.ts`
   (que hoy asume `rpc.verifyOtp` directamente).

9. **Tests de integración**: extender `test-cleanup.ts` con
   `cleanupTasksTables(db)` que borra `task_attachments`, `attachments`,
   `task`, `type_categories_client`, `client`. Los suites de tasks integration
   usan ese helper.

10. **Telemetría**: agregar `Telemetry` startSpan en el composition root o en
    cada caso de uso, con atributos sin PII (`task.id` o `task_state.id`
    están bien; `task.title` NO). El spec `api` exige que el SDK OTel solo
    viva en `infrastructure/` — `startSpan` se llama desde casos de uso pero
    el SDK subyacente es opaque (cumple).

## 7. Restricciones vinculantes (no negociables)

- **Lista cerrada de verde** (`theme-quieter-minimalist` + spec
  `design-system`): ningún verde fuera de (1) CTA primario fill, (2) nav
  activo, (3) `outline-focus`, (4) `StatusMessage` success, (5) links
  inline. La kanban **no introduce** verde nuevo — el drag/drop usa el
  color del estado (`task_state.tast_color`) y el outline de foco canónico.
  Ghost buttons de "Cancelar" usan `text-text-primary` (no verde).

- **Wrappers vendor (§9)**: `@octanejs/dnd-kit` y `@octanejs/lexical`
  importados **solo** desde `apps/web/src/components/vendor/{dnd-kit,
  lexical}/`. La regla es auditable por grep. Documentar los wrappers con
  README siguiendo el patrón de `vendor/i18n/README.md`.

- **Atomic design**: el nuevo UI de tasks vive en `pages/tasks/` (página),
  `organisms/task-{form,card,kanban-column,list-row,grid-card,...}/` (si
  aplica) y `molecules/{task-priority-badge, task-state-badge}/`. No
  meter nada en `templates/` (vacío por convención del repo).

- **BaseView** (`apps/web/src/components/base-view/`): el componente real
  entra en este change. Es compartido por tasks; futuros módulos
  (clients, finance) lo consumen tal cual. NO añadir overrides por
  módulo — si tasks necesita algo que la firma común no cubre, se
  GENERALIZA la firma (no se hace fork por módulo).

- **Telemetría sin PII (PRD §10)**: ningún span, log ni atributo lleva
  emails, títulos de tareas, descripciones, montos ni nombres de
  adjuntos. Solo IDs y categorías agregadas (ej. `task.create`,
  `task.move`, `task.delete` como nombres; `task.tast_id`, `task.from_state`,
  `task.to_state` como atributos).

- **Strict TDD (config.yaml)**: tests unitarios primero, en paralelo con
  los casos de uso. Tests de integración opt-in. `bun test` en workspace
  raíz verde como gate de verify. Smoke test existente se preserva.

- **Conventional Commits**: commits `feat(api):`, `feat(web):`, `feat(types):`
  según corresponda. Husky + commitlint activos (no se tocan).

- **Idempotencia de migraciones**: `002_tasks.ts` usa `CREATE TABLE IF NOT
  EXISTS` / `CREATE INDEX IF NOT EXISTS` para que `db:migrate` corriendo
  dos veces no falle (kysely migrator nativo trackea versiones, pero la
  defensa en profundidad con `IF NOT EXISTS` es buena práctica).

## 8. Riesgos y mitigaciones

| Riesgo | Nivel | Mitigación |
| --- | --- | --- |
| **Tamaño del change > 400 líneas** (backend 8 puertos + 10 casos de uso + 10 adapters + tests + migración + frontend 2 wrappers + BaseView + 3 vistas + form + i18n + 1 ruta adicional) | 🔴 | `ask-on-risk` pausa el apply; chaining sugerido: PR-A (backend: migration + dominio + casos de uso + tests), PR-B (backend: HTTP + composition root + router + clientes RPC), PR-C (frontend: wrappers vendor + BaseView + página /tasks). PR-D opcional para `/tasks-config`. |
| **`@octanejs/dnd-kit` y `@octanejs/lexical` no resuelven npm** | 🔴 | Verificación npm bloqueante (spec `workspace`); si fallan, ESCALAR al product owner. NO sustituir por librerías alternativas por decisión propia. |
| **Algoritmo `task_kanban_order` no especificado en PRD** | 🟡 | Design elige half-step con rebalanceo (decisión §6.1 #2); documentado en `apps/api/src/application/tasks/move-task.ts` con comentarios inline + tests de rebalanceo. |
| **Concurrencia drag/drop simultáneo** | 🟡 | Last-write-wins MVP (§6.1 #3); documentar la limitación; tests cubren el caso "orden inconsistente → siguiente listTasks devuelve orden estable". |
| **Frontera `client` no entregada** | 🟡 | Default: lookup mínimo en este change (§6.1 #1); CRUD completo en change `clients`. Endpoints: `tasks.clients.listForSelector` (id + name). |
| **`/tasks-config` no está en `SHELL_ROUTES`** | 🟡 | Pregunta al product owner (§6.1 #5). Default sugerido: ruta sin item de nav, accedida por ruedita desde `/tasks`. |
| **Edición inline del título en kanban (PRD §8.3: "botón editar")** | 🟡 | Confirmar si es inline-edit en la card o navegación a `/tasks/:id`. Default sugerido: navegación a detalle (`/tasks/:id`) con botón "Editar" en la página de detalle. Inline-edit difiere. |
| **`task_description` con lexical — encoding** | 🟡 | Persistir el JSON de lexical serializado (no HTML) — más fácil de migrar después, evita XSS, soporta re-edición. El endpoint acepta string JSON. |
| **Catálogo i18n inflado** | 🟡 | Extender `es.json` con `tasks.*` agrupado (kanban, list, grid, detail, form, statuses, priorities, errors). El test de escaneo por glob detecta claves faltantes. |
| **SSR de `dnd-kit`** | 🟡 | El kanban es interactivo puro (drag & drop es client-side); el SSR puede renderizar el estado inicial sin DnD y el binding se monta client-side. Documentar la ausencia de drag en SSR (acorde al precedent del sidebar resizable — `defaultLayout` SSR estable). |
| **Snapshots de BaseView**: si se usa golden test para las 3 vistas | 🟢 | Diferir al change de data layer (PRD §9); este change solo tests unit + integración opt-in. |
| **Telemetría PII inadvertida** | 🟡 | Lint / grep en apply: ningún `attributes.title` ni `attributes.description`; solo IDs y categorías. |
| **Commit chaining rompe atomicidad** | 🟡 | Cada PR debe pasar `bun test` y mantener `bun dev` verde. El cambio de `SHELL_ROUTES` (si aplica) va en PR único. |

## 9. Estructura tentativa (para proposal, no implementación)

### Backend — `apps/api/src/`

```
domain/ports/
  ├─ task-state-repository.ts    # CRUD task_state
  ├─ task-repository.ts          # CRUD task + moveTask + listByColumn + rebalanceColumn
  ├─ attachment-repository.ts    # CRUD attachments (Fase 2: stub)
  └─ client-lookup-repository.ts # listForSelector (mínimo)

application/tasks/
  ├─ list-tasks.ts
  ├─ get-task.ts
  ├─ create-task.ts
  ├─ update-task.ts
  ├─ move-task.ts                # drag/drop cross-column + rebalanceo
  ├─ delete-task.ts
  ├─ list-task-states.ts
  ├─ create-task-state.ts
  ├─ update-task-state.ts
  ├─ delete-task-state.ts
  ├─ reorder-task-states.ts      # drag de columnas (orden)
  ├─ list-clients-for-selector.ts
  ├─ list-types-for-selector.ts  # tipos globales + del cliente
  ├─ list-categories-for-selector.ts  # categorías filtradas por tipo
  ├─ constants.ts                # KANBAN_GAP_REBALANCE_THRESHOLD = 1e-6, TASK_TITLE_MAX = 200
  ├─ errors.ts                   # TaskNotFound, TaskStateNotFound, InvalidKanbanOrder
  └─ *.test.ts                   # unit-first por cada caso de uso

infrastructure/kysely/
  ├─ database.ts                 # extiende DatabaseSchema con task_state? ya está, task, client, type_categories_client, attachments, task_attachments
  ├─ migrations/002_tasks.ts
  ├─ task-state-repository.ts
  ├─ task-repository.ts
  ├─ attachment-repository.ts
  ├─ client-lookup-repository.ts
  ├─ task-state-repository.integration.test.ts
  ├─ task-repository.integration.test.ts
  └─ test-cleanup.ts             # extender con cleanupTasksTables

http/
  ├─ composition-root.ts         # wirea nuevos casos de uso
  ├─ router.ts                   # extiende tasks contract
  ├─ tasks/tasks-routes.ts       # handlers orpc
  └─ tasks/tasks-routes.test.ts  # unit del routing (mockeando casos de uso)
```

### Backend — `packages/types/src/contracts/`

```
tasks.ts          # tasksContract (oc.prefix("/tasks").router({...}))
tasks.test.ts     # schemas: listTasksInput, createTaskInput, updateTaskInput, moveTaskInput, etc.
index.ts          # exporta tasksContract + authContract + healthContract
```

### Frontend — `apps/web/src/`

```
components/
  ├─ base-view/
  │   ├─ README.md             # actualizar con el contrato real
  │   ├─ base-view.tsrx        # componente principal con views filter
  │   ├─ base-view.test.ts     # unit del switch de vistas (sin DOM)
  │   └─ views/{grid,list,kanban}.tsrx  # implementaciones de cada vista
  ├─ vendor/
  │   ├─ dnd-kit/              # wrapper de @octanejs/dnd-kit
  │   │   ├─ README.md
  │   │   ├─ index.ts
  │   │   └─ dnd-context.tsrx
  │   └─ lexical/              # wrapper de @octanejs/lexical
  │       ├─ README.md
  │       ├─ index.ts
  │       └─ rich-text-editor.tsrx
  ├─ molecules/
  │   ├─ task-state-badge.tsrx
  │   ├─ task-priority-badge.tsrx
  │   ├─ task-type-icon.tsrx   # mini wrapper del Icon del wrapper
  │   └─ search-input.tsrx     # input + debounce (cohorte hooks host-safe)
  ├─ organisms/
  │   ├─ task-form/            # formulario lateral derecho
  │   │   ├─ task-form.tsrx
  │   │   └─ task-form.logic.ts
  │   ├─ task-card.tsrx        # card usada por grilla + kanban
  │   ├─ task-kanban-column.tsrx
  │   ├─ task-kanban-board.tsrx # DndContext + columnas
  │   ├─ task-list-row.tsrx
  │   ├─ task-grid-card.tsrx
  │   └─ task-state-form/      # CRUD de estados (para /tasks-config)
  └─ pages/
      ├─ tasks-page.tsrx        # reemplaza placeholder
      ├─ task-detail-page.tsrx  # /tasks/:id
      └─ tasks-config-page.tsrx # /tasks-config (CRUD estados)

lib/
  ├─ api/rpc.ts                 # cliente multi-contract
  ├─ tasks/                     # adapter de dominio (xstate opcional para el form)
  └─ validation/task.ts         # validadores (título no vacío, max 200, etc.)

routes/
  ├─ tasks.tsrx                 # reemplaza el placeholder
  ├─ tasks-config.tsrx          # nueva ruta del shell (sin item de nav)
  └─ (la ruta dinámica /tasks/:id requiere `:` pattern — confirmar con Octane)

octane.config.ts                # registra /tasks-config como shellRoute (si aplica)
```

### Frontend — i18n

```
lib/i18n/locales/es.json        # agregar sección tasks.*
  tasks:
    page:
      title: "Tareas"
      newTask: "Nueva tarea"
      configTooltip: "Configurar estados"
    search:
      placeholder: "Buscar tareas…"
    views:
      list: "Lista"
      grid: "Grilla"
      kanban: "Kanban"
    state:
      empty: "No hay tareas"
      moveToStart: "Mover al inicio"
      moveToEnd: "Mover al final"
    card:
      edit: "Editar"
      delete: "Eliminar"
      noDescription: "Sin descripción"
      noClient: "Sin cliente"
      noCategory: "Sin categoría"
    form:
      titleLabel: "Título"
      titlePlaceholder: "¿Qué necesitas hacer?"
      titleRequired: "El título es obligatorio."
      descriptionLabel: "Descripción"
      descriptionPlaceholder: "Detalles, contexto, links…"
      clientLabel: "Cliente"
      clientNone: "Sin cliente"
      typeLabel: "Tipo"
      typeRequired: "El tipo es obligatorio."
      categoryLabel: "Categoría"
      categoryDisabled: "Elegí un tipo primero."
      priorityLabel: "Prioridad"
      attachmentsLabel: "Adjuntos"
      attachmentsDisabled: "Los adjuntos llegan en una próxima entrega."
      submit: "Crear tarea"
      submitUpdate: "Guardar cambios"
      cancel: "Cancelar"
    statuses:
      label: "Estados"
      add: "Nuevo estado"
      edit: "Editar estado"
      delete: "Eliminar estado"
      deleteConfirm: "¿Eliminar este estado? Las tareas en este estado no se borran, pero quedan sin estado válido."
    errors:
      notFound: "No encontramos esa tarea."
      loadFailed: "No pudimos cargar las tareas. Reintentá."
      saveFailed: "No pudimos guardar los cambios."
      moveFailed: "No pudimos mover la tarea. Reintentá."
      invalidKanbanOrder: "El orden se actualizó. Refrescá la página."
```

## 10. Skill resolution

`none` — exploración read-only de repo; no se inyectaron paths de skills por el
padre y ninguna skill especializada era requerida para esta fase. La
exploración se apoya en el precedent archivado (`backend-auth`,
`theme-quieter-minimalist`, `frontend-foundation`, `transactional-email`)
como cuerpo de decisiones vinculantes.

## 11. Lo que la fase siguiente (proposal) debe llevar al product owner

1. **Confirmación del alcance de `client`** (§6.1 #1): ¿se entrega el CRUD
   mínimo de clientes para el dropdown, o se coordina con el change
   `clients` siguiente? (Default: lookup mínimo `listForSelector` en este
   change; CRUD completo en `clients`.)
2. **Confirmación del algoritmo `task_kanban_order`** (§6.1 #2):
   half-step con rebalanceo vs sparse integers vs lexorank. (Default:
   half-step con rebalanceo.)
3. **Confirmación de `/tasks-config` en el nav** (§6.1 #5): ¿la ruta
   `/tasks-config` aparece en el sidebar como sub-item de Tasks, como ruta
   accesible solo desde la ruedita, o no se incluye en el nav? (Default:
   ruta sin item de nav, accedida por la ruedita desde `/tasks`.)
4. **Confirmación de edición inline en kanban** (PRD §8.3 "botón
   editar"): ¿inline-edit del título en la card kanban o navegación a
   `/tasks/:id` con botón Editar en la página de detalle? (Default:
   navegación a detalle.)
5. **Verificación npm bloqueante de `@octanejs/dnd-kit` y
   `@octanejs/lexical`**: si no existen en npm o sus peer deps chocan con
   `octane@0.2.3`, escalar al product owner antes de sustituir stack
   (spec `workspace` lo prohíbe por decisión propia).

## 12. Resumen ejecutivo

El change `tasks` es la primera pieza de negocio end-to-end sobre el
scaffolding consolidado. Su superficie es **grande pero coherente**:
replica 1:1 el patrón de `backend-auth` para el backend (puertos +
aplicación + infraestructura + migración + composición + router), extiende
el cliente RPC web con un segundo contrato, materializa el componente
`BaseView` prometido por el PRD §9 (con sus tres vistas), introduce dos
wrappers vendor nuevos (`dnd-kit` y `lexical`) para los bindings
diferidos con consumidor en este change, y reemplaza el placeholder
`/tasks` por una UI funcional con kanban drag/drop, grilla y lista. Los
riesgos principales son el tamaño (> 400 líneas, candidato a chaining
bajo `ask-on-risk`) y la verificación npm bloqueante de los dos
bindings nuevos (`@octanejs/dnd-kit`, `@octanejs/lexical`). La entrega
queda dentro del MVP Fase 1 del PRD; los adjuntos se materializan en el
schema pero NO en endpoints ni UI (Fase 2 explícita).
