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

## Estado (cerrado 2026-10-28)

**Entregado**: commit `265a7f0` (feat). Store `main` y disco convergidos.

**Verificación (runtime, API real con Postgres)**: login por OTP → sesión →
`/dashboard` carga con `tasks/list` 200 y `tasks/states/list` 200. Con 6 tareas
creadas por API muestra los contadores correctos (Pendiente 1 / En progreso 2 /
Completado 3), "6 tareas en total" y las 5 más recientes ordenadas por
actualización con su estado. Con un usuario sin tareas: estado vacío con los dos
CTA y "0 tareas en total". Sin sesión, el guard redirige a
`/login?redirect=/dashboard`. Cero errores de consola.

**Tres cosas que aparecieron al verificar (build ≠ runtime)**:

1. **El path del wrapper orpc**: al generalizar `callAuth` a `callTasks` el
   `reduce` dejó de incluir el procedure en el path, y las llamadas iban a
   `/rpc/auth` en vez de `/rpc/auth/requestOtp` — un 404 silencioso. Ahora el
   path está cubierto por `tests/unit/orpc-client.test.ts`.
2. **Vite re-optimiza en runtime**: la primera ruta lazy que carga
   `@orpc/client` dispara el descubrimiento de dependencias, Vite re-optimiza y
   recarga la app a mitad del montaje → el boot muere con "withDirectives can
   only be used inside render functions". Fix: `vite.optimizeDeps.include` de
   los paquetes de `app/shared/vendor/`.
3. El `reduce` del walk truena con `TypeError` en vez del error claro cuando el
   procedure no existe; ahora es tolerante y dice qué falta.

**Brechas de la API confirmadas contra el schema real** (no inferidas):

- `schedule` en la DB **no es** el módulo Schedule de PRD-v2 §8.4: es reglas
  recurrentes de dinero (`sche_name`, `sche_acco_id`, `sche_amount`,
  `sche_frequency`, `sche_next_run_date`). **No existe `schedule_items`**, ni
  endpoint de timer, ni websocket/heartbeat en `apps/api`. PRD-v2 §11 define un
  par `schedule`/`schedule_items` completamente distinto. La colisión de nombre
  requiere decisión (ver abajo).
- `task` **no tiene columna de fecha**: `task_due_date` aparece en PRD-v2 §13 y
  PRD-v4 asume fechas en las filas, pero ninguna migración la crea.

**Decisiones de producto tomadas (2026-10-28)**: la card del timer renderiza el
CTA vacío; no se tocan stat cards de ingresos ni "Actividad reciente" (Fase 2 y
sin fuente de datos).

**Pendiente para la próxima**:

- `/tasks` (kanban + drawer + drag & drop) es el siguiente feature grande: es
  lo que el dashboard ya cuenta.
- **Logout** (PRD-v2 §8.1) y **tema persistido en la cuenta**
  (`auth.updateTheme` existe en la API; el store de tema solo usa localStorage)
  son slices chicos y cerrados que cierran criterios de aceptación.
- **Desambiguar `schedule`**: renombrar el módulo existente a "reglas
  recurrentes" y planear el timer aparte, o mantenerlo y documentar que el
  Schedule del PRD no entra en este corte.
