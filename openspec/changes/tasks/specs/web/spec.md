# Web Specification (delta — change `tasks`)

> Delta sobre el spec canónico en `openspec/specs/web/spec.md`. La
> baseline (octanejs + vite + tailwind, atomic design, vendor/, i18n,
> tabla de rutas con helpers) NO se relaja; este delta AÑADE escenarios
> concretos sobre el requisito existente "Tabla de rutas ampliada con
> helpers de layout" para cubrir el registro de `/tasks`, `/tasks/:id`
> y la integración del componente `BaseView` en `/tasks`.

## ADDED Requirements

### Requirement: Tabla de rutas del módulo tasks con BaseView y detalle

`apps/web/octane.config.ts` DEBE registrar las tres rutas del módulo
`tasks` usando los helpers existentes (`shellRoute(path, entry)`) para
preservar el layout del shell y el middleware `before: [requireSession]`
sin duplicar guards: (a) `/tasks` apuntando a `TasksPage`, que monta el
componente compartido `BaseView` (de
`apps/web/src/components/base-view/`, materializado por el change
`tasks`) con `id="tasks-list"`, `views={["list","grid","kanban"]}`,
`onFilterChange` ligado al estado local, y `gridStructure`,
`listStructure` y `kanbanStructure` poblados con los organismos del
módulo (`task-grid-card`, `task-list-row`, `task-kanban-board` +
`task-kanban-column` + `task-card`); (b) `/tasks/:id` apuntando a
`TaskDetailPage`, que incluye el botón "Editar" (navega o abre el form
lateral) y "Eliminar" (con confirmación); (c) `/tasks-config` SIN item
de nav (cubierto por el delta del spec `web-shell`). El componente
`BaseView` es compartido por futuros módulos (clients, finance); NO
DEBE admitir overrides por módulo — si un módulo necesita algo que la
firma común no cubre, la firma DEBE extenderse en `BaseView` mismo, no
hacerse fork por módulo (decisión D2 del design). La página
`TasksPage` DEBE obtener los registros vía el cliente RPC multi-contract
(`rpc.tasks.list`) siguiendo el patrón del precedent
`frontend-foundation` (state + `useEffect` + helper host-safe del
wrapper `vendor/hooks/`).

#### Scenario: /tasks registrada con shellRoute y BaseView id=tasks-list

- GIVEN `apps/web/octane.config.ts` y el árbol de `apps/web/src/components/base-view/` tras el change
- WHEN se inspecciona la tabla de rutas y el componente `TasksPage`
- THEN `/tasks` está registrada con `shellRoute("/tasks", TasksPage)`, hereda `before: [requireSession]`, y `TasksPage` renderiza `<BaseView id="tasks-list" views={["list","grid","kanban"]} … />` con las tres `*Structure` pobladas con los organismos `task-*` correspondientes

#### Scenario: /tasks/:id registrada con TaskDetailPage

- GIVEN `apps/web/octane.config.ts` tras el change
- WHEN se inspecciona la tabla de rutas
- THEN `/tasks/:id` está registrada con `shellRoute("/tasks/:id", TaskDetailPage)` y hereda el guard `requireSession`

#### Scenario: BaseView es compartido (no fork por módulo)

- GIVEN el componente `BaseView` exportado por `apps/web/src/components/base-view/base-view.tsrx`
- WHEN se inspecciona su API pública y se buscan props específicas de tasks
- THEN no existen props del estilo `taskOnly*` ni `module="tasks"`; cualquier futura extensión debe pasar por `F extends BaseViewFilters` sobre la firma común de `BaseView`

#### Scenario: TasksPage consume rpc.tasks.list vía cliente multi-contract

- GIVEN `apps/web/src/components/pages/tasks-page.tsrx` tras el change
- WHEN se inspecciona su data fetching
- THEN invoca `rpc.tasks.list` (a través del namespace `tasks` del `RpcClient` multi-contract definido en `lib/api/rpc.ts`) y nunca `rpc.auth.*` para datos de tareas

#### Scenario: Persistencia de filtros en localStorage namespaced

- GIVEN `TasksPage` con `BaseView id="tasks-list"`
- WHEN el usuario tipea `search: "fact"` y recarga la página
- THEN el filtro reaplica con `search: "fact"` desde `localStorage["base-view:tasks-list"]` (clave namespaced que NO colisiona con `crm-sidebar-layout`)
