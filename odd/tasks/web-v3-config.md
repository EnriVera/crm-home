# ODD — web-v3 config

Feature: `/config` con tabs reales. Primer módulo de configuración del usuario:
perfil, apariencia, estados de tarea, tipos, apps y monedas.

Workflow: LayerFS (`./lf fork odd-web-v3-config` → implementar → land → commit
`feat(web-v3):`, prefix PRD §15.1).

## Contrato (fuentes normativas)

- PRD-v4 §8.8 (Config: tab bar pill, Perfil con Apariencia y Sesión, grillas de
  Tipos/Categorías/Cuentas, banner informativo)
- PRD-v2 §8.7 (Config: tabs, tema persistido en la cuenta, `apps` y `currency`
  son globales y solo lectura en el MVP)
- PRD-v4 §12.5 (los tabs son search params: `/config?tab=tipos`)
- Catálogo: `configuracion-perfil.png`, `configuracion-tipos.png`,
  `configuracion-estados-de-tareas.png`, `configuracion-categorias.png`,
  `configuracion-cuentas.png`

## Alcance (decisión de producto 2026-10-28)

Cinco tabs, los que la API cubre hoy:

- **Perfil**: información personal (read-only), Apariencia (3 tarjetas
  Claro/Oscuro/Sistema que persisten en `user_theme` vía `auth.updateTheme`) y
  Sesión ("Cerrar sesión" vía `auth.logout`).
- **Estados de tarea**: listado con CRUD completo + reordenamiento.
- **Tipos**: buscador + grilla de cards + CRUD completo.
- **Apps**: listado read-only (tabla global, PRD-v2 §8.7).
- **Monedas**: listado read-only (tabla global, PRD-v2 §8.7).

CRUD completo en Tipos y Estados: es lo que muestra el catálogo y la API lo
soporta entero (`types/*`, `tasks/states/*`).

## No-goals

- **Categorías, Cuentas y Adjuntos**: no tienen endpoints en la API. Categorías
  y cuentas quedan para un feature con backend propio; adjuntos es Fase 2.
- **Avatar / "Cambiar foto"**: los adjuntos son Fase 2.
- **Editar nombre, email o estudio**: no hay endpoint para actualizar el perfil;
  solo el tema. Los datos personales se muestran, no se editan.
- **"Último acceso" de la sesión**: la tabla `session` guarda `sess_created_at`,
  no un último acceso.
- **Buscador en Estados**: el catálogo lo muestra solo en Tipos.
- **Reordenar Tipos**: los tipos no tienen orden (los estados sí).
- **Contador "N tareas" por tipo**: la API no lo expone; se cuenta en el front
  con `tasks/list`.

## Estado (cerrado 2026-10-28)

**Entregado**: commit `feat(web-v3)`. Store `main` y disco convergidos.

**Verificación (runtime, API real)**: los 5 tabs cargan con datos de la API —
`types/list`, `tasks/states/list`, `config/listApps`, `config/listCurrencies`,
`auth/session` — todos 200. `types/create` 200 y el tipo nuevo aparece en la
grilla; `types/remove` 200 y desaparece; `tasks/states/create` 200 y el estado
nuevo aparece. `auth/updateTheme` 200 y el tema se aplica al instante (clase
`dark` en el `<html>`). `auth/logout` 200: redirige a `/login` y la cookie de
sesión desaparece del browser. El tab activo vive en la URL (`?tab=tipos`).
Cero errores de consola.

**Bug del backend encontrado y arreglado**: `POST /rpc/auth/logout` devolvía
500. `withRequestHeader` hace `{...event, req: clonedReq}` y `res` es un getter
del prototype de `H3Event` — el spread lo pierde, así que `event.res` quedaba
undefined y `deleteCookie` (que escribe en `event.res.headers`) reventaba.
Fix: `res: event.res` explícito.

**De paso se despertaron los tests de integración de la API**, que dormían
porque `TEST_DATABASE_URL` nunca se seteaba (el `skipIf` los apagaba en
silencio) y además estaban desactualizados: rutas con guion, body crudo en vez
del envelope ORPC, header `x-user-id` en vez de sesión real, inserts con la
columna vieja `type_module` (la 007 la renombró a `type_modules`, que además
es TEXT[]) y un test de migración que dejaba la base sin las tablas del 002.
Ahora `bun run test:db` corre 261 tests contra una base de integración
(`apps/api/.env.test.example` documenta cómo levantarla).

