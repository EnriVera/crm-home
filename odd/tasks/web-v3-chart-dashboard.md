# ODD — web-v3: gráfica del timer + dashboard con datos reales

Feature: la parte que faltaba de §8.5 (gráfica + detalle por día) y el
dashboard de §8.3 con los datos reales del timer.

Workflow: LayerFS (`./lf fork odd-web-v3-chart` -> implementar -> land ->
commit `feat(web-v3):`).

## Alcance

**/schedules**
- Donut "Tiempo por tipo" (el tiempo del rango por tipo).
- Detalle por día con buscador y filtros por tipo, categoría y tarea, y el
  tipo de ejecución (manual / reanudado).

**/dashboard**
- Card "Timer activo" **condicional** (PRD-v4 §8.3: sólo cuando hay un
  timer corriendo, con el elapsed en vivo y el botón de parar).
- 4 stat cards con datos reales: ingresos del mes, gastos del mes, tareas
  activas y clientes (las dos primeras salen de las APIs de finanzas, que ya
  existían).
- Card "Próximas tareas" (2/3) y "Actividad reciente" (1/3, con las
  corridas del timer).

## Decisiones

**El donut va en SVG propio, no con unovis.** El PRD-v4 §8.5 pide "donut
unovis", pero el wrapper Vue de unovis v1.7 no renderizaba los arcos en
esta app: el SVG quedaba con el anillo de fondo y el grupo de arcos vacío.
Se probó con la config en el container y en el chart, con colores literales
y con var() de los tokens, y con y sin ids vacíos. El SVG propio se
controla entero, usa la paleta de datos de los tokens y no depende de la
librería. unovis queda instalada (stack locked) para los charts futures.

**El dashboard usa el MISMO composable de timer que /schedules.** Con dos
composables distintos, el reloj del dashboard mostraba 00:00:00 mientras el
timer llevaba 14 minutos corriendo (el actor de XState del dashboard nunca
se sincronizaba con el server). Ahora `useTimer` es la única fuente del
estado del timer.

**El símbolo de la moneda.** La API no tiene "moneda por defecto" (`currency`
es una tabla global sin flag): se usa la moneda del último movimiento del
usuario y, si no hay movimientos, la primera por id (la sembrada al crear la
cuenta).

**El timer se auto-cierra en su último heartbeat** (no en start + 12h),
como dice PRD-v2 §8.4: si el latido tiene más de 12h, la corrida se cierra
en ese momento y el usuario puede ajustarla a mano.

## No-goals
- **Vencimiento de las tareas**: el wire de task no tiene fecha de
  vencimiento, así que la fila del dashboard muestra "Cliente · Tipo" en
  lugar de "Cliente · vence <fecha>".
- **Punto de color por fila**: sin columna de color en la DB.
- **Gráficas de finanzas**: las cards de dinero usan los totales del mes; el
  "ingresos vs gastos" con gráfico es Fase 2 (PRD-v2 §8.2).

## Estado (cerrado 2026-10-29)

**Verificación runtime (API real)**: el dashboard muestra el timer
corriendo con su reloj en vivo (00:14:13), las 4 stat cards con los
totales reales, la actividad reciente con las corridas del timer y las
próximas tareas. El donut dibuja las porciones con la paleta de tokens y
el total en el centro; el detalle por día agrupa las ejecuciones con sus
filtros. Cero errores de consola.

**Tests**: web-v3 152 pass (nuevos: agrupación del donut, filtros del
detalle, y el dashboard reescrito con el timer condicional). API 272 pass.

**Pendiente**: el `filter` de "todas/tareas vencen esta semana" del catálogo
(la API no expone tareas vencidas) y los gráficos de finanzas (Fase 2).
