# ODD — web-v3 /tasks (kanban + drawer)

Feature: `/tasks` funcional en apps/web-v3. Tablero kanban por estado con
drag & drop persistido, vistas grilla/lista/kanban, y lateral derecho de
creación/edición con editor de descripción.

Workflow: LayerFS (`./lf fork odd-web-v3-tasks` -> implementar -> land ->
commit `feat(web-v3):`).

## Contrato (fuentes normativas)
- PRD-v4 §8.4 (Tareas), §9.1/§9.2 (drawer), §11.5 (motion/estados),
  §12.5 (search params)
- PRD-v2 §8.3 (reglas de tarea: tipo obligatorio, categoría en cascada,
  estado por defecto)
- Catálogo: `tareas.png`, `lateral-derecho-tareas.png`
- Decisión I-05 (PRD-v4 §18): el drawer NO expone "Estado inicial" ni
  "Fecha límite"; adjuntos son Fase 2.

## Alcance
- Vista kanban (default del catálogo): columnas por estado con contador y
  `+` por columna, cards con título + cliente + chip de categoría.
- Drag & drop entre columnas y dentro de la columna, persistido en
  `task_kanban_order` vía `tasks/move` (optimista con rollback).
- Vistas grilla y lista (BaseView en modo controlado) + switcher de 3 vistas
  en la URL (`?view=grilla|lista|kanban`).
- Buscador por título.
- Drawer de creación/edición: título, descripción (tiptap), cliente,
  tipo (obligatorio) y categoría en cascada (deshabilitada sin tipo).
- Wrapper vendor nuevo: `vendor/dnd` (vue-draggable-plus) y
  `vendor/richtext` (tiptap).

## No-goals
- Filtros (botón "Filtros" del catálogo): la API no expone filtros por
  estado/tipo, así que no hay un botón decorativo (C-2).
- Fecha límite y adjuntos: no están en el wire de task (I-05 / Fase 2).
- Color por estado/tipo: la DB no tiene columna de color.
- Búsqueda por cliente o tipo: el wire task sólo trae ids; el nombre del
  cliente/tipo no viene en la task (hoy se filtra por título).

## Estado (cerrado 2026-10-28)

**Entregado**: kanban con dnd persistido, 3 vistas, buscador, drawer de
alta/edición con descripción rich text, borrado, y create en la columna
del "+".

**API: el contrato miente sobre lo opcional.** El contract marca
`task_tast_id` y `task_type_id` como opcionales, pero la API los exige:
- `task_type_id` → 400 "task_type_id is required" (PRD-v2 §8.3 lo declara
  obligatorio: el drawer preselecciona el primer tipo y el botón Guardar
  queda deshabilitado sin tipo).
- `task_tast_id` → 400 "task_tast_id is required": la tarea nace en la
  columna del "+" o, si viene del botón principal, en la primera columna
  (Pendiente), como dice PRD-v2 §8.3.

**Endpoint legacy**: `tasks/categories-by-type` lee su input del QUERY
STRING (no del envelope `{json}`), así que no se puede llamar con el
cliente orpc: el wrapper `callCategoriesByType` hace el fetch crudo
dentro de `vendor/orpc` (único lugar que habla con la API).

**Endpoint lossy**: `tasks/types-for-form` devuelve el id de type como
`type_name` (ver `asTypeForForm` en la API), por lo que el drawer usa
`types.list` (nombres reales). Queda pendiente el fix en la API + el
filtro de types por cliente (regla de PRD-v2 §8.3).

**Bugs que la verificación en browser encontró (y los tests ahora cubren)**:
1. `onEnd` del draggable dispara ANTES de que el v-model actualice el
   array: se leía la task equivocada del índice y el board duplicaba la
   card. Ahora el id sale del elemento arrastrado (`data-task-id`).
2. La reconstrucción optimista filtraba por columna y duplicaba tasks:
   ahora filtra por id (un task nunca puede estar en dos columnas).
3. SortableJS mueve el nodo del DOM y Vue re-renderiza: la card quedaba
   visible en la columna de origen. Se resuelve remontando las columnas
   (`epoch`) después del drop.
4. Vue REMUEVE el atributo `value` de un `<option :value="null">`, así
   que su `value` DOM es el texto: el test de "vaciar el tipo" tenía que
   seleccionar la opción por texto.

**Verificación runtime (API real)**: `tasks/list`, `tasks/states/list`,
`clients/list`, `types/list`, `categories/list`, `categories-by-type`,
`tasks/create`, `tasks/update`, `tasks/move`, `tasks/remove` — todos 200.
Drag real con eventos de mouse: la task cambia de columna, se persiste
(`tasks/move` 200) y sobrevive al reload. La descripción rich text se
guarda como HTML (`<p>…<strong>…</strong></p>`). Cero errores de consola.

**Tests**: web-v3 98 pass (dominio de tareas, kanban board, drawer con
cascada, `use-tasks` con move/rollback/vecinos, config, base-view,
edit-drawer). API 265 pass (sin cambios en el backend de este módulo).

## Pendiente
- **Tareas de schedule**: `/schedules` (timer) sigue siendo stub.
- **Clientes**: `/clients` sigue siendo stub (la API ya está completa).
- **Filtros del catálogo** y **fecha límite**: requieren API.
- **Búsqueda por cliente/tipo**: requiere el task con nombres (o un join).
- **Color por estado/tipo**: requiere migración de schema.
- **"N tareas" por tipo** (catálogo de config): la API no lo expone.
