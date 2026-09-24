# Tasks flow (end-to-end)

Fecha: 2026-09-23
Owner: el Gentleman (autonomous)
Estado: en curso (Fase A ✅, B ✅, C ✅, D ✅, E ✅ — cierre pendiente)

## Objetivo

Cerrar el flujo completo del módulo `tasks` para que un usuario autenticado pueda:

1. Ver lista de tareas en `/tasks` (list/grid/kanban).
2. Abrir detalle en `/tasks/:id` con datos reales (RPC.tasks.get).
3. Eliminar la tarea desde el detalle (RPC.tasks.remove).
4. Entrar en modo edición desde el detalle → form lateral (RPC.tasks.update).
5. Crear tarea nueva desde `/tasks` → form lateral (RPC.tasks.create).
6. Mover tarea entre estados (RPC.tasks.move) con un control simple (sin drag-drop MVP).
7. Gestionar estados en `/tasks-config` (list/create/edit/delete/reorder).

Cada fase cierra con un commit `fix(web)` o `feat(web)` según corresponda.

## Fases

### Fase A — Detail page real (load + display + delete + edit toggle)

- [x] A1. Reemplazar el placeholder `__state` por `useState` real + `useEffect` que llama `RPC.tasks.get({ task_id })` al montar.
- [x] A2. Render condicional: loading / error / task. Mostrar título, descripción (o "Sin descripción"), type-icon, state-badge (lookup por ID), created_at, updated_at.
- [x] A3. Botón Eliminar: handler async que llama `RPC.tasks.remove({ task_id })` y al éxito navega a `/tasks` (o usa `location.assign`).
- [x] A4. Botón Editar: navega a `${location.pathname}?edit=true`. El form de edición se monta en fase B.
- [x] A5. Limpiar i18n: `tasks.detail.loading`, `tasks.detail.deleteConfirmTitle` (nuevo), `tasks.detail.deleteConfirmBody` (nuevo), `tasks.detail.error` (nuevo).
- [x] A6. Verificar end-to-end en browser con agent-browser: GET de tarea, render correcto, eliminar tarea → lista actualizada, navegar a `?edit=true` → URL cambia.

Commit: `feat(web): task-detail-page loads real data via rpc.tasks.get`

### Fase B — TaskForm real (create + edit)

- [x] B1. Reemplazar el `__state` placeholder en `task-form.tsrx` por `useState` real + reducer `applyTaskFormAction`.
- [x] B2. Wire `onSubmit` para construir params con el helper `taskFormToCreateInput` (nuevo en `lib/tasks/tasks-form.ts`).
- [x] B3. Mount en `/tasks`: botón "Nueva tarea" abre el form en panel lateral (sidebar). Submit → `RPC.tasks.create(...)` → cierra panel + refresh lista.
- [x] B4. Mount en `/tasks/:id?edit=true`: panel lateral con form pre-populado del task. Submit → `RPC.tasks.update(...)` → cierra panel + actualiza detalle.
- [x] B5. Validación: `taskTitleRequired`, `taskDescriptionLength` (existing en `lib/validation/task`).
- [x] B6. Cancelar: cierra el panel sin persistir.

Commit: `feat(web): task-form wired for create + edit via rpc`

### Fase C — Tasks-config: states CRUD + reorder

- [x] C1. Reemplazar el placeholder `tasks-config-page.tsrx` con `useEffect` que llama `RPC.tasks.states.list(...)` y `useState<TaskState[]>`.
- [x] C2. Render lista de estados (nombre + orden) con botones Editar / Eliminar / Mover arriba / Mover abajo.
- [x] C3. Botón "Agregar estado" abre `task-state-form` con `mode="create"`. Submit → `RPC.tasks.states.create(...)` → cierra + refresh.
- [x] C4. Botón Editar por estado: abre form con `mode="update"` y `initial={tast_name, tast_order}` pre-cargados.
- [x] C5. Botón Eliminar por estado: diálogo de confirmación → `RPC.tasks.states.remove({ tast_id })`.
- [x] C6. Botones up/down: `RPC.tasks.states.reorder([{tast_id, tast_order: newOrder}, ...])` para todos los estados. **Fix backend extra**: el reorder usa 2-pass (ordenes negativos intermedios) para evitar violar `UNIQUE (tast_user_id, tast_order)` durante el swap. `SET CONSTRAINTS ALL DEFERRED` resultaba en errores intermitentes.
- [x] C7. Reemplazar el `state = initialTaskStateFormState(...)` placeholder en `task-state-form.tsrx` por `useState` real.

Commit: `feat(web): tasks-config CRUD + reorder for task states`

### Fase D — TaskCard real en list view + click to detail

- [x] D1. Modificar `tasks-page.tsrx` para que el `listStructure.row` devuelva un anchor `<a href={"/tasks/" + task.task_id}>` con título (o el componente `TaskCard` si lo mantengo simple).
- [x] D2. Validar: click en una tarea → navega a `/tasks/:id` → detail page (fase A) muestra la tarea.

Commit: `feat(web): task list rows are clickable links to detail`

### Fase E — Move task (control simple)

- [x] E1. En `task-detail-page.tsrx`, agregar control "Mover a..." (select con la lista de task_states del usuario).
- [x] E2. Al seleccionar un nuevo estado, llamar `RPC.tasks.move({ task_id, target_state_id, prev_task_id, next_task_id })`.
- [x] E3. Para MVP, dejar `prev_task_id`/`next_task_id` vacíos (kanban order se recalcula server-side al final de la columna). **Fix backend extra**: el use case `MoveTask.execute` lanzaba `InvalidKanbanOrder` cuando ambos vecinos eran `undefined`. Lo cambié para que sea default = append al final (más útil para el flow MVP).

Commit: `feat(web): move-to control on task detail page`

## Decisiones de scope

- **Drag-drop kanban**: NO MVP. La move-task se hace vía select en el detail.
- **Realtime/optimistic updates**: NO MVP. Después de cada RPC el componente hace re-fetch.
- **Attachments (PRD §13)**: sigue disabled (Fase 2).
- **Logout UI button**: NO en este feature (sesión separada).
- **Tests**: agregar tests para la lógica nueva en `lib/tasks/*` cuando aplique; los `.tsrx` se validan via browser e2e.

## Cierre

Cuando todas las fases estén en verde:

- 531+ tests pass
- E2E en browser: login → /tasks (list) → /tasks/:id (detail) → delete → /tasks → click nueva → form → submit → /tasks/:id → edit → move → /tasks-config → state CRUD
- Working tree limpio (solo tooling untracked)

## Memoria

Después del cierre, guardar observación engram con:

- Lista de commits del feature
- Causas raíz de cada fix
- Decisiones de scope tomadas
- Gotchas para futuras sesiones (octane useState quirks, RPC envelope format, etc.)
