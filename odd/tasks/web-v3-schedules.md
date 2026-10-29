# ODD — web-v3 /schedules (el timer)

Feature: `/schedules` funcional en apps/web-v3. Barra de timer, stat cards y
historial (PRD-v4 §8.5, PRD-v2 §8.4).

Workflow: LayerFS (`./lf fork odd-web-v3-schedules` -> implementar -> land ->
commit `feat(web-v3):`).

## El hallazgo que cambió el alcance

**El módulo `schedule` que ya existía NO es el timer.** La tabla `schedule`
(migración 006) y sus endpoints (`/schedules/list|get|create|update|remove`)
son REGLAS RECURRENTES DE COBRO (nombre + monto + cuenta + frecuencia +
próxima ejecución). El `/schedules` del PRD es el TIMER: barra de timer,
heartbeat, auto-cierre de 12hs, historial y gráfica.

El contrato `@crm/contract/schedule` mezcla las dos cosas: el router
(`schedulesContract`) describe la regla recurrente, mientras que las
ENTIDADES de `schedule/index.ts` (`Schedule` con title/clientId/taskId y
`ScheduleItem` con start/end/duration/origin/lastHeartbeat) describen el
timer. Ninguna de las dos estaba implementada: no había tabla ni endpoints
de timer (`startTimer`, `stopTimer`, `heartbeat` no existían).

Decisión: el timer se implementa como contexto NUEVO (`timers/*`), con su
tabla (`timer_run`, migración 008). El nombre `schedule` queda para las
reglas recurrentes, que no son parte del Phase 1 del front.

## Alcance
- Barra de timer: en reposo, un campo para escribir qué hacés (timer libre)
  con las tareas del usuario como autocompletado; corriendo, el título, los
  chips de tipo/categoría, el reloj grande y el botón de parar.
- Stat cards: hoy, esta semana y la tarea con más horas.
- Historial con filtro de rango (hoy / esta semana), restart y reanudar.
- Workflow del timer en XState (PRD-v4 §11.1).

## Backend (agregado)
- Migración `008_timer_runs`: tabla `timer_run` (prefijo `timr_`), con
  índice parcial de "un timer abierto por usuario".
- `timers/current|start|stop|heartbeat|history` (contract + use cases +
  routes + wiring + 5 tests de integración).
- Reglas: un timer abierto por usuario (arrancar uno cierra el anterior),
  auto-cierre a las 12 horas, y heartbeat (latido) para detectar timers
  abandonados.

## No-goals
- **Gráfica donut (unovis)**: el catálogo la muestra en la parte de abajo
  del §8.5; la pantalla entrega barra + stats + historial. La tabla de
  detalle por día con filtros tipo/categoría/tarea tampoco: el historial ya
  trae los datos para un futuro chart.
- **Autocompletado de clientes/tipos al arrancar un timer**: la barra ofrece
  el timer libre y el autocompletado de tareas (que es lo que dice el
  subtítulo del catálogo).

## Estado (cerrado 2026-10-28)

**Criterios de PRD-v2 §8.4, verificados contra la API real:**
- Un schedule libre se guarda sin tarea, cliente, tipo ni categoría ✓
  (test de integración + verificado en el browser).
- Cerrar el browser con timer corriendo y volver: el tiempo no se pierde ✓
  (el `start` es del server; tras recargar la pantalla el reloj seguía
  corriendo con el elapsed recalculado).
- Un timer que cruza medianoche reporta duración correcta ✓ (la duración se
  calcula desde el `start` del server; `totalSeconds` recorta por el
  período).
- Iniciar un schedule desde el historial cierra el que estaba corriendo ✓
  (el server cierra el abierto al arrancar uno nuevo).

**Dos bugs que encontró la verificación:**
1. El snapshot de XState no es reactivo para Vue: el `computed` del
   composable no se re-evaluaba y la barra nunca pasaba a "corriendo".
   Ahora el snapshot vive en un `shallowRef` que se actualiza con
   `actor.subscribe`.
2. El total del stat recortaba el último segundo de una corrida ya cerrada
   (el `now` del navegador va un segundo atrás del `end` del server). Ahora
   una corrida cerrada cuenta con su propio `end`.

**Verificación runtime**: `timers/current`, `start`, `stop`, `history` 200.
Start → el reloj corre; stop → la corrida queda en el historial con su
rango horario y duración; recargar → el timer sigue vivo; restart desde el
historial → arranca la corrida con el mismo título. Cero errores de consola.

**Tests**: web-v3 142 pass (dominio del timer, máquina XState y el resto),
API 272 pass (5 nuevos del timer + el suite ahora es reproducible: el test
de la migración 002 limpia los usuarios que siembra).

**Pendiente**: la gráfica donut + la tabla de detalle por día con filtros
(§8.5), y el link del timer con una task vía autocomplete de clientes/tipos.
