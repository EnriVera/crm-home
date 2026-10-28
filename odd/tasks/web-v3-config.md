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
