# Design — tasks

> Fuente de verdad: `openspec/changes/tasks/proposal.md`, `explore.md`,
> `preproposal.md`, PRD §8.3 / §11 / §9 / §10 / §13. Baseline a preservar:
> `openspec/specs/api/spec.md`, `openspec/specs/web/spec.md`,
> `openspec/specs/web-shell/spec.md`, `openspec/specs/design-system/spec.md`,
> `openspec/specs/vendor-bindings/spec.md`. Precedente canónico:
> `openspec/changes/archive/2026-09-09-backend-auth/` (backend 1:1) y
> `frontend-foundation` (frontend 1:1).
>
> 8 decisiones de producto CONFIRMADAS (preproposal 2026-09-10) — no se
> re-preguntan: research lane unselected · `client` lookup only ·
> `task_kanban_order` half-step + rebalanceo `|gap| < 1e-6` · `/tasks-config`
> sin item de nav · edición navega a `/tasks/:id` · bindings dnd-kit/lexical
> con verificación npm bloqueante · adjuntos Fase 2 (tablas creadas, form
> deshabilitado, sin endpoint) · lista cerrada de verde (sin nuevos usos;
> colores kanban desde `task_state.tast_color`).
>
> Este artefacto resuelve los design flags D1–D10 y concreta file trees,
> contratos, migración, algoritmo kanban y gates de apply. **No se modifica
> código ni specs canónicas.**

---

## 1. Decisiones D1–D10

### D1 — RPC multi-contract shape

| Aspecto | Resolución |
| --- | --- |
| **Forma** | Cliente multi-contract (objeto de contratos) en `apps/web/src/lib/api/rpc.ts`. |
| **Namespaces** | `rpc.auth.*` (existente) y `rpc.tasks.*` (nuevo) + `rpc.tasks.clients.search` (lookups anidados en tasks, ver D10). |
| **Preserva `rpc.verifyOtp`?** | NO; el contrato actual `RpcClient = ContractRouterClient<typeof authContract>` se reemplaza. El adaptador `lib/otp/rpc-verifier.ts` debe migrar a `rpc.auth.verifyOtp.mutate(...)`. |
| **Razón** | Evita acoplar `lib/api/rpc.ts` a un solo contrato; permite que módulos futuros (`clients`, `finance`) agreguen `rpc.clients.*` / `rpc.finance.*` sin nuevos archivos de cliente. |
| **Trade-offs** | 1 cambio en `rpc-verifier.ts` (1 línea) y 1 test que ajuste el mock. |

**Rutas concretas (orpc `@orpc/contract` `oc.prefix`):**

```
POST /rpc/tasks/list                       GET  (lista filtrada por user)
GET  /rpc/tasks/:id
POST /rpc/tasks/create
POST /rpc/tasks/update
POST /rpc/tasks/move                       (cross-column + persist order)
POST /rpc/tasks/remove
POST /rpc/tasks/states/list
POST /rpc/tasks/states/create
POST /rpc/tasks/states/update
POST /rpc/tasks/states/remove
POST /rpc/tasks/states/reorder
POST /rpc/tasks/clients/search             (lookup D10, namespaced)
```

> NOTA: la tabla actual `router.ts` despacha por path manualmente; el cambio
> mantiene el patrón `path === "/rpc/auth/..."` y suma ramas por path para
> `/rpc/tasks/...` (sin introducir un segundo `RPCHandler` separado).

### D2 — BaseView contract

```ts
type ViewKind = "list" | "grid" | "kanban";

interface Filters { search?: string; }

interface BaseViewProps<F extends Filters, R> {
  id?: string;                    // default: useId()
  filters: F;                     // persistido en localStorage[`base-view:${id}`]
  records: R[];
  views?: ViewKind[];             // default: ["list","grid","kanban"]
  onFilterChange?: (next: F) => void;
  gridStructure: GridStructure<R>;   // ver §7
  listStructure: ListStructure<R>;   // ver §7
  kanbanStructure: KanbanStructure<R>; // ver §7
}
```

- Switch de vista es **estado interno** (`useState<ViewKind>`); el padre no lo
  controla (alineado con el precedent del sidebar collapse: estado local +
  persistencia localStorage).
- Filtros: `localStorage["base-view:" + (id ?? useId())] = JSON.stringify(filters)`
  (nueva clave namespaced; NO colisiona con `"crm-sidebar-layout"`).
- **Generalización (sin overrides por módulo):** la firma debe servir tal
  cual para `clients`, `finance` y futuros módulos. Si tasks necesita algo
  que la firma común no cubre, se **extiende** `F extends Filters` y se
  ajusta `BaseView` (no se hace fork por módulo).

### D3 — half-step kanban + rebalanceo

| Aspecto | Valor |
| --- | --- |
| Algoritmo base | `(prev + next) / 2` para mover entre dos adyacentes |
| Threshold | `KANBAN_GAP_REBALANCE_THRESHOLD = 1e-6` |
| Step de densificación | `KANBAN_DEFAULT_STEP = 1024` (gap inicial para append) |
| Helper API | `computeInsertOrder(prev, next)`, `shouldRebalance(gap)`, `rebalanceColumn(rows)` |
| Tests unit obligatorios | gap normal (sin rebalanceo), gap < 1e-6 (rebalanceo), insert al inicio, append (max+1024), mover entre columnas adyacentes, mover entre columnas distantes |

Pseudocódigo y constantes → ver §5.

### D4 — migración idempotente

- `002_tasks.ts` usa `CREATE TABLE IF NOT EXISTS` / `CREATE INDEX IF NOT
  EXISTS` en cada `sql\`...\`.execute(db)`.
- El kysely migrator nativo trackea versiones; la defensa en profundidad con
  `IF NOT EXISTS` evita fallos en re-ejecuciones accidentales.
- `down` documenta el orden inverso y está marcado como **destructivo** (solo
  stage-único, sin datos productivos aún).

### D5 — lexical serialization JSON

- `task_description` persiste el JSON serializado de lexical (`JSON.stringify(editorState)`),
  NO HTML.
- Schema zod: `taskDescriptionSchema = z.string().nullable()` (string libre
  con JSON interno; el wrapper `RichTextEditor` es responsable de
  parsear/serializar).
- Wrapper expone `onChange(jsonString)` + `defaultValue={JSON.parse(jsonString)}`.
- Razón: evita XSS en render futuro, soporta re-edición exacta del documento,
  payload estable, sin migraciones de formato.

### D6 — PII telemetry gate

| Permitido (atributos) | Prohibido |
| --- | --- |
| `task.task_id`, `task.task_tast_id`, `task.task_tast_id_from`, `task.task_tast_id_to` | `task.task_title` |
| `task.task_kanban_order`, `task.kanban_order_rebalanced` | `task.task_description` |
| `task_state.tast_id`, `task_state.tast_order` | `client.clie_name`, `client.clie_email` |
| `user.user_id` | cualquier email / título / descripción |
| `result.success`, `result.error_code` | nombres de adjuntos |

Spans: `task.create`, `task.update`, `task.move`, `task.delete`,
`task_state.create`, `task_state.reorder`. **Gate** → §11.

### D7 — i18n auto-detection

- `apps/web/src/lib/i18n/i18n.test.ts` ya escanea `src/**/*.{ts,tsrx}` y
  detecta claves `t("...")` ausentes del catálogo.
- Extender `apps/web/src/lib/i18n/locales/es.json` con la sección `tasks.*`
  completa antes del primer PR frontend (no se permite PR parcial).
- Sin cambios en el test: el glob ya cubre `.tsrx` (ver §10 lista de claves).

### D8 — SSR-stable kanban

- El kanban es interactivo puro: SSR renderiza **columnas + cards** sin
  `DndContext` activo (idéntico al precedent del sidebar resizable:
  `defaultLayout` SSR estable).
- El binding `@octanejs/dnd-kit` se monta tras hidratación dentro del
  cliente (octane `0.2.3` soporta `useEffect`-only mount sin mismatch).
- Sin `drag/drop` server-side; no hay ghost cards SSR.

### D9 — drag/drop concurrency

- **Last-write-wins MVP.** `MoveTask` lee el orden actual del target y
  sobrescribe; dos browsers simultáneos → el último PATCH gana.
- Limitación documentada en el JSDoc de `apps/api/src/application/tasks/move-task.ts`
  - README del wrapper `vendor/dnd-kit/`.
- El rebalanceo `|gap| < 1e-6` detecta naturalmente drift acumulado en el
  siguiente `ListTasks`.
- Fase 2: optimistic locking con `updated_at` o header `If-Match`.

### D10 — `client` lookup endpoint shape

```
POST /rpc/tasks/clients/search
  input : { query: string; limit?: number }   // limit default 20, max 50
  output: { clients: Array<{ clie_id, clie_name, clie_email }> }
```

- Filtro: `clie_user_id = active_session.user_id` y
  `clie_name ILIKE '%' || query || '%'` (substring case-insensitive sobre
  `clie_name`; opcionalmente `clie_email` si query contiene `@`).
- **Sin CRUD** (decisión confirmada). Solo lookup para el dropdown del form.
- Anidado bajo `/rpc/tasks/clients/search` (no hay namespace `/lookups`
  separado; mantiene el contrato plano y predecible).

---

## 2. Estructura backend (1:1 con `backend-auth`)

