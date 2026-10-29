# ODD — web-v3 /clients

Feature: `/clients` funcional en apps/web-v3. Listado de clientes con vistas
grilla/lista, buscador, y lateral derecho de creación/edición con borrado
que confirma listando las dependencias (PRD-v2 §8.5).

Workflow: LayerFS (`./lf fork odd-web-v3-clients` -> implementar -> land ->
commit `feat(web-v3):`).

## Contrato (fuentes normativas)
- PRD-v4 §8.6 (Clients), §9.2 (drawer), §11.5 (motion/estados), §12.5
- PRD-v2 §8.5 (CRUD, teléfono libre, borrado con dependencias)
- Catálogo: `clientes.png`, `lateral-derecho-clientes.png`

## Alcance
- Listado con BaseView (grilla + lista), buscador por nombre/email/teléfono.
- Cards con avatar de iniciales (derivado del nombre), nombre, teléfono,
  email con ícono, y card dashed "Agregar cliente".
- Drawer: nombre (obligatorio), email y teléfono (un campo libre).
- Editar y eliminar; el borrado pide confirmación INLINE (no modal) y lista
  las dependencias.

## Backend (agregado)
`clients/dependencies` (contract + use case + route + wiring + test de
integración): el criterio de PRD-v2 §8.5 pide que borrar un cliente con
tareas o movimientos activos pida una confirmación explícita que LISTE las
dependencias, y no había forma de conocerlas. En la DB el único link a
`client` es `task_clie_id` (income/expense/transfer no tienen columna de
cliente), así que las dependencias son las tareas del usuario.

## No-goals (y por qué)
- **Pills de filtro Todos/Activos/Inactivos**: la tabla `client` no tiene
  columna de estado. El catálogo las muestra sobre datos de mock; sin el
  campo serían filtros falsos.
- **Rubro · Ciudad** (subtítulo del catálogo): no hay columnas.
- **Avatar / logo**: Fase 2 (`clie_atta_id`).
- **País, Rubro, Notas**: I-06 los deja fuera de v1.
- **Cuenta asociada**: no hay API de cuentas.

## Estado (cerrado 2026-10-28)

**Bug de i18n que rompía el render**: el placeholder del email
("hola@acme.com") hizo explodes el render del drawer: el tokenizador de
vue-i18n lee `@` como inicio de un mensaje enlazado y revienta la
compilación del mensaje ("Invalid linked format"). El log del dev server
lo tenía; los tests no lo cazaban porque mockean `t()` sin compilador.
Corregido con el criterio que ya usaba `auth.emailPlaceholder`: el
placeholder no lleva `@`.

**La card de borrar abre el drawer directo en la confirmación** (URL:
`?edit=<id>&delete=1`), en vez de abrir el formulario y pedir un click
más. La confirmación es INLINE dentro del drawer (PRD-v4 §11.5: sin
modales como primera opción) y lista las tareas enganchadas.

**Verificación runtime (API real)**: `clients/list`, `clients/create`,
`clients/update`, `clients/remove`, `clients/dependencies` — todos 200.
Crear, editar, borrar con dependencia (la confirmación lista "Rediseño de
home") y borrar sin dependencias. Filtro por texto y vistas grilla/lista.
Cero errores de consola.

**Tests**: web-v3 120 pass (dominio de clientes, drawer con la
confirmación, vista). API 267 pass (2 nuevos: CRUD de clientes y
dependencies con el task enganchado).

## Pendiente
- **`/schedules`**: el último módulo Phase 1 en stub (timer, requiere
  XState, heartbeat y auto-cierre).
- **Finanzas** (`/incomes`, `/expenses`, `/transfers`): stubs; PRD-v4 §8.7
  los marca Fase 2, aunque sus APIs existen.
- **Estado/rubro/ciudad/avatar de cliente**: requieren migración de schema.
- **`/tasks-config`**: la ruta existe y lleva a /config; el catálogo la
  usa como "Configuración de tareas" (ya resuelto por el tab Estados).
