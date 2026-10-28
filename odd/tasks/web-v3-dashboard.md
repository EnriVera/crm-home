# ODD — web-v3 dashboard MVP

Feature: `/dashboard` real en apps/web-v3 — la primera pantalla autenticada que
consume datos de lectura. Ejercita el stack orpc de lectura (no solo escritura como
el auth), el guard, el AppShell y el store de sesión.

Workflow: LayerFS (`./lf fork odd-web-v3-dashboard` → implementar → land → commit
`feat(web-v3):`, prefix PRD §15.1).

## Contrato (fuentes normativas)

- PRD-v4 §8.3 (Dashboard, visual contra `dashboard.png`)
- PRD-v2 §8.2 (**MVP / Fase 1**: timer activo + tareas agrupadas por estado +
  últimas 5 tareas actualizadas; los balances por cuenta y el gráfico de tiempo
  son Fase 2)
- PRD-v2 §32 (Fase 1 = MVP; finance es Fase 2)
- PRD-v4 §11.5 (motion, estados y bans), §12.4 (guard)

## Alcance

- Card del timer: **CTA vacío** "Iniciá tu primer timer" → `/schedules`. Decisión
  de producto 2026-10-28: no hay timer en la API, así que la card no inventa
  datos (PRD-v2 §8.2: "nunca una pantalla en blanco").
- Stat cards: **contadores por estado** (Pendiente / En progreso / Completado),
  que es el "resumen de tareas agrupadas por estado" de PRD-v2 §8.2. Los stat
  cards de ingresos/balances del catálogo son Fase 2 y quedan fuera.
- Card "Últimas 5 tareas actualizadas" con el estado de cada una.
- Estado vacío definido: usuario sin tareas ve los dos CTA ("creá tu primera
  tarea", "iniciá tu primer timer").
- Vendor wrapper de tasks (`app/shared/vendor/orpc`): la tabla de procedimientos
  crece; el wrapper sigue siendo la única puerta a `@orpc/client`.
- Infrastructure: adapter de tasks que mapea el shape **snake_case del wire** al
  shape camelCase del dominio.
- Domain: value objects puros del dashboard (sin Vue/Nuxt/orpc — §11.4).
- Composable `use-dashboard`: carga tareas + estados, expone contadores, últimas
  tareas y estados de carga/error.
- Tests unitarios del composable y de la view.

## No-goals

- **Cerrar sesión / menú de usuario**: el AppShell muestra hoy un avatar fijo.
  Es un feature aparte (PRD-v2 §8.1 pide logout desde Config).
- **Persistencia del tema en la cuenta**: el backend tiene `auth.updateTheme` y
  el store de tema solo usa localStorage. Sincronizarlo es un feature aparte.
- **Stat cards de ingresos/balances** y **card "Actividad reciente"**: Fase 2, y
  no hay fuente de datos para actividad.
- **Fechas de vencimiento en las tareas**: la tabla `task` no tiene columna de
  fecha (el `task_due_date` del PRD-v2 §13 no está en ninguna migración).
- **`/tasks`, `/schedules`, `/clients`, `/config`**: son features propios.
- **Migración de backend**: §15.1 permite un único cambio (CORS, ya hecho).

## Estado

_(pendiente)_