```
apps/api/src/
├── domain/ports/
│   ├── clock.ts                                 (existente, reutilizado)
│   ├── id-generator.ts                          (existente, reutilizado)
│   ├── transaction.ts                           (existente, reutilizado)
│   ├── transaction-manager.ts                   (existente, reutilizado)
│   ├── telemetry.ts                             (existente, reutilizado)
│   ├── task-state-repository.ts                 ← NUEVO
│   ├── task-repository.ts                       ← NUEVO  (moveTask, listByColumn, rebalanceColumn)
│   ├── attachment-repository.ts                 ← NUEVO  (stub Fase 2)
│   ├── client-lookup-repository.ts              ← NUEVO
│   ├── type-lookup-repository.ts                ← NUEVO
│   └── category-lookup-repository.ts            ← NUEVO
│
├── application/
│   ├── auth/…                                   (existente, intacto)
│   ├── health/…                                 (existente, intacto)
│   └── tasks/                                   ← NUEVO DIR
│       ├── constants.ts                         KANBAN_GAP_REBALANCE_THRESHOLD, KANBAN_DEFAULT_STEP, TASK_TITLE_MAX, TASK_DESCRIPTION_MAX
│       ├── errors.ts                            TaskNotFound, TaskStateNotFound, InvalidKanbanOrder, InvalidStateTransition, Unauthorized
│       ├── list-tasks.ts                        + list-tasks.test.ts
│       ├── get-task.ts                          + get-task.test.ts
│       ├── create-task.ts                       + create-task.test.ts
│       ├── update-task.ts                       + update-task.test.ts
│       ├── move-task.ts                         + move-task.test.ts     (drag/drop cross-column + rebalanceo)
│       ├── delete-task.ts                       + delete-task.test.ts
│       ├── list-task-states.ts                  + list-task-states.test.ts
│       ├── create-task-state.ts                 + create-task-state.test.ts
│       ├── update-task-state.ts                 + update-task-state.test.ts
│       ├── delete-task-state.ts                 + delete-task-state.test.ts
│       ├── reorder-task-states.ts               + reorder-task-states.test.ts
│       ├── list-clients-for-selector.ts         + list-clients-for-selector.test.ts
│       ├── list-types-for-form.ts               + list-types-for-form.test.ts
│       └── list-categories-by-type.ts           + list-categories-by-type.test.ts
│
├── infrastructure/
│   ├── kysely/
│   │   ├── database.ts                          (MODIFICADO: añade TaskTable, ClientTable, TypeCategoriesClientTable, AttachmentTable, TaskAttachmentsTable)
│   │   ├── migrate.ts                           (existente, intacto)
│   │   ├── test-cleanup.ts                      (MODIFICADO: añade cleanupTasksTables)
│   │   ├── transaction-manager.ts               (existente, intacto)
│   │   ├── user-repository.ts                   (existente, intacto)
│   │   ├── login-repository.ts                  (existente, intacto)
│   │   ├── session-repository.ts                (existente, intacto)
│   │   ├── email-sending-repository.ts          (existente, intacto)
│   │   ├── user-seed-service.ts                 (existente, intacto)
│   │   ├── task-state-repository.ts             ← NUEVO
│   │   ├── task-repository.ts                   ← NUEVO
│   │   ├── attachment-repository.ts             ← NUEVO  (stub Fase 2)
│   │   ├── client-lookup-repository.ts          ← NUEVO
│   │   ├── type-lookup-repository.ts            ← NUEVO
│   │   ├── category-lookup-repository.ts        ← NUEVO
│   │   ├── task-state-repository.integration.test.ts  ← NUEVO  (skipIf !databaseUrl)
│   │   ├── task-repository.integration.test.ts        ← NUEVO
│   │   └── migrations/
│   │       ├── 001_initial.ts                   (existente, intacto)
│   │       └── 002_tasks.ts                     ← NUEVO
│   ├── otel/…                                   (existente, intacto)
│   ├── crypto/…                                 (existente, intacto)
│   ├── time/…                                   (existente, intacto)
│   └── email/…                                  (existente, intacto)
│
└── http/
    ├── router.ts                                (MODIFICADO: añade ramas /rpc/tasks/**)
    ├── composition-root.ts                      (MODIFICADO: cablea tasks cases + lookups)
    ├── routes.ts                                (existente, intacto)
    ├── auth/…                                   (existente, intacto)
    └── tasks/                                   ← NUEVO DIR
        └── tasks-routes.ts                      (createListHandler, createGetHandler, …, mapping de errores)

packages/types/src/contracts/
├── auth.ts                                      (existente, intacto)
├── auth.test.ts                                 (existente, intacto)
├── health.ts                                    (existente, intacto)
├── tasks.ts                                     ← NUEVO  (tasksContract + tasks.test.ts con safeParse)
├── lookups.ts                                   ← NUEVO  (lookupsContract reusado bajo /rpc/tasks/clients; ver §6)
└── index.ts                                     (MODIFICADO: exporta tasks + lookups)
```

**Diffs clave de `composition-root.ts`** (forma):

```ts
// ANTES (extracto)
const requestOtp = new RequestOtp({ … });
const verifyOtp = new VerifyOtp({ … });
const getSession = new GetSession({ … });
const logout = new Logout({ … });

const rpcHandler = createRpcHandler({
  getHealth, requestOtp, verifyOtp, getSession, logout,
});

// DESPUÉS (extracto)
const taskStateRepository = new KyselyTaskStateRepository(db);
const taskRepository = new KyselyTaskRepository(db);
const attachmentRepository = new KyselyAttachmentRepository(db); // stub
const clientLookupRepository = new KyselyClientLookupRepository(db);
const typeLookupRepository = new KyselyTypeLookupRepository(db);
const categoryLookupRepository = new KyselyCategoryLookupRepository(db);

const listTasks = new ListTasks({ taskRepository, clock });
const getTask = new GetTask({ taskRepository });
const createTask = new CreateTask({ taskRepository, taskStateRepository, idGenerator, clock });
const updateTask = new UpdateTask({ taskRepository });
const moveTask = new MoveTask({ taskRepository, transactionManager });
const deleteTask = new DeleteTask({ taskRepository });
const listTaskStates = new ListTaskStates({ taskStateRepository });
const createTaskState = new CreateTaskState({ taskStateRepository, idGenerator, clock });
const updateTaskState = new UpdateTaskState({ taskStateRepository });
const deleteTaskState = new DeleteTaskState({ taskStateRepository });
const reorderTaskStates = new ReorderTaskStates({ taskStateRepository, transactionManager });
const listClientsForSelector = new ListClientsForSelector({ clientLookupRepository });
const listTypesForForm = new ListTypesForForm({ typeLookupRepository, clientLookupRepository });
const listCategoriesByType = new ListCategoriesByType({ categoryLookupRepository });

const rpcHandler = createRpcHandler({
  getHealth, requestOtp, verifyOtp, getSession, logout,
  listTasks, getTask, createTask, updateTask, moveTask, deleteTask,
  listTaskStates, createTaskState, updateTaskState, deleteTaskState, reorderTaskStates,
  listClientsForSelector, listTypesForForm, listCategoriesByType,
});
```

---

## 3. Estructura frontend (1:1 con `frontend-foundation`)

```
apps/web/src/
├── components/
│   ├── atoms/                                   (existentes: button, text-input, status-message, app-title, skip-link)
│   ├── molecules/                               (existentes: form-field, nav-group, nav-item, theme-toggle)
│   │   ├── task-state-badge.tsrx                ← NUEVO
│   │   ├── task-priority-badge.tsrx             ← NUEVO
│   │   ├── task-type-icon.tsrx                  ← NUEVO  (mini wrapper del Icon vendor)
│   │   └── search-input.tsrx                    ← NUEVO  (input + useDebounceValue host-safe)
│   ├── organisms/
│   │   ├── login-form/…                         (existente, intacto)
│   │   ├── otp-form/…                           (existente, intacto)
│   │   ├── sidebar-nav/…                        (existente, intacto)
│   │   ├── task-form/                           ← NUEVO DIR
│   │   │   ├── task-form.tsrx
│   │   │   └── task-form.logic.ts               (useState puro; sin xstate — ver §5 D3)
│   │   ├── task-card.tsrx                       ← NUEVO  (grilla + kanban)
│   │   ├── task-kanban-column.tsrx              ← NUEVO
│   │   ├── task-kanban-board.tsrx               ← NUEVO  (DndContext + drop handlers → rpc.tasks.move)
│   │   ├── task-list-row.tsrx                   ← NUEVO
│   │   ├── task-grid-card.tsrx                  ← NUEVO
│   │   └── task-state-form/                     ← NUEVO DIR (CRUD estados para /tasks-config)
│   ├── pages/
│   │   ├── login-page.tsrx                      (existente, intacto)
│   │   ├── login-verification-page.tsrx         (existente, intacto)
│   │   ├── placeholder-page.tsrx                (existente, intacto; sigue siendo usado por rutas no-tasks del shell)
│   │   ├── tasks-page.tsrx                      ← NUEVO  (reemplaza placeholder para /tasks)
│   │   ├── task-detail-page.tsrx                ← NUEVO  (para /tasks/:id)
│   │   └── tasks-config-page.tsrx               ← NUEVO  (para /tasks-config)
│   ├── base-view/
│   │   ├── README.md                            (MODIFICADO: documenta contrato real)
│   │   ├── base-view.tsrx                       ← NUEVO  (componente compartido)
│   │   ├── base-view.test.ts                    ← NUEVO  (unit del switch de vista, TS puro)
│   │   └── views/                               ← NUEVO DIR
│   │       ├── grid.tsrx
│   │       ├── list.tsrx
│   │       └── kanban.tsrx
│   └── vendor/
│       ├── i18n/…                               (existente, intacto)
│       ├── icons/…                              (existente, intacto)
│       ├── otp-input/…                          (existente, intacto)
│       ├── resizable/…                          (existente, intacto)
│       ├── toast/…                              (existente, intacto)
│       ├── hooks/…                              (existente, intacto)
│       ├── dnd-kit/                             ← NUEVO DIR  (wrapper @octanejs/dnd-kit)
│       │   ├── README.md
│       │   ├── index.ts
│       │   └── dnd-context.tsrx
│       └── lexical/                             ← NUEVO DIR  (wrapper @octanejs/lexical; alias rich-text-editor)
│           ├── README.md
│           ├── index.ts
│           └── rich-text-editor.tsrx
│
├── lib/
│   ├── api/rpc.ts                               (MODIFICADO: cliente multi-contract; ver §6)
│   ├── otp/                                     (MODIFICADO: rpc-verifier.ts usa rpc.auth.verifyOtp.mutate)
│   ├── i18n/locales/es.json                     (MODIFICADO: añade tasks.*; ver §10)
│   ├── validation/
│   │   ├── email.ts                             (existente, intacto)
│   │   └── task.ts                              ← NUEVO  (taskTitleRequired, taskDescriptionLength)
│   └── tasks/
│       ├── tasks-kanban.ts                      ← NUEVO  (sortByOrder, moveItem, helpers cliente)
│       ├── tasks-form.ts                        ← NUEVO  (mappers input ↔ entity; reset deps por cliente/tipo)
│       └── xstate-task-form.ts                  ← DIFERIDO (no se usa; ver §5 D3)
│
└── routes/
    ├── __app-shell.tsrx                         (existente, intacto)
    ├── __auth.tsrx                              (existente, intacto)
    ├── index.tsrx                               (existente, intacto)
    ├── login.tsrx                               (existente, intacto)
    ├── login-verification.tsrx                  (existente, intacto)
    ├── dashboard.tsrx                           (existente, intacto)
    ├── schedules.tsrx                           (existente, intacto; placeholder)
    ├── clients.tsrx                             (existente, intacto; placeholder)
    ├── incomes.tsrx                             (existente, intacto; placeholder)
    ├── expenses.tsrx                            (existente, intacto; placeholder)
    ├── transfers.tsrx                           (existente, intacto; placeholder)
    ├── config.tsrx                              (existente, intacto; placeholder)
    ├── tasks.tsrx                               (MODIFICADO: reemplaza placeholder por TasksRoute real)
    ├── tasks-config.tsrx                        ← NUEVO  (ruta SIN item de nav en SHELL_ROUTES)
    └── tasks/$id.tsrx                           ← NUEVO  (detalle; edición con botón Editar)

apps/web/
└── octane.config.ts                             (MODIFICADO: registra tasks-config y tasks/:id; ver §3.1)
```