**Pendiente para la próxima**:

- **Categorías y Cuentas**: las dos tablas existen en la DB pero la API no las
  expone. Cada tab que las agregue necesita su propio endpoint.
- **"N tareas" por tipo**: el catálogo lo muestra en cada card; la API no lo
  expone, hoy el contador no se renderiza.
- **Editar el perfil** (nombre, email, estudio): no hay endpoint; hoy los datos
  son read-only.
- **Reordenar estados desde la UI**: el endpoint existe (`tasks/states/reorder`)
  y el dominio ya calcula el orden completo, pero falta el control (arrastrar o
  botones) en la pantalla.
- **Colores de tipo/estado**: el catálogo muestra un punto de color por card;
  las tablas no tienen columna de color.

## Estado (BaseView + drawer, cerrado 2026-10-28, 2ª entrega)

**Pedido**: Estados/Tipos/Monedas/Categorías con BaseView (grilla), creación en
lateral derecho con animación de apertura y cierre (PRD §9).

**Backend nuevo** (autorizado por el usuario, rompe el freeze de §15.1):
- `categories.*` (list/create/update/remove): contract
  `categories-contracts.ts` (wire `cate_*`), port `CategoryRepository`,
  adapter kysely, use cases, routes, wiring. La FK `cate_type_id` no conoce
  de tenants: los use cases validan que el type pertenezca al mismo user
  (test de integración cubre el 400 cross-tenant).
- `config/createCurrency`: moneda global (lo que un user crea lo ven todos,
  decisión explícita del usuario). Alineé el wire del contract con la DB real
  (`{id,name,symbol,decimals}`); la entidad `Currency` de index.ts quedó
  confirmada como drifted.
- Detalle de routing: el dispatcher envuelve TODO success como `{json}` con
  status 200 — el 201 de los handlers no sobrevive (convención existente).

**Frontend nuevo**:
- `ui/organisms/base-view.vue`: grilla/lista + switcher pill + buscador,
  persistencia de vista y búsqueda en localStorage por instancia (PRD §10.1).
- `ui/organisms/edit-drawer.vue`: overlay + panel (margen 16px, radius-lg,
  shadow-elevation), slide 250ms `cubic-bezier(0.32, 0.72, 0, 1)` en apertura
  Y cierre (§11.5 #7, verificado muestreando transform en el browser), focus
  trap con ciclo de Tab, Esc/overlay cierra y restaura foco al opener,
  resize por handle izquierdo con ancho en sessionStorage (PRD §9.1). El
  open state vive en la URL (`?tab=tipos&drawer=new` / `&edit=<id>`, zod §12.5).
- 4 formularios en `ui/organisms/config-drawers/`: tipo (nombre + módulos),
  estado (nombre + posición "Después de…" con normalización vía reorder),
  categoría (nombre + type requerido), moneda (nombre + símbolo + decimales).
  Los 4 usan `immediate: true` en el watch de open: sin eso, un deep-link
  que monta el drawer abierto no inicializa los campos.
- Tokens nuevos: `--shadow-elevation` (claro/oscuro), `--ease-drawer`,
  `--duration-drawer`; guard global de `prefers-reduced-motion` en main.css.

**Decisión de honestidad (R-38/C-5)**: el catálogo dibuja Color swatches y
Descripción en los drawers de tipo/estado/categoría, pero la API no los
persiste (types tiene solo name+modules; task_state solo name+order;
categories solo name+type_id). Los formularios editan exactamente lo que la
API guarda; color queda para una migración futura.

**Verificación runtime**: apertura (436→0px, 250ms, curva exacta), cierre
(0→436px + fade, luego unmount limpio), create/update de tipo, categoría y
moneda (todos 200 contra la API), estado insertado en posición media con
`states/reorder` de normalización (orden correcto en el board), switcher
grilla/lista persistente tras reload, cero errores de consola.

**Tests**: API 265 pass (4 nuevos: CRUD de categories, 400 cross-tenant,
createCurrency + 401 sin sesión). web-v3 73 pass (base-view, edit-drawer con
focus trap, config view con URL sync, dominio). Los tests agarraron 2 bugs
reales: el `??` en el focus inicial (panel robaba el foco al primer input) y
los campos sin inicializar en deep-link.

**Pendiente**: Cuentas (sin endpoints), color de tipo/estado/categoría
(migración de schema), contador "N tareas" por tipo, editar perfil,
reordenar estados con drag desde la UI.
