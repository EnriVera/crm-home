# Estado de web-v3 — handover

> Actualizado al cierre de la sesión del 2026-10-28/29. Para seguir mañana.

## Sesión 2026-10-30/31 (seguridad, QA visual y contrato)

| Cambio | Commit | Qué cambió |
| --- | --- | --- |
| Credencial SMTP fuera de los logs | `8afa8e3` | El banner del drain loop y el error de `parseSmtpUrl` ya no filtran el userinfo de `SMTP_URL` (hallazgo medium del audit) |
| Empty state fantasma | `a1ce67f` | `clients`, `incomes`, `expenses` y `transfers` mostraban el mensaje de estado vacío junto a la grilla poblada (faltaba el `v-if` que sí tenía `tasks`) |
| 404 visible con sesión | `3a1255a` | Cambio de contrato en PRD-v4 §7.2/§12.2/§12.4/§12.6: la ruta catch-all pasa a `public`, así que una URL inválida muestra la pantalla de "no encontrada" en vez de rebotar a `/dashboard`. ODD en `odd/not-found-public/tasks.md` |
| Seed de datos QA | `1f800c7` | `scripts/seed-qa-data.ts` genera un usuario QA con datos realistas vía la API real, para inspeccionar la SPA con moli |

**Auditoría de seguridad** (`~/security-audit-skill/crm-home/run-1/`): 3 hallazgos
confirmados (1 medium ya corregido, 2 low), 4 candidatos rechazados como
defectos de producto same-principal, y 1 candidato (stop del timer contra el
id espejado) reproducido en runtime: el browser manda el id de una corrida
ya cerrada, el server lo devuelve idempotente y la UI queda sin timer
mientras el servidor sigue con la corrida abierta (se auto-cierra a las 12h
con 43200s).

**Inspección visual con moli** (Chrome CDP, 11 rutas + flujos + móvil 390px):
consola limpia (solo los warnings intencionales de Nuxt `NUXT_E4011`/`E4007`
por el diseño RouterView-in-layouts, PRD §12.3), cero requests fallidos, sin
overflow horizontal en móvil.

## Qué está entregado (todo commiteado y verificado en runtime)

| Módulo | Commit | Qué se puede hacer |
| --- | --- | --- |
| **Dashboard** | `4bb0396` | 4 stat cards con datos reales, card "Timer activo" condicional con reloj en vivo, próximas tareas, actividad reciente |
| **/schedules** | `4bb0396`, `2f6870d` | Barra de timer, 3 stat cards, historial con filtro de rango, donut de tiempo por tipo, detalle por día con filtros |
| **/clients** | `4e2e5e4` | Grilla/lista, buscador, drawer de alta/edición, borrado que lista las dependencias |
| **/tasks** | `0d97b3b` | Kanban con drag & drop persistido, 3 vistas, drawer con descripción rich text, cascada tipo → categoría |
| **/config** | `0fbde27` | 6 tabs, BaseView, drawer lateral animado (abre y cierra), CRUD de tipos/estados/categorías/monedas |
| **Login/OTP** | `e7c687d`, `e586f39` | Login + verificación + restore de sesión; logout borrando la cookie |
| **Infra** | `312666f` | `make dev-v3` libera los puertos antes de arrancar (mató dev servers huérfanos) |

Detalle de cada módulo en su ODD: `odd/tasks/web-v3-{scaffold,auth-login,config,tasks,clients,schedules,chart-dashboard}.md`.

**Estado de los tests**: web-v3 152 pass, API 277 pass (con `TEST_DATABASE_URL`), lint y build limpios.

## Cómo seguir mañana

```bash
make dev-v3          # API :3000 + web-v3 :5175 (libera los puertos solo)
# base de datos de integración (los tests la necesitan):
cd apps/api && bun run test:db
```

Login: cualquier email nuevo + el código que sale del log de la API (el
generador real es aleatorio; en los tests se usa el fijo `041283`).

## Lo que queda (orden sugerido)

1. **Finanzas** (`/incomes`, `/expenses`, `/transfers`): son stubs, pero sus
   APIs ya existen y funcionan. El PRD-v4 §8.7 los marca Fase 2, aunque con
   el dashboard ya consuming `incomes.list` / `expenses.list`, es el
   siguiente paso natural.
2. **`/tasks-config`**: la ruta existe y lleva a `/config`; el catálogo la
   usa como "Configuración de tareas" (hoy el tab Estados lo cubre).
3. **Filtros del catálogo en /tasks** ("Filtros" con el ícono de embudo):
   la API no expone filtros por estado/tipo.
4. **Graficos de finanzas** (ingresos vs gastos): Fase 2 según PRD-v2 §8.2.

## Brechas de API conocidas (no son de UI)

| Falta | Impacto |
| --- | --- |
| **Color** en tipos/estados/tareas/categorías | El catálogo muestra puntos de color; no hay columna. Requiere migración. |
| **Fecha de vencimiento** en tasks | La card "3 vencen esta semana" del dashboard no se puede mostrar; el wire de task no la tiene. |
| **Contador "N tareas"** por tipo | El catálogo lo muestra en cada card de config. |
| **Editar el perfil** (nombre, email, estudio) | Hoy es read-only. |
| **`type_categories_client`** | La tabla existe pero la API no la expone: falta la regla de "tipos del cliente + globales" (PRD-v2 §8.3). |
| **Cuentas** (`accounts`) | La tabla existe, sin endpoints: el tab Cuentas de /config no se puede hacer. |
| **`tasks/types-for-form`** | Devuelve el id del type como nombre (lossy): el drawer usa `types.list` en su lugar. |
| **Filtro "Todos/Activos/Inactivos"** de clientes | La tabla `client` no tiene columna de estado. |

## Trampas del codebase (para no volver a pisarlas)

- **El `@` en los mensajes de i18n**: el tokenizador de vue-i18n lo lee
  como mensaje enlazado y revienta el render del componente. Los
  placeholders no llevan `@` (ver `auth.emailPlaceholder`).
- **El snapshot de XState no es reactivo para Vue**: el composable tiene
  que guardarlo en un `shallowRef` y actualizarlo con `actor.subscribe`.
- **Los `select` con `:value="null"`**: Vue le quita el atributo `value`, así
  que su `value` DOM es el TEXTO de la opción.
- **`clearInterval` sin guardas**: el style rule del repo las prohíbe (los
  timers se limpian siempre).
- **El contract miente sobre lo opcional**: `task_tast_id` y `task_type_id`
  son opcionales en el zod pero la API los exige (400).
- **El dispatcher envuelve todo success como `{json}` con status 200**: un
  201 en el handler nunca sobrevive.
- **LayerFS**: el read de texto trunca los archivos grandes (el lockfile de
  503 KB se leía como 582 líneas) → para verificar el Store usar `fs stat`
  (size), no diff por texto.

## Decisiones que hay que respetar

- Los drawers de creación/edición viven en la URL (`?drawer=new`, `?edit=<id>`)
  con el schema zod de §12.5.
- El drawer lateral se anima en apertura **y** cierre (250ms
  `cubic-bezier(0.32, 0.72, 0, 1)`, PRD §11.5 #7).
- Nada de color decorativo: el verde es el único acento (acción primaria,
  item activo, foco, éxito).
- Nada de modales: drawer o inline primero.
- Nada de UI con datos que la API no tiene: si no hay dato, no se dibuja
  (ausencia de dato, no placeholder).