### 3.1 Registro de rutas (octane.config.ts diff)

```ts
// DESPUÉS — extract
const SHELL_ROUTES = [/* sin cambios: las 8 rutas canónicas */] as const;

const EXTRA_SHELL_ROUTES = [
  "/tasks-config",   // sin nav-item; acceso por ruedita desde /tasks
  "/tasks/:id",      // detalle; navegación desde cards
] as const;

export default defineConfig({
  router: {
    routes: [
      // … rutas existentes sin cambios
      ...SHELL_ROUTES.map((path) => shellRoute(path, shellEntry(path))),
      // NUEVO: rutas extra del shell (mismo layout + guard)
      ...EXTRA_SHELL_ROUTES.map((path) => shellRoute(path, shellEntry(path))),
      // … rutas de auth sin cambios
    ],
  },
});
```

- `SHELL_ROUTES` **NO** se modifica (constraint: árbol §7 intacto; decisión
  CONFIRMADA "ruta sin nav-item, accedida por ruedita").
- `/tasks-config` y `/tasks/:id` heredan `before: [requireSession]` del
  helper `shellRoute` (punto único del guard; no se duplica).
- El test `tree.test.ts` sigue verde porque `SHELL_ROUTES` no cambia.

### 3.2 Atomic design — reglas reforzadas

- `components/pages/` contiene solo páginas (`TasksPage`, `TaskDetailPage`,
  `TasksConfigPage`).
- `components/organisms/` contiene organismos (form, cards, board).
- `components/molecules/` contiene piezas reusables (`task-state-badge`,
  `search-input`).
- `components/atoms/` no se modifica.
- `templates/` sigue vacío (`.gitkeep`); no se introduce nada.

### 3.3 `BaseView` materializado

- Archivo: `apps/web/src/components/base-view/base-view.tsrx`.
- Switch de vista interno (`useState<ViewKind>`); persistencia de filtros
  en `localStorage["base-view:" + id]`.
- Vistas (`views/{list,grid,kanban}.tsrx`) reciben `records` + la `structure`
  correspondiente del padre y renderizan.
- Sin tests DOM (diferidos al primer change con DOM tests — precedent
  `frontend-foundation` mantiene unit-first TS puro).
- Ejemplo de uso (`apps/web/src/components/pages/tasks-page.tsrx`):

```tsx
<BaseView
  id="tasks-list"
  filters={{ search }}
  records={tasks}
  views={["list", "grid", "kanban"]}
  gridStructure={{ card: TaskGridCard, columns: 3 }}
  listStructure={{ row: TaskListRow }}
  kanbanStructure={{ board: TaskKanbanBoard, card: TaskCard }}
  onFilterChange={setFilters}
/>
```

---

## 4. Migración `002_tasks.ts`

```ts
import { sql, type Kysely } from "kysely";

export async function up(db: Kysely<unknown>): Promise<void> {
  // 1. client (nullable FK target de task.task_clie_id)
  await sql`
    CREATE TABLE IF NOT EXISTS client (
      clie_id UUID PRIMARY KEY,
      clie_user_id UUID NOT NULL REFERENCES "user"(user_id),
      clie_name TEXT NOT NULL,
      clie_email TEXT,
      clie_areaphone TEXT,
      clie_phone TEXT,
      clie_created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      clie_updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      clie_deleted_at TIMESTAMPTZ
    )
  `.execute(db);

  await sql`
    CREATE INDEX IF NOT EXISTS idx_client_user
      ON client (clie_user_id) WHERE clie_deleted_at IS NULL
  `.execute(db);

  // 2. type_categories_client (join table; NULL = GLOBAL)
  await sql`
    CREATE TABLE IF NOT EXISTS type_categories_client (
      tccl_id UUID PRIMARY KEY,
      tccl_user_id UUID NOT NULL REFERENCES "user"(user_id),
      tccl_type_id UUID NOT NULL REFERENCES types(type_id),
      tccl_cate_id UUID NOT NULL REFERENCES categories(cate_id),
      tccl_clie_id UUID REFERENCES client(clie_id),
      tccl_created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      tccl_updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      tccl_deleted_at TIMESTAMPTZ,
      CONSTRAINT uq_tccl_combo UNIQUE NULLS NOT DISTINCT
        (tccl_user_id, tccl_type_id, tccl_cate_id, tccl_clie_id)
    )
  `.execute(db);

  // 3. attachments (Fase 2 — tablas creadas; sin endpoint en MVP)
  await sql`
    CREATE TABLE IF NOT EXISTS attachments (
      atta_id UUID PRIMARY KEY,
      atta_user_id UUID NOT NULL REFERENCES "user"(user_id),
      atta_s3id TEXT NOT NULL,
      atta_title TEXT NOT NULL,
      atta_format TEXT NOT NULL,
      atta_created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      atta_updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      atta_deleted_at TIMESTAMPTZ
    )
  `.execute(db);

  // 4. task_attachments (Fase 2 — join table; PK compuesta)
  await sql`
    CREATE TABLE IF NOT EXISTS task_attachments (
      taat_task_id UUID NOT NULL REFERENCES task(task_id),
      taat_atta_id UUID NOT NULL REFERENCES attachments(atta_id),
      taat_created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      PRIMARY KEY (taat_task_id, taat_atta_id)
    )
  `.execute(db);

  // 5. task (núcleo del change)
  await sql`
    CREATE TABLE IF NOT EXISTS task (
      task_id UUID PRIMARY KEY,
      task_user_id UUID NOT NULL REFERENCES "user"(user_id),
      task_title TEXT NOT NULL,
      task_description TEXT,
      task_clie_id UUID REFERENCES client(clie_id),
      task_type_id UUID NOT NULL REFERENCES types(type_id),
      task_cate_id UUID REFERENCES categories(cate_id),
      task_tast_id UUID NOT NULL REFERENCES task_state(tast_id),
      task_kanban_order DOUBLE PRECISION NOT NULL DEFAULT 0,
      task_created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      task_updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      task_deleted_at TIMESTAMPTZ
    )
  `.execute(db);

  await sql`
    CREATE INDEX IF NOT EXISTS idx_task_user
      ON task (task_user_id) WHERE task_deleted_at IS NULL
  `.execute(db);

  // kanban ordering index (PRD §11)
  await sql`
    CREATE INDEX IF NOT EXISTS idx_task_kanban
      ON task (task_user_id, task_tast_id, task_kanban_order)
  `.execute(db);
}

export async function down(db: Kysely<unknown>): Promise<void> {
  // DESTRUCTIVO — solo stage-único, sin datos productivos.
  // Orden inverso al de creación, respetando FKs.
  await sql`DROP TABLE IF EXISTS task_attachments`.execute(db);
  await sql`DROP TABLE IF EXISTS attachments`.execute(db);
  await sql`DROP TABLE IF EXISTS task`.execute(db);
  await sql`DROP TABLE IF EXISTS type_categories_client`.execute(db);
  await sql`DROP TABLE IF EXISTS client`.execute(db);
  // task_state NO se dropea aquí: existe desde 001_initial.ts.
}
```

**Notas:**

- `task_state` ya existe (creado en `001_initial.ts` — decisión del precedent
  `backend-auth`); esta migración **no** lo recrea ni lo altera. Si en el
  futuro el seed debe incluir `tast_color` / `tast_icono` (PRD §11 los
  define pero la implementación actual solo tiene `tast_name` + `tast_order`),
  el cambio se materializa con `ALTER TABLE` en una migración posterior —
  **fuera del scope** de este change (decisión: NO tocar el schema seed para
  evitar romper el wiring existente; el seed inicial del precedent crea los
  3 estados con `tast_name` y `tast_order`; los nuevos campos son opcionales
  y se rellenan en una migración `003_task_state_columns.ts` separada si
  surge la necesidad). Para MVP el form de estado (`task-state-form`) trabaja
  con `tast_name` + `tast_order` (sin color picker; la "columna color" del
  kanban se difiere a Fase 2 junto con el wrapper `@octanejs/colorful`).
- `attachments` y `task_attachments` se crean ahora (PRD §13 — "tablas
  intermedias ya están en el schema para no migrar después"); ningún endpoint
  las consume en MVP.
- `task.task_kanban_order` es `DOUBLE PRECISION` (PRD §11); DEFAULT `0` para
  filas seedadas manualmente; las inserciones reales asignan orden explícito.
- FKs del hijo al padre (PRD §11 convención 6) verificadas.
- Idempotencia por `IF NOT EXISTS` (D4).

### 4.1 `DatabaseSchema` extensión (kysely)

```ts
// apps/api/src/infrastructure/kysely/database.ts — añadidos
export interface ClientTable {
  clie_id: string;
  clie_user_id: string;
  clie_name: string;
  clie_email: string | null;
  clie_areaphone: string | null;
  clie_phone: string | null;
  clie_created_at: Generated<Date>;
  clie_updated_at: Generated<Date>;
  clie_deleted_at: Date | null;
}
export interface TypeCategoriesClientTable {
  tccl_id: string;
  tccl_user_id: string;
  tccl_type_id: string;
  tccl_cate_id: string;
  tccl_clie_id: string | null;
  tccl_created_at: Generated<Date>;
  tccl_updated_at: Generated<Date>;
  tccl_deleted_at: Date | null;
}
export interface AttachmentTable {
  atta_id: string;
  atta_user_id: string;
  atta_s3id: string;
  atta_title: string;
  atta_format: string;
  atta_created_at: Generated<Date>;
  atta_updated_at: Generated<Date>;
  atta_deleted_at: Date | null;
}
export interface TaskAttachmentsTable {
  taat_task_id: string;
  taat_atta_id: string;
  taat_created_at: Generated<Date>;
}
export interface TaskTable {
  task_id: string;
  task_user_id: string;
  task_title: string;
  task_description: string | null;
  task_clie_id: string | null;
  task_type_id: string;
  task_cate_id: string | null;
  task_tast_id: string;
  task_kanban_order: number;       // double precision mapea a number
  task_created_at: Generated<Date>;
  task_updated_at: Generated<Date>;
  task_deleted_at: Date | null;
}

// DatabaseSchema (diff)
task: TaskTable;                  // NUEVO
client: ClientTable;              // NUEVO
type_categories_client: TypeCategoriesClientTable;  // NUEVO
attachments: AttachmentTable;     // NUEVO
task_attachments: TaskAttachmentsTable;  // NUEVO
```

### 4.2 `test-cleanup.ts` extensión

```ts
// apps/api/src/infrastructure/kysely/test-cleanup.ts — añadido
export async function cleanupTasksTables(db: Database): Promise<void> {
  await db.deleteFrom("task_attachments").execute();
  await db.deleteFrom("attachments").execute();
  await db.deleteFrom("task").execute();
  await db.deleteFrom("type_categories_client").execute();
  await db.deleteFrom("client").execute();
}
```

`cleanupAuthTables` se mantiene intacto (no rompe contratos).

---

## 5. Algoritmo kanban

### 5.1 Constantes (`apps/api/src/application/tasks/constants.ts`)

```ts
export const KANBAN_DEFAULT_STEP = 1024;
export const KANBAN_GAP_REBALANCE_THRESHOLD = 1e-6;
export const TASK_TITLE_MAX = 200;
export const TASK_DESCRIPTION_MAX = 50_000;
```

### 5.2 Helpers puros (`apps/api/src/application/tasks/move-task.ts`)

```ts
/**
 * Half-step kanban ordering con rebalanceo.
 *
 * - Insert entre A y B: nueva posición = (A + B) / 2.
 * - Append (al final): nueva posición = max(existing) + KANBAN_DEFAULT_STEP.
 * - Prepend (al inicio): nueva posición = min(existing) / 2 (caso
 *   asimétrico; documentado en §D3).
 * - Si |gap| resultante < KANBAN_GAP_REBALANCE_THRESHOLD, se llama
 *   rebalanceColumn() y se re-asignan los órdenes como múltiplos de
 *   KANBAN_DEFAULT_STEP antes de aplicar el move.
 */

import {
  KANBAN_DEFAULT_STEP,
  KANBAN_GAP_REBALANCE_THRESHOLD,
} from "./constants";

export interface OrderedRow {
  id: string;
  order: number;
}

export function computeInsertOrder(prev: number, next: number): number {
  return (prev + next) / 2;
}

export function shouldRebalance(gap: number): boolean {
  return Math.abs(gap) < KANBAN_GAP_REBALANCE_THRESHOLD;
}

/** Densifica una columna asignando múltiplos de KANBAN_DEFAULT_STEP. */
export function rebalanceColumn<T extends OrderedRow>(rows: T[]): T[] {
  const sorted = [...rows].sort((a, b) => a.order - b.order);
  return sorted.map((row, i) => ({ ...row, order: (i + 1) * KANBAN_DEFAULT_STEP }));
}

/** Insert al final: max(existing) + step. Si la columna está vacía → step. */
export function appendOrder(rows: OrderedRow[]): number {
  if (rows.length === 0) return KANBAN_DEFAULT_STEP;
  const max = Math.max(...rows.map((r) => r.order));
  return max + KANBAN_DEFAULT_STEP;
}

/** Insert al inicio: min(existing) / 2. */
export function prependOrder(rows: OrderedRow[]): number {
  if (rows.length === 0) return KANBAN_DEFAULT_STEP;
  const min = Math.min(...rows.map((r) => r.order));
  return min / 2;
}

/** Decide si el move requiere rebalanceo antes de aplicar. */
export function planMove(
  column: OrderedRow[],
  prev: OrderedRow | null,
  next: OrderedRow | null,
): { order: number; rebalance: OrderedRow[] | null } {
  const order =
    prev === null ? prependOrder(column) :
    next === null ? appendOrder(column) :
    computeInsertOrder(prev.order, next.order);

  if (prev !== null && next !== null && shouldRebalance(next.order - prev.order)) {
    return { order, rebalance: rebalanceColumn(column) };
  }
  return { order, rebalance: null };
}
```

### 5.3 Pseudocódigo de `MoveTask.execute`

```
fn execute({ taskId, targetStateId, kanbanOrder?, prevId?, nextId? }):
  with trx = transactionManager.run():
    task = taskRepo.findById(taskId, trx)
    if !task: throw TaskNotFound

    if task.task_tast_id != targetStateId:
      // cross-column: cambiar estado
      targetState = taskStateRepo.findById(targetStateId, trx)
      if !targetState: throw TaskStateNotFound
      task.task_tast_id = targetStateId

    // columna destino (excluyendo la task actual)
    column = taskRepo.listByColumn(task.task_user_id, task.task_tast_id, trx)
               .filter(r => r.id != taskId)

    plan = planMove(column, prev, next)

    if plan.rebalance != null:
      taskRepo.persistOrders(plan.rebalance, trx)
      telemetry.startSpan("task.move", {
        "task.kanban_order_rebalanced": true,
        "task.task_id": taskId,
        "task.task_tast_id_from": task.task_tast_id,
        "task.task_tast_id_to": targetStateId,
      })

    task.task_kanban_order = plan.order
    taskRepo.update(task, trx)

    telemetry.startSpan("task.move", {
      "task.task_id": taskId,
      "task.task_tast_id": targetStateId,
      "result.success": true,
    })

  return task
```

### 5.4 Tests unitarios obligatorios

| Test | Cubre |
| --- | --- |
| `move-task.test.ts` · gap normal entre A y B | `computeInsertOrder` = (A+B)/2; `shouldRebalance` false; no rebalance |
| `move-task.test.ts` · gap `< 1e-6` | `shouldRebalance` true; rebalancea a múltiplos de 1024 |
| `move-task.test.ts` · append al final | `appendOrder` = max + 1024 |
| `move-task.test.ts` · prepend al inicio | `prependOrder` = min / 2 |
| `move-task.test.ts` · cross-column | estado actualizado + orden estable |
| `create-task.test.ts` · append | `task_kanban_order` = max + 1024 (sin rebalanceo) |
| `task-state-form` integration · reorder | `ReorderTaskStates` aplica el nuevo `tast_order` atómicamente |

`apps/api/src/infrastructure/kysely/task-repository.integration.test.ts` cubre
la persistencia end-to-end (postgres opt-in): cross-column persiste estado
y orden; rebalanceo se aplica y el siguiente `listByColumn` devuelve orden
estable.

---

## 6. RPC multi-contract shape (D1 — detallado)

### 6.1 Contratos (`packages/types/src/contracts/tasks.ts`)

```ts
import { oc } from "@orpc/contract";
import { z } from "zod";

// --- Schemas ---

export const uuidSchema = z.string().uuid();
export const taskTitleSchema = z.string().min(1).max(200);
export const taskDescriptionSchema = z.string().max(50_000).nullable();
export const kanbanOrderSchema = z.number().finite();
export const taskStateTitleSchema = z.string().min(1).max(50);
export const tastOrderSchema = z.number().int().nonnegative();

export const taskSchema = z.object({
  task_id: uuidSchema,
  task_user_id: uuidSchema,
  task_title: taskTitleSchema,
  task_description: taskDescriptionSchema,
  task_clie_id: uuidSchema.nullable(),
  task_type_id: uuidSchema,
  task_cate_id: uuidSchema.nullable(),
  task_tast_id: uuidSchema,
  task_kanban_order: kanbanOrderSchema,
  task_created_at: z.string(), // ISO
  task_updated_at: z.string(),
});
export type Task = z.infer<typeof taskSchema>;

export const taskStateSchema = z.object({
  tast_id: uuidSchema,
  tast_user_id: uuidSchema,
  tast_name: taskStateTitleSchema,
  tast_order: tastOrderSchema,
});
export type TaskState = z.infer<typeof taskStateSchema>;

// --- Inputs/Outputs ---

export const listTasksInputSchema = z.object({
  search: z.string().optional(),
});
export const listTasksOutputSchema = z.object({ tasks: z.array(taskSchema) });

export const getTaskInputSchema = z.object({ task_id: uuidSchema });
export const getTaskOutputSchema = z.object({ task: taskSchema });

export const createTaskInputSchema = z.object({
  task_title: taskTitleSchema,
  task_description: taskDescriptionSchema,
  task_clie_id: uuidSchema.nullable().optional(),
  task_type_id: uuidSchema,
  task_cate_id: uuidSchema.nullable().optional(),
  task_tast_id: uuidSchema.optional(),   // default: seed state "Pendiente"
});
export const createTaskOutputSchema = z.object({ task: taskSchema });

export const updateTaskInputSchema = z.object({
  task_id: uuidSchema,
  task_title: taskTitleSchema.optional(),
  task_description: taskDescriptionSchema.optional(),
  task_clie_id: uuidSchema.nullable().optional(),
  task_type_id: uuidSchema.optional(),
  task_cate_id: uuidSchema.nullable().optional(),
});
export const updateTaskOutputSchema = z.object({ task: taskSchema });

export const moveTaskInputSchema = z.object({
  task_id: uuidSchema,
  target_state_id: uuidSchema,
  prev_task_id: uuidSchema.nullable().optional(),
  next_task_id: uuidSchema.nullable().optional(),
});
export const moveTaskOutputSchema = z.object({ task: taskSchema });

export const removeTaskInputSchema = z.object({ task_id: uuidSchema });
export const removeTaskOutputSchema = z.object({ ok: z.literal(true) });

// --- Task state ---

export const listTaskStatesOutputSchema = z.object({ states: z.array(taskStateSchema) });

export const createTaskStateInputSchema = z.object({
  tast_name: taskStateTitleSchema,
  tast_order: tastOrderSchema.optional(), // default: max+1
});
export const createTaskStateOutputSchema = z.object({ state: taskStateSchema });

export const updateTaskStateInputSchema = z.object({
  tast_id: uuidSchema,
  tast_name: taskStateTitleSchema.optional(),
  tast_order: tastOrderSchema.optional(),
});
export const updateTaskStateOutputSchema = z.object({ state: taskStateSchema });

export const removeTaskStateInputSchema = z.object({ tast_id: uuidSchema });
export const removeTaskStateOutputSchema = z.object({ ok: z.literal(true) });

export const reorderTaskStatesInputSchema = z.object({
  items: z.array(z.object({ tast_id: uuidSchema, tast_order: tastOrderSchema })).min(1),
});
export const reorderTaskStatesOutputSchema = z.object({ states: z.array(taskStateSchema) });

// --- Contract ---

export const tasksContract = oc.prefix("/tasks").router({
  list:       oc.route({ method: "POST", path: "/list" })
                .input(listTasksInputSchema).output(listTasksOutputSchema),
  get:        oc.route({ method: "POST", path: "/get" })
                .input(getTaskInputSchema).output(getTaskOutputSchema),
  create:     oc.route({ method: "POST", path: "/create" })
                .input(createTaskInputSchema).output(createTaskOutputSchema),
  update:     oc.route({ method: "POST", path: "/update" })
                .input(updateTaskInputSchema).output(updateTaskOutputSchema),
  move:       oc.route({ method: "POST", path: "/move" })
                .input(moveTaskInputSchema).output(moveTaskOutputSchema),
  remove:     oc.route({ method: "POST", path: "/remove" })
                .input(removeTaskInputSchema).output(removeTaskOutputSchema),
  states: oc.prefix("/states").router({
    list:    oc.route({ method: "POST", path: "/list" })
               .output(listTaskStatesOutputSchema),
    create:  oc.route({ method: "POST", path: "/create" })
               .input(createTaskStateInputSchema).output(createTaskStateOutputSchema),
    update:  oc.route({ method: "POST", path: "/update" })
               .input(updateTaskStateInputSchema).output(updateTaskStateOutputSchema),
    remove:  oc.route({ method: "POST", path: "/remove" })
               .input(removeTaskStateInputSchema).output(removeTaskStateOutputSchema),
    reorder: oc.route({ method: "POST", path: "/reorder" })
               .input(reorderTaskStatesInputSchema).output(reorderTaskStatesOutputSchema),
  }),
  clients: oc.prefix("/clients").router({
    search:  oc.route({ method: "POST", path: "/search" })
               .input(z.object({ query: z.string().min(1), limit: z.number().int().min(1).max(50).default(20) }))
               .output(z.object({ clients: z.array(z.object({
                 clie_id: uuidSchema, clie_name: z.string(), clie_email: z.string().nullable(),
               })) })),
  }),
});
```

> Notas:
>
> - El router actual `createRpcHandler` despacha por path manualmente;
>   `tasksContract` se **mantiene como contrato tipado** para el cliente web,
>   pero los handlers HTTP siguen siendo funciones explícitas por path
>   (mismo patrón que auth). Esto preserva la consistencia con `backend-auth`
>   y evita introducir un segundo `RPCHandler`.
> - El router anidado `tasks.states.*` produce paths: `/rpc/tasks/states/list`,
>   `/rpc/tasks/states/reorder`, etc. (orpc `oc.prefix`).
> - El router anidado `tasks.clients.search` produce path
>   `/rpc/tasks/clients/search` (D10).

### 6.2 `lookups.ts` (no usado como namespace separado; clientes vive bajo `tasks.clients`)

```ts
// packages/types/src/contracts/lookups.ts
import { oc } from "@orpc/contract";
import { z } from "zod";
import { uuidSchema } from "./tasks";

export const typeForFormSchema = z.object({
  type_id: uuidSchema,
  type_name: z.string(),
});

export const listTypesForFormInputSchema = z.object({
  clie_id: uuidSchema.nullable().optional(),
});
export const listTypesForFormOutputSchema = z.object({ types: z.array(typeForFormSchema) });

export const categoryForFormSchema = z.object({
  cate_id: uuidSchema,
  cate_name: z.string(),
});

export const listCategoriesByTypeInputSchema = z.object({ type_id: uuidSchema });
export const listCategoriesByTypeOutputSchema = z.object({ categories: z.array(categoryForFormSchema) });

// NOTA: lookupsContract NO se exporta como router con prefix propio.
// Sus endpoints se montan directamente bajo tasksContract (ver §6.1)
// para mantener paths planos (/rpc/tasks/clients/search,
// /rpc/tasks/types/list, /rpc/tasks/categories/list).
// lookups.ts existe solo como schemas compartidos.
```

> El user pidió "namespace vs flat". Resolución: **FLAT bajo `/tasks/...`**
> con schemas compartidos en `lookups.ts` (sin `lookupsContract` router
> propio). Razón: un único dominio funcional (tasks consume sus lookups);
> agregar `/rpc/lookups/...` introduce un router extra sin consumidores
> independientes.

### 6.3 Cliente web multi-contract (`apps/web/src/lib/api/rpc.ts` diff)

```ts
// ANTES
export type RpcClient = ContractRouterClient<typeof authContract>;

// DESPUÉS
import type { ContractRouterClient } from "@orpc/contract";
import type { authContract, tasksContract } from "@crm/types";

export type RpcClient = {
  auth: ContractRouterClient<typeof authContract>;
  tasks: ContractRouterClient<typeof tasksContract>;
};

export function createRpcClient(baseURL: string): RpcClient {
  if (!ALLOWED_BASE_URL_PATTERN.test(baseURL)) {
    throw new Error("Invalid RPC base URL");
  }
  const link = new RPCLink({
    url: baseURL,
    fetch: (request, init) => fetch(request, { ...init, credentials: "include" }),
  });
  return {
    auth: createORPCClient(authContract, link),
    tasks: createORPCClient(tasksContract, link),
  };
}
```

> **API change**: `rpc.verifyOtp` → `rpc.auth.verifyOtp.mutate({ email, code })`.
> Diff obligatorio en `apps/web/src/lib/otp/rpc-verifier.ts`:
> `await rpc.auth.verifyOtp.mutate({ email, code })`.

### 6.4 Handlers HTTP (`apps/api/src/http/tasks/tasks-routes.ts`)

Forma (espejada de `auth-routes.ts`):

```ts
export interface TasksRouteDependencies {
  listTasks: ListTasks;
  getTask: GetTask;
  createTask: CreateTask;
  updateTask: UpdateTask;
  moveTask: MoveTask;
  deleteTask: DeleteTask;
  listTaskStates: ListTaskStates;
  createTaskState: CreateTaskState;
  updateTaskState: UpdateTaskState;
  deleteTaskState: DeleteTaskState;
  reorderTaskStates: ReorderTaskStates;
  listClientsForSelector: ListClientsForSelector;
  listTypesForForm: ListTypesForForm;
  listCategoriesByType: ListCategoriesByType;
}

export function createListTasksHandler(deps: TasksRouteDependencies) {
  return async (event: H3Event) => {
    const body = await readValidatedBody(event, listTasksInputSchema.parse);
    return await deps.listTasks.execute(body);
  };
}
// … createGetTaskHandler, createCreateTaskHandler, … (uno por path)

// Mapeo de errores:
//   TaskNotFound        → 404
//   TaskStateNotFound   → 404
//   InvalidKanbanOrder  → 409
//   InvalidStateTransition → 409
//   Unauthorized        → 401
//   Zod validation      → 400 (orpc nativo)
```

### 6.5 `router.ts` diff (extract)

```ts
// ANTES — solo auth + health
if (path === "/rpc/health") { … }
if (path === "/rpc/auth/request-otp") { … }
// …

// DESPUÉS — añade tasks dispatch
const handlers = createTasksRouteHandlers(deps);
if (path === "/rpc/tasks/list")                 return await handlers.list(event);
if (path === "/rpc/tasks/get")                  return await handlers.get(event);
if (path === "/rpc/tasks/create")               return await handlers.create(event);
if (path === "/rpc/tasks/update")               return await handlers.update(event);
if (path === "/rpc/tasks/move")                 return await handlers.move(event);
if (path === "/rpc/tasks/remove")               return await handlers.remove(event);
if (path === "/rpc/tasks/states/list")          return await handlers.statesList(event);
if (path === "/rpc/tasks/states/create")        return await handlers.statesCreate(event);
if (path === "/rpc/tasks/states/update")        return await handlers.statesUpdate(event);
if (path === "/rpc/tasks/states/remove")        return await handlers.statesRemove(event);
if (path === "/rpc/tasks/states/reorder")       return await handlers.statesReorder(event);
if (path === "/rpc/tasks/clients/search")       return await handlers.clientsSearch(event);
// (types.list + categories.listByType se montan vía handlers.typesList, handlers.categoriesListByType)
```

---

## 7. BaseView contract (D2 — detallado)

### 7.1 TypeScript signature

```ts
// apps/web/src/components/base-view/base-view.tsrx

import type { ReactNode } from "react";

export type ViewKind = "list" | "grid" | "kanban";

export interface BaseViewFilters {
  search?: string;
  [key: string]: unknown;
}

export interface GridStructure<R> {
  card: (record: R) => ReactNode;
  columns?: number; // default 3
}

export interface ListStructure<R> {
  row: (record: R) => ReactNode;
}

export interface KanbanStructure<R> {
  board: (props: { records: R[]; onMove: (id: string, target: { stateId: string; prevId?: string; nextId?: string }) => void }) => ReactNode;
  card: (record: R) => ReactNode;
}

export interface BaseViewProps<F extends BaseViewFilters, R> {
  id?: string;                       // default: useId()
  filters: F;
  records: R[];
  views?: ViewKind[];                // default: ["list", "grid", "kanban"]
  onFilterChange?: (next: F) => void;
  gridStructure: GridStructure<R>;
  listStructure: ListStructure<R>;
  kanbanStructure: KanbanStructure<R>;
}
```

### 7.2 Estructura interna del componente

```
BaseView
├── (interno) view: useState<ViewKind>          (default: views[0])
├── (interno) activeFilters: useState<F>        (initial: props.filters)
├── (effect) sync activeFilters → localStorage["base-view:" + id]
├── (effect) load from localStorage on mount    (hidrata al primer render)
├── SearchInput (props.filters.search + onChange)
├── ViewSwitcher (tabs/botones para views[])
└── Switch
    ├── case "list"   → <listStructure.row record />
    ├── case "grid"   → <gridStructure.card record />  (en columnas)
    └── case "kanban" → <kanbanStructure.board ... />
```

### 7.3 Ejemplo de uso (`apps/web/src/components/pages/tasks-page.tsrx`)

```tsx
import { BaseView, type BaseViewFilters } from "../../components/base-view/base-view";
import { TaskListRow } from "../../components/organisms/task-list-row/task-list-row";
import { TaskGridCard } from "../../components/organisms/task-grid-card/task-grid-card";
import { TaskKanbanBoard } from "../../components/organisms/task-kanban-board/task-kanban-board";
import { useRpc } from "../../lib/api/use-rpc";
import { useState } from "react";
import { useT } from "../../components/vendor/i18n";

interface TaskFilters extends BaseViewFilters { search: string }

export function TasksPage() {
  const t = useT();
  const rpc = useRpc();
  const [filters, setFilters] = useState<TaskFilters>({ search: "" });
  const tasks = rpc.tasks.list.useQuery(filters);   // patrón orpc; ver §7.4

  return (
    <BaseView
      id="tasks-list"
      filters={filters}
      records={tasks.data?.tasks ?? []}
      views={["list", "grid", "kanban"]}
      onFilterChange={setFilters}
      gridStructure={{ card: (task) => <TaskGridCard task={task} />, columns: 3 }}
      listStructure={{ row: (task) => <TaskListRow task={task} /> }}
      kanbanStructure={{
        board: ({ records, onMove }) => (
          <TaskKanbanBoard tasks={records} states={states} onMove={onMove} />
        ),
        card: (task) => <TaskCard task={task} />,
      }}
    />
  );
}
```

### 7.4 RPC reactivo (decisión menor)

- El design **NO** introduce un binding nuevo (`@octanejs/tanstack-query`,
  diferido al data layer). Las queries se hacen con `useState` + `useEffect`
  (`useIsMounted`/`useDebounceValue` host-safe del wrapper `vendor/hooks`).
- Patrón: `const [tasks, setTasks] = useState<Task[]>([]); useEffect(() => { rpc.tasks.list(...).then(setTasks) }, [filters])`.
- Migración a TanStack Query llega con el primer change que lo necesite
  (`clients`, `finance`); `BaseView` acepta `records: R[]` opaco al
  fetching — el padre decide cómo poblarlo.

---

## 8. Vendor wrappers

### 8.1 `apps/web/src/components/vendor/dnd-kit/`

```
vendor/dnd-kit/
├── README.md           (mismo formato que vendor/toast/README.md)
├── index.ts            exporta { DndContext, useDraggable, useDroppable, type DndContextProps }
└── dnd-context.tsrx    componente cliente (monta el binding tras hidratación)
```

**Regla (verificación npm bloqueante, spec `workspace`):**

1. `bun add @octanejs/dnd-kit@<version-exact>` en `apps/web/package.json` con
   pin exacto y lockfile commitado.
2. Verificación de peer deps contra `octane@0.2.3` y `react@18`.
3. **Si falla la verificación** (peer incompatibles o no existe en npm):
   ESCALAR al product owner (prohibido sustituir por decisión propia).
4. Solo se commitea `apps/web/package.json` tras verificación verde.

`README.md` documenta:

- qué encapsula (`@octanejs/dnd-kit`);
- API pública (`DndContext`, `useDraggable`, `useDroppable`);
- regla §9 (único módulo del repo autorizado a importar el binding);
- SSR: el `DndContext` se monta en cliente (`useEffect`); SSR renderiza sin
  él (D8).

### 8.2 `apps/web/src/components/vendor/lexical/` (alias `rich-text-editor/`)

```
vendor/lexical/
├── README.md
├── index.ts            exporta { RichTextEditor, type RichTextEditorProps }
└── rich-text-editor.tsrx  (componente cliente; onChange(jsonString))
```

**Regla (verificación npm bloqueante):**

1. `bun add @octanejs/lexical@<version-exact>` en `apps/web/package.json`.
2. Verificación de peer deps contra `octane@0.2.3` y `react@18`.
3. **Si falla**: ESCALAR al product owner.
4. Solo se commitea tras verificación verde.

`README.md` documenta:

- `RichTextEditor({ value, onChange, placeholder, maxLength? })`;
- `value` es `string` JSON serializado (D5);
- `onChange(jsonString)` invoca el padre con la nueva serialización;
- regla §9 (único import del binding);
- SSR: el editor monta en cliente; el SSR renderiza un placeholder con
  `value` parseado a texto plano.

### 8.3 Gate de verificación npm (aplica a ambos)

Comandos exactos (orden estricto, ejecutados por el apply antes del primer
commit que toque `apps/web/package.json`):

```bash
# 1. existencia y metadata
bun pm view @octanejs/dnd-kit versions --json
bun pm view @octanejs/lexical versions --json

# 2. peer deps vs stack actual
bun pm view @octanejs/dnd-kit peerDependencies
bun pm view @octanejs/lexical peerDependencies

# 3. instalación pineada
cd apps/web
bun add @octanejs/dnd-kit@<exact>
bun add @octanejs/lexical@<exact>
# verificar peer warnings: si hay conflictos con octane@0.2.3 / react@18,
# abortar y escalar.

# 4. lockfile
bun install --frozen-lockfile  # debe pasar
```

Si cualquier paso falla → ESCALAR (no se commitea).

### 8.4 Confinamiento de imports (grep gate)

```bash
# Debe devolver 0 hits fuera de components/vendor/dnd-kit/ y components/vendor/lexical/
grep -RE "from ['\"]@octanejs/(dnd-kit|lexical)['\"]" apps/web/src/
```

---

## 9. Closed-list green grep gate

**Regla (`theme-quieter-minimalist`):** verde primario solo en 5 lugares
canónicos:

1. CTA fill (button `primary`)
2. Nav item active (`nav-item.tsrx`)
3. Outline focus (`StatusMessage` + token `--color-focus`)
4. `StatusMessage` success
5. Inline links

Comandos exactos (deben devolver **0 hits** fuera de los archivos canónicos):

```bash
# Verde primario (clases Tailwind / tokens)
grep -RnE "bg-primary|text-primary|border-primary|outline-primary|ring-primary" \
  apps/web/src/components/{organisms,molecules,pages}/task* \
  apps/web/src/components/pages/{tasks-page,task-detail-page,tasks-config-page}.tsrx \
  apps/web/src/components/base-view/

# Debe devolver 0.
# Hits permitidos (solo si los hay):
#   apps/web/src/components/molecules/nav-item.tsrx         (1)
#   apps/web/src/components/atoms/button.tsrx (variant=primary) (1)
#   apps/web/src/components/atoms/status-message.tsrx (success)  (1)
#   apps/web/src/components/atoms/skip-link.tsrx (focus outline) (1)
#   apps/web/src/components/molecules/form-field.tsrx (focus ring) (1)
#   (los 5 lugares canónicos)
```

Excepción documentada: el wrapper `vendor/dnd-kit/` puede usar `--color-focus`
para outline de drag preview (token verde canónico, no verde primario
decorativo). El drag preview no es un "nuevo uso de verde" — es foco.

Los **colores de columna del kanban** vienen de `task_state.tast_color`
(placeholder: campo opcional del schema — Fase 2 cuando exista
`@octanejs/colorful`); en MVP, el form `task-state-form` no incluye color
picker y las columnas heredan `surface` (token neutral).

---

## 10. i18n catalog

### 10.1 Keys a añadir en `apps/web/src/lib/i18n/locales/es.json`

Sección `tasks.*` agrupada (40 claves):

| Path | Clave | Cadena (default) |
| --- | --- | --- |
| `tasks.page.title` | título de página | `"Tareas"` |
| `tasks.page.newTask` | botón | `"Nueva tarea"` |
| `tasks.page.configTooltip` | tooltip ruedita | `"Configurar estados"` |
| `tasks.search.placeholder` | input búsqueda | `"Buscar tareas…"` |
| `tasks.search.label` | label SR-only | `"Buscar"` |
| `tasks.views.list` | tab | `"Lista"` |
| `tasks.views.grid` | tab | `"Grilla"` |
| `tasks.views.kanban` | tab | `"Kanban"` |
| `tasks.state.empty` | sin tareas | `"No hay tareas"` |
| `tasks.state.moveToStart` | a11y drop | `"Mover al inicio"` |
| `tasks.state.moveToEnd` | a11y drop | `"Mover al final"` |
| `tasks.card.edit` | botón card | `"Editar"` |
| `tasks.card.delete` | botón card | `"Eliminar"` |
| `tasks.card.noDescription` | fallback | `"Sin descripción"` |
| `tasks.card.noClient` | fallback | `"Sin cliente"` |
| `tasks.card.noCategory` | fallback | `"Sin categoría"` |
| `tasks.form.titleLabel` | label | `"Título"` |
| `tasks.form.titlePlaceholder` | placeholder | `"¿Qué necesitás hacer?"` |
| `tasks.form.titleRequired` | error | `"El título es obligatorio."` |
| `tasks.form.titleTooLong` | error | `"El título no puede pasar los 200 caracteres."` |
| `tasks.form.descriptionLabel` | label | `"Descripción"` |
| `tasks.form.descriptionPlaceholder` | placeholder | `"Detalles, contexto, links…"` |
| `tasks.form.clientLabel` | label | `"Cliente"` |
| `tasks.form.clientNone` | opción | `"Sin cliente"` |
| `tasks.form.typeLabel` | label | `"Tipo"` |
| `tasks.form.typeRequired` | error | `"El tipo es obligatorio."` |
| `tasks.form.categoryLabel` | label | `"Categoría"` |
| `tasks.form.categoryDisabled` | tooltip | `"Elegí un tipo primero."` |
| `tasks.form.priorityLabel` | label | `"Prioridad"` |
| `tasks.form.attachmentsLabel` | label | `"Adjuntos"` |
| `tasks.form.attachmentsDisabled` | tooltip Fase 2 | `"Los adjuntos llegan en una próxima entrega."` |
| `tasks.form.submit` | botón crear | `"Crear tarea"` |
| `tasks.form.submitUpdate` | botón guardar | `"Guardar cambios"` |
| `tasks.form.cancel` | botón cancelar | `"Cancelar"` |
| `tasks.statuses.label` | tab config | `"Estados"` |
| `tasks.statuses.add` | botón | `"Nuevo estado"` |
| `tasks.statuses.edit` | botón | `"Editar estado"` |
| `tasks.statuses.delete` | botón | `"Eliminar estado"` |
| `tasks.statuses.deleteConfirm` | confirmación | `"¿Eliminar este estado? Las tareas en este estado no se borran, pero quedan sin estado válido."` |
| `tasks.errors.notFound` | 404 | `"No encontramos esa tarea."` |
| `tasks.errors.loadFailed` | 500 red | `"No pudimos cargar las tareas. Reintentá."` |
| `tasks.errors.saveFailed` | 500 guardar | `"No pudimos guardar los cambios."` |
| `tasks.errors.moveFailed` | 500 drag | `"No pudimos mover la tarea. Reintentá."` |
| `tasks.errors.invalidKanbanOrder` | drift | `"El orden se actualizó. Refrescá la página."` |

(43 claves; cubre page, search, views, state, card, form, statuses, errors).

### 10.2 Extensión de `i18n.test.ts` (NO requiere cambios)

El glob `src/**/*.{ts,tsrx}` ya cubre `.tsrx` (verificar):

```ts
// apps/web/src/lib/i18n/i18n.test.ts — extract relevante
const glob = new Glob("**/*.{ts,tsrx}");
for (const file of glob.scanSync({ cwd: SRC_DIR, absolute: true })) { … }
```

`{ts,tsrx}` está presente. La regla del precedent ya cubre archivos
`.tsrx` (que es donde viven los componentes). Sin cambios en el test.

Si alguna clave `tasks.*` se usa en código y NO existe en `es.json`, el test
**falla automáticamente**. Gate natural.

### 10.3 Smoke de auto-detección

```bash
bun test apps/web/src/lib/i18n/i18n.test.ts
# esperado: verde
# si falta alguna clave tasks.* → falla con "clave ausente en es.json: tasks.…"
```

---

## 11. PII telemetry gate

### 11.1 Atributos permitidos / prohibidos (D6 — recordatorio)

| ✅ Permitido | ❌ Prohibido |
| --- | --- |
| `task.task_id` | `task.task_title` |
| `task.task_tast_id` | `task.task_description` |
| `task.task_tast_id_from` | `client.clie_name` |
| `task.task_tast_id_to` | `client.clie_email` |
| `task.task_kanban_order` | cualquier email |
| `task.kanban_order_rebalanced` | nombres de adjuntos |
| `task_state.tast_id` | |
| `task_state.tast_order` | |
| `user.user_id` | |
| `result.success` | |
| `result.error_code` | |

### 11.2 Comando de grep gate (aplica en apply)

```bash
# Debe devolver 0 hits.
grep -RE 'attributes\.(title|description|email)' apps/api/src/

# Cobertura ampliada (recomendado): incluye otras posibles fugas PII.
grep -RE 'attributes\.(clie_name|clie_email|task_title|task_description|atta_title)' apps/api/src/
# Debe devolver 0 hits.
```

Si el grep devuelve hits:

- `attributes.task_title` → renombrar a `attributes.task_id` o similar.
- `attributes.clie_email` → eliminar el atributo (no emitir).
- Cualquier otro → ESCALAR al product owner (cambio de contrato de
  telemetría; requiere decisión fuera del design).

### 11.3 Spans definidos

```ts
// Forma esperada en composition root / casos de uso
telemetry.startSpan("task.create",  { "task.task_id": id, "result.success": true });
telemetry.startSpan("task.update",  { "task.task_id": id });
telemetry.startSpan("task.move",    { "task.task_id": id, "task.task_tast_id_from": from, "task.task_tast_id_to": to });
telemetry.startSpan("task.delete",  { "task.task_id": id });
telemetry.startSpan("task_state.create",   { "task_state.tast_id": id });
telemetry.startSpan("task_state.reorder",  { "task_state.tast_id": id, "task_state.tast_order": order });
```

**Ningún span incluye `task_title` / `task_description` / `clie_email`.**

---

## 12. Migration + seed (decisión de apply)

### 12.1 Seed opcional de `client` ejemplo (apply-time)

El precedent `backend-auth` crea el usuario + 3 `task_state` (Pendiente /
En progreso / Completado) + cuenta Efectivo en ARS en el seed transaccional
del registro implícito. Este change **NO** extiende ese seed: el cliente es
un lookup opcional; el form puede quedar con dropdown vacío hasta que el
change `clients` lo pueble.

**Decisión (apply):** si en el primer PR de tasks se quiere poblar el
dropdown de cliente con al menos un registro para dev, el seed transaccional
del precedent puede extenderse opcionalmente con:

```sql
-- dentro de KyselyUserSeedService.run (modificación opcional)
INSERT INTO client (clie_id, clie_user_id, clie_name, clie_email, clie_areaphone, clie_phone)
VALUES (${exampleClientId}, ${userId}, 'Cliente de ejemplo', 'ejemplo@crmhome.app', '+54', '1122334455');
```

- **Riesgo:** modificar el seed transaccional del precedent **rompe la
  invariante** "este seed es de `backend-auth`". El design recomienda NO
  tocarlo aquí y dejar el dropdown vacío hasta `clients`.
- **Decisión final:** se delega al **apply gate** vía `ask-on-risk`. Si el
  apply decide extender el seed, debe documentar el cambio en
  `apply-progress.md`.

### 12.2 Seed del FK `task_clie_id`

Sin seed: las tasks nuevas se crean con `task_clie_id = NULL` por default.
Cuando el usuario selecciona un cliente del dropdown (lookup
`/rpc/tasks/clients/search`), se asigna el FK.

---

## 13. Resoluciones D1–D10 (resumen ejecutivo)

| ID | Título | Resolución |
| --- | --- | --- |
| **D1** | RPC client expansion | Multi-contract en `lib/api/rpc.ts` (`rpc.auth.*`, `rpc.tasks.*`); `lookups.ts` solo schemas compartidos (flat bajo `/tasks/...`). |
| **D2** | BaseView contract | `<BaseView id? filters views? onFilterChange? gridStructure listStructure kanbanStructure />` con switch interno + persistencia `localStorage["base-view:" + id]`. Generalización sin overrides por módulo. |
| **D3** | half-step kanban | `computeInsertOrder = (prev + next) / 2`; rebalanceo en ` | gap | < 1e-6` densificando a múltiplos de `KANBAN_DEFAULT_STEP = 1024`. Constants en`apps/api/src/application/tasks/constants.ts`. |
| **D4** | migración idempotente | `CREATE TABLE IF NOT EXISTS` + `CREATE INDEX IF NOT EXISTS` en todas las sentencias. `down` documenta orden inverso. |
| **D5** | lexical serialization JSON | `task_description` es `string` JSON serializado; wrapper `RichTextEditor` con `onChange(jsonString)`. Evita XSS, soporta re-edición exacta. |
| **D6** | PII telemetry gate | Solo IDs (`task_id`, `task_tast_id`, etc.) + `result.success`/`error_code`. Prohibidos: `title`, `description`, `email`. Gate por grep → §11. |
| **D7** | i18n auto-detection | `i18n.test.ts` ya cubre `src/**/*.{ts,tsrx}`; extiende catálogo con `tasks.*` antes del PR frontend. Sin cambios al test. |
| **D8** | SSR-stable kanban | `DndContext` se monta tras hidratación; SSR renderiza columnas + cards sin DnD. Sin mismatch. |
| **D9** | drag/drop concurrency | Last-write-wins MVP; documentado en JSDoc + README wrapper. Rebalanceo detecta drift naturalmente. |
| **D10** | `client` lookup endpoint | `POST /rpc/tasks/clients/search { query, limit? } → { clients: [{ clie_id, clie_name, clie_email }] }`. Filtro por `clie_user_id` activo. Max 50. |

---

## 14. Tests — obligaciones

### 14.1 Unitarios (primero, strict TDD)

```
apps/api/src/application/tasks/
├── list-tasks.test.ts
├── get-task.test.ts
├── create-task.test.ts              (incluye appendOrder → max+1024)
├── update-task.test.ts
├── move-task.test.ts                (6 casos: gap normal, gap < 1e-6, append, prepend, cross-column, no-op)
├── delete-task.test.ts
├── list-task-states.test.ts
├── create-task-state.test.ts
├── update-task-state.test.ts
├── delete-task-state.test.ts
├── reorder-task-states.test.ts
├── list-clients-for-selector.test.ts
├── list-types-for-form.test.ts
└── list-categories-by-type.test.ts
```

Patrón: `FixedClock`, repos in-memory, `FakeIdGenerator` (igual a
`backend-auth`).

### 14.2 Integración opt-in (postgres)

```
apps/api/src/infrastructure/kysely/
├── task-state-repository.integration.test.ts
├── task-repository.integration.test.ts
├── client-lookup-repository.integration.test.ts
└── task-repository.move.integration.test.ts    (cross-column + rebalanceo end-to-end)
```

Patrón: `describe.skipIf(!databaseUrl)` + `cleanupTasksTables(db)` en
`afterAll`.

### 14.3 Frontend (sin DOM)

```
apps/web/src/lib/api/rpc.test.ts                 (multi-contract mock)
apps/web/src/lib/otp/rpc-verifier.test.ts        (ajustado a rpc.auth.*)
apps/web/src/lib/tasks/tasks-kanban.test.ts      (helpers puros)
apps/web/src/lib/tasks/tasks-form.test.ts        (mappers + reset deps)
apps/web/src/components/base-view/base-view.test.ts  (switch de vista, persistence mock)
```

Patrón: unit-first TS puro (sin DOM). Sin tests de componentes
`organisms/*` ni `pages/*` (diferidos al primer change con DOM tests).

### 14.4 Contratos (`packages/types/src/contracts/`)

```
tasks.test.ts                  (safeParse por schema, espejado de auth.test.ts)
```

---

## 15. Cambios por archivo (resumen)

### Nuevos (~50 archivos)

**Backend:**

- `apps/api/src/domain/ports/{task-state,task,attachment,client-lookup,type-lookup,category-lookup}-repository.ts`
- `apps/api/src/application/tasks/{constants,errors}.ts` + 13 use-cases + 13 tests
- `apps/api/src/infrastructure/kysely/{task-state,task,attachment,client-lookup,type-lookup,category-lookup}-repository.ts`
- `apps/api/src/infrastructure/kysely/task-repository.integration.test.ts` (+3 más)
- `apps/api/src/infrastructure/kysely/migrations/002_tasks.ts`
- `apps/api/src/http/tasks/tasks-routes.ts`

**Tipos:**

- `packages/types/src/contracts/{tasks,lookups}.ts`
- `packages/types/src/contracts/tasks.test.ts`

**Frontend:**

- `apps/web/src/components/base-view/{base-view.tsrx,base-view.test.ts}` + 3 vistas
- `apps/web/src/components/vendor/dnd-kit/{README.md,index.ts,dnd-context.tsrx}`
- `apps/web/src/components/vendor/lexical/{README.md,index.ts,rich-text-editor.tsrx}`
- `apps/web/src/components/molecules/{task-state-badge,task-priority-badge,task-type-icon,search-input}.tsx`
- `apps/web/src/components/organisms/task-form/{task-form.tsrx,task-form.logic.ts}`
- `apps/web/src/components/organisms/{task-card,task-kanban-column,task-kanban-board,task-list-row,task-grid-card}.tsx`
- `apps/web/src/components/organisms/task-state-form/task-state-form.tsrx`
- `apps/web/src/components/pages/{tasks-page,task-detail-page,tasks-config-page}.tsx`
- `apps/web/src/lib/{validation/task.ts,tasks/tasks-kanban.ts,tasks/tasks-form.ts}`
- `apps/web/src/lib/{tasks-kanban,tasks-form}.test.ts`
- `apps/web/src/routes/{tasks-config.tsrx,tasks/$id.tsrx}`
- `apps/web/src/lib/api/rpc.test.ts`

### Modificados (~10 archivos)

- `apps/api/src/infrastructure/kysely/database.ts` (extiende `DatabaseSchema`)
- `apps/api/src/infrastructure/kysely/test-cleanup.ts` (añade `cleanupTasksTables`)
- `apps/api/src/http/composition-root.ts` (wiring tasks + lookups)
- `apps/api/src/http/router.ts` (dispatch `/rpc/tasks/**`)
- `apps/web/src/lib/api/rpc.ts` (multi-contract)
- `apps/web/src/lib/otp/rpc-verifier.ts` (`rpc.auth.verifyOtp.mutate`)
- `apps/web/src/lib/i18n/locales/es.json` (sección `tasks.*`)
- `apps/web/octane.config.ts` (registra `tasks-config` + `tasks/:id`)
- `apps/web/src/routes/tasks.tsrx` (reemplaza placeholder)
- `packages/types/src/index.ts` (exporta `tasks` + `lookups`)
- `apps/web/src/components/base-view/README.md` (documenta contrato real)

**No modificados** (constraint): specs canónicas, `DESIGN.md`, `apps/*/*package.json`
(excepto dnd-kit/lexical tras verificación npm), `octane.config.ts` secciones
existentes.

---

## 16. Riesgos aplicados al design

| Riesgo | Nivel | Mitigación de design |
| --- | --- | --- |
| **Size > 400 líneas** | 🔴 | Design entrega file tree + diffs de composition-root y router; `ask-on-risk` evalúa chaining (PR-A backend migration+domain / PR-B backend HTTP+router / PR-C frontend wrappers+BaseView+/tasks / PR-D /tasks-config). No se asume chaining ni `size:exception` aquí. |
| **Bindings npm verification** | 🔴 | Gate §8.3 obligatorio antes de pinear `@octanejs/dnd-kit` y `@octanejs/lexical`; escalación al product owner si falla. |
| **`task_kanban_order` collisions** | 🟡 | Umbral 1e-6 + rebalanceo (D3); tests unitarios obligatorios. |
| **Drag/drop concurrency** | 🟡 | Last-write-wins MVP (D9); JSDoc + README documentan limitación. |
| **`client` lookup mínimo** | 🟡 | Solo `search-by-name` (D10); CRUD completo diferido a `clients`. |
| **`/tasks-config` sin nav** | 🟡 | Ruta adicional con `before: [requireSession]` pero sin item en `SHELL_ROUTES` (constraint); tooltip `tasks.page.configTooltip` para descubrimiento. |
| **Adjuntos Fase 2 — UX honesto** | 🟡 | Campo "Adjuntos" deshabilitado con `tasks.form.attachmentsDisabled`; tablas creadas en migración sin endpoint. |
| **Catálogo i18n inflado** | 🟡 | 43 claves agrupadas; el test de escaneo (§10) detecta claves faltantes automáticamente. |
| **Telemetría PII inadvertida** | 🟡 | Grep gate `attributes.(title\|description\|email)` (§11) en apply. |
| **BaseView contract surface** | 🟡 | Firma común; si tasks necesita algo extra, se GENERALIZA (no fork por módulo). |
| **SSR de dnd-kit** | 🟡 | Wrapper monta `DndContext` en `useEffect`; SSR sin DnD; sin mismatch (D8). |
| **Closed-list green enforcement** | 🟡 | Grep gate (§9) en apply; colores kanban vienen de tokens neutrales en MVP (color picker Fase 2). |
| **Concurrencia rollback** | 🟢 | `down` destructivo documentado; sin datos productivos. |

---

## 17. Rollback

- **Backend:** revert del/los commits. Composition root vuelve al estado
  pre-change. `002_tasks.ts` no se ejecuta si aborta antes del merge; si ya
  se mergeó, `down` borra las 5 tablas en orden inverso. `task_state` queda
  intacto (pertenece a `001_initial.ts`).
- **Frontend:** revert del/los commits. `/tasks` vuelve a placeholder;
  wrappers dnd-kit/lexical se eliminan (sin consumidores); RPC vuelve al
  single-contract (con un diff mínimo en `rpc-verifier.ts`).
- **`/tasks-config` + `/tasks/:id`:** revert del commit que las registra.
  Sin cambios en `SHELL_ROUTES`.
- **i18n:** revert de la sección `tasks.*` agregada a `es.json`.
- **BaseView:** revert del commit; el README placeholder queda intacto.

---

## 18. Cierre

Este design materializa el módulo Tasks del MVP Fase 1 replicando 1:1 los
precedentes `backend-auth` (backend) y `frontend-foundation` (frontend),
materializa el `BaseView` prometido por PRD §9, introduce dos wrappers
vendor nuevos para los bindings `@octanejs/dnd-kit` y `@octanejs/lexical`
(diferidos con consumidor en este change por `vendor-bindings`), entrega el
algoritmo half-step con rebalanceo para `task_kanban_order`, y aplica los
gates de apply (closed-list green, PII telemetry, npm verification,
i18n auto-detection) sin relajar el baseline canónico.

Las decisiones D1–D10 quedan cerradas con sus resoluciones trazables a
archivos y tests concretos. El forecast de size sigue > 400 líneas (la
estrategia de delivery queda explícitamente diferida al apply gate vía
`ask-on-risk`; el design no asume chaining ni `size:exception`).

`Skill resolution: paths-injected` — el design leyó directamente los
artefactos inyectados (`proposal.md`, `explore.md`, `preproposal.md`) y los
docs/PRD §8.3 / §11 / §9 / §10 / §13 sin registry traversal. Las
`## Skills to load before work` no se inyectaron para esta fase; ningún
path adicional fue cargado (ninguna skill especializada era necesaria
para resolver decisiones técnicas de diseño sobre artefactos ya
explorados).
