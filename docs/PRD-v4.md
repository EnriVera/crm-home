# CRM-HOME — PRD v4 (web-v3)

> **Status:** supersedes PRD-v3. Introduces a new Nuxt 4 frontend (`apps/web-v3`) that ships the same Phase 1 product, replicating the visual design frozen in the screen catalogue `docs/img/CRM-HOME — Diseño UI (web-v2)/` (23 images: 14 page screens + 9 `lateral-derecho-*.png` drawers). This document is the consolidation of `docs/PRD.md`, `docs/PRD-v2.md`, `docs/PRD-v3.md` and `docs/PRD-DESIGN.md`, and is the single source of truth going forward.
>
> **Backend is unchanged except the one-line dev CORS origin for web-v3.** `apps/api` (nitro + h3 + orpc + kysely + PostgreSQL) is the single source of truth. `web-v3` consumes the existing orpc contract via `@crm/contract`. The single permitted backend change is adding the `http://localhost:5175` dev origin to the CORS allowlist (`apps/api/src/http/composition-root.ts`); it is dev-infra and does not change the contract nor the product (§15.1, §17).
>
> **Coexistence:** `apps/web` (octane) and `apps/web-v2` (Vue 3 + Vite SPA) stay in the monorepo and are **frozen** (bugfix-only). They are removed when `web-v3` passes the cutover gate (§15).
>
> **Repository:** monorepo branch is `develop` (per PRD-v2 §6.10). All `web-v3` work lives on `develop` alongside the other apps.

---

## 0. Delta from PRD-v3 (summary)

| Area | PRD-v3 (`web-v2`) | PRD-v4 (this document, `web-v3`) |
| --- | --- | --- |
| Frontend framework | Vue 3.5 + Vite 8 SPA | **Nuxt 4** (Vue 3.5 + Nitro dev/build layer) |
| Rendering mode | SPA (Vite) | **SPA (`ssr: false`)** — Decision D-v4-1 (§11.2) |
| Routing | TanStack Router, file-based under `src/router/routes/` | **vue-router with a single route table file** — `pages: false`, no file-based routes (§12). Requirement fijada por el dueño de producto. |
| Route guards | `require-session.ts` guards | Nuxt route middleware (`app/middleware/`) reading route `meta` (§12.4) |
| App state | Pinia (manual install) | Pinia vía `@pinia/nuxt` (mismo contrato de stores) |
| i18n | `vue-i18n` manual | `@nuxtjs/i18n` (encapsulated igual en `shared/vendor/i18n/`) |
| Auto-imports | None | Nuxt auto-imports habilitados **solo** para composables/utils propios bajo `app/`; vendor wrappers siguen siendo la única puerta de entrada a librerías |
| Directory convention | `src/` plano | Convenciones Nuxt 4: `app/`, `shared/`, `server/` deshabilitado para API (el backend es `apps/api`) |
| Design | oil-ui direction (PRD-DESIGN) | **Congelada**: la dirección visual queda especificada por el catálogo de 23 imágenes — 14 pantallas + 9 laterales (§7–§9) + tokens (§8) |
| Backend | nitro + h3 + orpc + kysely + PostgreSQL | **Unchanged** except the one-line dev CORS origin for web-v3 (`http://localhost:5175`, §15.1) |
| Product rules (PRD-v2 §6), modules (§8), DB schema (§11), seeds (§12) | inherited | **Inherited unchanged** |

Everything not listed above is inherited from PRD-v3 (which inherits from PRD-v2).

---

## 1. Problema

Los freelancers y consultores independientes gestionan hoy su trabajo con herramientas fragmentadas: tareas en Trello, tiempo en Toggl/Clockify, finanzas en Excel o Notion. Ninguna conecta entre sí **qué hago**, **cuánto tiempo me lleva** y **cuánto dinero genera**. El resultado: no saben qué clientes son rentables, pierden horas sin trackear y duplican carga de datos.

## 2. Usuario objetivo

- **Primario:** freelancer / consultor independiente que trabaja con varios clientes y necesita tareas, tiempo y finanzas en un solo lugar.
- **Secundario:** profesional que quiere un CRM + time-tracking + finanzas personales unificado, aunque no facture por hora.

## 3. Propuesta de valor

Una sola aplicación web donde las tareas, el tiempo trackeado y los movimientos de dinero comparten los mismos tipos, categorías y clientes — permitiendo responder "¿en qué se me fue el día?" y "¿qué cliente me deja más plata?" sin exportar nada.

## 4. Métricas de éxito

| Métrica | Objetivo |
| --- | --- |
| Activación | El usuario trackea su primer timer dentro de las primeras 24 hs de registrado |
| Retención semanal | ≥ 4 días/semana con al menos una acción (tarea, timer o movimiento) |
| Adopción de time-tracking | ≥ 60% de las tareas completadas tienen tiempo asociado |
| Adopción de finanzas (Fase 2) | ≥ 5 movimientos registrados/semana por usuario activo |

## 5. Alcance — MVP y fases

### Fase 1 (MVP)

- Login/registro passwordless (OTP por email) + sesión persistente + cerrar sesión.
- Config: usuario, apariencia, tipos, categorías, cuentas, apps, monedas, adjuntos.
- Clients (CRUD simple — necesario para tareas).
- Tasks completo (vistas grilla/kanban/lista, drag & drop, `/tasks-config` con estados).
- Schedule completo (timer libre o ligado a tarea, historial, gráfico, reporte diario).
- Dashboard mínimo: timer activo + tareas agrupadas por estado.
- Modo oscuro/claro configurable desde Config (persistido en la cuenta del usuario).
- Páginas legales públicas: Términos y condiciones, Política de privacidad y Política de cookies, con registro de aceptación.
- Telemetría backend con OpenTelemetry: trazas por request + métricas básicas, export OTLP configurable por entorno.

### Fase 2

- Finance: income, expenses, transfers.
- Dashboard financiero: balances por cuenta, ingresos vs gastos del mes.
- Adjuntos en todos los módulos.

### Fase 3 (futuro, fuera de compromiso)

- Reportes avanzados (rentabilidad por cliente, exportación CSV/PDF).
- Más herramientas modulares (la arquitectura ya lo soporta vía tabla `apps`).
- SSR/hybrid rendering si aparece una necesidad real de SEO o first-paint (ver riesgo §17).

### No-goals (explícitos)

- App mobile nativa (la web debe ser responsive, nada más).
- Conversión automática de monedas / cotizaciones.
- Facturación electrónica, invoices, integraciones contables.
- Colaboración entre usuarios (compartir tareas, workspaces).
- Notificaciones push.

## 6. Decisiones de producto globales (inherited from PRD-v2 §6, unchanged)

1. **Multi-user con aislamiento total:** toda tabla de negocio lleva `<prefix>_user_id`. Toda query filtra por el usuario autenticado.
2. **Registro implícito:** no hay formulario de registro. La primera vez que un email valida un OTP correctamente, se crea el usuario y se le siembran sus datos por defecto.
3. **Borrado lógico universal:** toda tabla tiene `created_at`, `updated_at`, `deleted_at` (ver excepciones §13).
4. **Saldos calculados, no mutados:** `acco_initial_amount + ingresos − gastos ± transferencias` (excluyendo `deleted_at`).
5. **Modelo de sincronización:** CRUD por HTTP (orpc + TanStack Query con cache de nitro). Websocket ÚNICAMENTE para (a) invalidación `{entity, id, action}` y (b) heartbeat del timer. Ningún CRUD depende del websocket.
6. **Moneda:** una cuenta tiene una sola moneda. Transferencias entre cuentas de distinta moneda fuera del MVP (la UI lo bloquea con mensaje claro).
7. **Aislamiento de herramientas (ports & adapters):** ninguna librería de terceros se importa directamente desde la lógica de negocio, ni en backend ni en frontend (ver §10.3).
8. **Tema claro/oscuro:** `user_theme` en la cuenta del usuario; páginas públicas usan preferencia del SO.
9. **Telemetría vendor-neutral:** OpenTelemetry + OTLP por entorno. MVP: trazas + métricas de backend únicamente; el frontend solo propaga W3C `traceparent`.
10. **Flujo git:** `main` + `develop`; Conventional Commits enforced por husky + commitlint.

## 7. Navegación y rutas

### 7.1 Árbol de navegación (sidebar)

```text
|- Dashboard          /dashboard        (Fase 1)
|- Tareas             /tasks            (Fase 1)
|- Schedule           /schedules        (Fase 1)
|- Clients            /clients          (Fase 1)
|- Finance                                (grupo — Fase 2)
|  |- Income          /incomes
|  |- Expenses        /expenses
|  |- Transfers       /transfers
|- Config             /config           (Fase 1)
```

### 7.2 Tabla canónica de rutas (fuente única de verdad)

| Pantalla | URL | Ícono (Phosphor) | Fase | Acción primaria | Referencia visual |
| --- | --- | --- | --- | --- | --- |
| Redirect por sesión | `/` | — | 1 | — | — |
| Login | `/login` | `EnvelopeSimple` | 1 | Enviar código | `docs/img/CRM-HOME — Diseño UI (web-v2)/login.png` |
| Verificación OTP | `/login-verification` | `LockKeyOpen` | 1 | Verificar | `docs/img/CRM-HOME — Diseño UI (web-v2)/otp.png` |
| Dashboard | `/dashboard` | `SquaresFour` | 1 | Iniciar timer (si no hay ninguno) / Nueva tarea | `docs/img/CRM-HOME — Diseño UI (web-v2)/dashboard.png` |
| Tareas | `/tasks` | `CheckSquare` | 1 | Nueva tarea (`Plus`) | `docs/img/CRM-HOME — Diseño UI (web-v2)/tareas.png` |
| Config de tareas | `/tasks-config` | `SlidersHorizontal` | 1 | Nuevo estado | `docs/img/CRM-HOME — Diseño UI (web-v2)/configuracion-estados-de-tareas.png` |
| Schedule | `/schedules` | `Clock` | 1 | Play (`Play`) | `docs/img/CRM-HOME — Diseño UI (web-v2)/schedule.png` |
| Clients | `/clients` | `Users` | 1 | Nuevo cliente | `docs/img/CRM-HOME — Diseño UI (web-v2)/clientes.png` |
| Income | `/incomes` | `TrendUp` | 2 | Nuevo ingreso | `docs/img/CRM-HOME — Diseño UI (web-v2)/ingresos.png` |
| Expenses | `/expenses` | `TrendDown` | 2 | Nuevo gasto | `docs/img/CRM-HOME — Diseño UI (web-v2)/gastos.png` |
| Transfers | `/transfers` | `ArrowsLeftRight` | 2 | Nueva transferencia | `docs/img/CRM-HOME — Diseño UI (web-v2)/trasferencias.png` |
| Config | `/config` | `Gear` | 1 | — (tabs; acción por tab) | `docs/img/CRM-HOME — Diseño UI (web-v2)/configuracion-perfil.png` + `configuracion-tipos.png`, `configuracion-categorias.png`, `configuracion-cuentas.png` |
| Términos | `/terms` | — (pública, footer) | 1 | — | — |
| Privacidad | `/privacy` | — (pública, footer) | 1 | — | — |
| Cookies | `/cookies` | — (pública, footer) | 1 | — | — |

**Reglas:**

- Una **única acción primaria por pantalla** (botón verde sólido, pill). Todo lo demás es ghost/secondary.
- El footer del login y del shell linkean las tres páginas legales.
- Tabs, drawers y filtros se reflejan en la URL (deep-linking) con search params validados por zod (§12.5).

---

## 8. Módulos — especificación funcional + visual

Product rules and acceptance criteria from PRD-v2 §8 are **inherited unchanged** for every module. This section adds the **visual definition** extracted from the screen catalogue. Where a mock and a rule conflict, the rule wins and the mock is adjusted (conflicts are listed in §17).

### 8.1 AppShell (layout de toda la app autenticada)

Referencia: cualquier pantalla autenticada, ej. `dashboard.png`.

- Sidebar izquierda (`surface-2`, resizable, colapsable a íconos): logo CRM-HOME (cuadrado verde redondeado con ícono hoja) + marca; secciones con label en mayúsculas gris (`GENERAL`, `FINANZAS`, `SISTEMA`); item activo con tinte verde suave + barra indicadora de 3px a la izquierda + label en verde. **Un solo item activo.**
- Topbar fina: breadcrumb `CRM-HOME / <Sección>` a la izquierda; a la derecha toggle de tema (ícono sol/gear) + avatar circular con iniciales sobre tinte verde.
- Área principal: fondo `#fafafa`, padding generoso (24–32px), título de página + subtítulo descriptivo + acción primaria arriba a la derecha.
- El lateral derecho de creación/edición es un **drawer superpuesto** (no empuja el contenido): panel blanco con margen de 16px respecto al viewport, overlay gris semitransparente (§9).

### 8.2 Login (`/login`) y OTP (`/login-verification`)

Referencias: `login.png`, `otp.png`. Funcional: PRD-v2 §8.1.

- Layout público de dos columnas sobre fondo claro con degradado radial verde muy sutil (esquina superior izquierda).
- Columna izquierda (branding): logo + titular grande "Tu estudio, en orden." + subtítulo + 3 bullets con check verde en círculo tintado.
- Columna derecha (formulario): card/form centrado.
  - **Login:** título "Iniciar sesión", subtítulo, label + input redondeado con ícono sobre (envelope), hint con ícono info "Sin contraseña: te enviamos un código por email", botón primario verde ancho "Enviar código".
  - **OTP:** ícono escudo en círculo tintado verde, título "Verificación en dos pasos", subtítulo con el email destino, 6 cajas de dígito (la caja enfocada con borde verde + cursor), botón "Verificar", countdown "Reenviar código (00:24)" y link verde "← Volver al inicio de sesión".
- Errores inline en el formulario (no toast). Tema: preferencia del SO.

### 8.3 Dashboard (`/dashboard`)

Referencia: `dashboard.png`. Funcional: PRD-v2 §8.2.

- Header: "Dashboard" + "Resumen de tu actividad al <fecha>" + botón primario "+ Nueva tarea".
- Fila de 4 stat cards (igual ancho, `radius-lg`, superficie blanca, hairline): label en mayúsculas gris, valor grande (dinero con símbolo, contadores en nútero), delta secundaria (positiva en verde `primary-700`, negativa en gris/rojo suave). Ejemplos del catálogo: INGRESOS DEL MES `$ 1.840.000` `+12% vs. mayo`; TAREAS ACTIVAS `12` `3 vencen esta semana`.
- Card "Próximas tareas" (2/3 del ancho): header con link "Ver todas"; filas con punto de color del tipo, título, "Cliente · vence <fecha>", chip pill de categoría con su color de dato alineado a la derecha.
- Card "Actividad reciente" (1/3): feed con ícono en círculo tintado + texto de la acción + timestamp gris.
- Estado vacío: CTAs "Iniciá tu primer timer" / "Creá tu primera tarea", ícono del módulo en círculo `primary-50`.

### 8.4 Tareas (`/tasks`)

Referencia: `tareas.png`. Funcional: PRD-v2 §8.3 (drawer de creación, reglas tipo/categoría/cliente, kanban con dnd persistido, `/tasks-config`).

- Header: "Tareas" + "Tablero por estado · <n> tareas activas" + botón primario "+ Nueva tarea".
- Toolbar: buscador pill "Filtrar por nombre, cliente o tipo…", botón ghost "Filtros" (funnel), switcher de vistas (grilla/lista/kanban) como segmented control pill con la vista activa en tinte verde.
- Vista kanban (default del catálogo): columnas por estado con punto de color del estado + nombre + contador + botón `+` por columna; cards blancas redondeadas con sombra sutil: título, cliente, chip de categoría pill con su color + fecha límite a la derecha.
- Drag & drop: lift de la card (sombra funcional + ring verde + leve scale), columna destino tintada; drop con FLIP suave; persistencia `task_kanban_order` (PRD-v2 §8.3).
- Drawer "Nueva tarea": §9.2.

### 8.5 Schedule (`/schedules`)

Referencia: `schedule.png`. Funcional: PRD-v2 §8.4 (timer libre o ligado a tarea, autocomplete, heartbeat, auto-cierre 12 hs, regla un timer abierto).

- Barra de timer: campo compuesto pill de ancho completo; estado activo con borde verde 2px. Contenido: ícono reloj, texto de la tarea (o libre), chips de tipo/categoría, timer grande en `tabular-nums`, botón circular verde con `Square` (stop) al correr / `Play` (play) en reposo.
- Fila de 3 stat cards: HOY `4h 35m` "Timer corriendo ahora" (verde), ESTA SEMANA `26h 10m`, TAREA CON MÁS HORAS `8h 20m` + nombre.
- Card "Historial de hoy" con filtro de rango (dropdown "Esta semana"): filas con punto de color, título, subtítulo "Cliente · Tipo · Categoría", rango horario `09:12 – 10:50`, duración, botón restart (circular arrow) y botón play (círculo tintado verde). Footer derecho en verde: "Total registrado hoy: 4h 37m".
- Gráfico (PRD-v2 §8.4.3) y detalle por día con filtros: donut `unovis` + tabla con buscador y filtros tipo/categoría/tarea.

### 8.6 Clients (`/clients`)

Referencia: `clientes.png`. Funcional: PRD-v2 §8.5.

- Header: "Clientes" + "8 clientes · 5 activos" + botón primario "+ Nuevo cliente".
- Buscador pill + pills de filtro (Todos / Activos / Inactivos), activa en tinte verde.
- Grilla de cards: avatar circular con iniciales sobre tinte de color, nombre, subtítulo "Rubro · Ciudad", email con ícono, pill de estado a la derecha (Activo verde / Pendiente ámbar / Inactivo gris).
- Card dashed "Agregar cliente" como CTA adicional al final de la grilla.
- Drawer "Nuevo cliente": §9.2.

### 8.7 Finance — Income / Expenses / Transfers (Fase 2)

Referencias: `ingresos.png`, `gastos.png`, `trasferencias.png`. Funcional y reglas de negocio: PRD-v2 §8.6 (montos > 0, exclusividad destino transfer, no auto-transferencia, balance calculado).

- Mismo patrón de página en los tres módulos: header + acción primaria + fila de 3 stat cards + tabla.
- **Income:** cards COBRADO ESTE MES (+delta) / PENDIENTE DE COBRO ("3 facturas abiertas") / TICKET PROMEDIO. Tabla FECHA · CONCEPTO · CLIENTE · CUENTA (punto de color + nombre) · MONTO · ESTADO (pill Cobrado verde / Pendiente ámbar).
- **Expenses:** cards GASTOS DEL MES / POR PAGAR / MAYOR CATEGORÍA. Tabla FECHA · CONCEPTO · CATEGORÍA (chip pill con color) · CUENTA · MONTO · ESTADO (Pagado/Pendiente).
- **Transfers:** cards TRANSFERIDO ESTE MES ("3 movimientos") / CUENTAS ACTIVAS ("2 bancos · 2 billeteras") / ÚLTIMO MOVIMIENTO ("24 jun", "Banco Nación → Brubank"). Tabla FECHA · ORIGEN → DESTINO (chip origen con ícono en círculo tintado + flecha → + chip destino) · NOTA · MONTO · ESTADO (Completada verde).
- Drawers: §9.2.

### 8.8 Config (`/config`)

Referencias: `configuracion-perfil.png`, `configuracion-estados-de-tareas.png`, `configuracion-tipos.png`, `configuracion-categorias.png`, `configuracion-cuentas.png`. Funcional: PRD-v2 §8.7.

- Header: "Configuración" + subtítulo por contexto.
- Tab bar ancho estilo pill segmented: **Perfil · Estados de tarea · Tipos · Categorías · Cuentas** (la imagen muestra 5 tabs; `apps`, `monedas` y `adjuntos` de PRD-v2 §8.7 se agregan al mismo patrón; ver §17). Tab activa en tinte verde. Los tabs son search params (`/config?tab=tipos`).
- **Perfil:** card "Información personal" (avatar con iniciales + "Cambiar foto" ghost + Nombre completo / Email / Estudio), card "Apariencia" (3 tarjetas seleccionables Claro/Oscuro/Sistema con ícono; la activa con borde verde + check), card "Sesión" ("Sesión activa · último acceso…" + botón "Cerrar sesión" con ícono sign-out a la derecha).
- **Tipos / Categorías / Estados:** buscador pill, grilla de cards (punto de color + nombre + conteo "N tareas" + menú "⋯"), card dashed "Agregar …", banner informativo verde con ícono info al pie ("Las categorías te ayudan a filtrar tareas…").
- **Cuentas:** grilla de cards con ícono en círculo tintado + nombre + tipo ("Banco", "Billetera virtual", "Efectivo") + saldo en verde con símbolo de moneda; card dashed "Agregar cuenta"; banner informativo.

### 8.9 Páginas legales (`/terms`, `/privacy`, `/cookies`)

Funcional: PRD-v2 §8.8 (públicas, contenido markdown versionado, aceptación registrada en registro implícito, re-aceptación Fase 2).

## 9. Laterales derechos (drawers de creación/edición)

### 9.1 Anatomía del drawer (patrón transversal)

Referencias: las 9 imágenes `lateral-derecho-*.png`.

- Panel blanco fijo a la derecha, **margen de 16px respecto a los bordes del viewport** (top/right/bottom), `radius` generoso en las esquinas visibles, overlay gris semitransparente que cierra al click.
- Header: título ("Nueva tarea", "Nuevo cliente", …) + `X` de cierre; hairline separador.
- Body con scroll: campos apilados, label arriba del control, inputs redondeados hairline.
- Footer pegado: `Cancelar` (ghost) izquierda + `Guardar` (primario verde) derecha, sobre hairline.
- Drawer reflejado en URL (`?drawer=new-task`, `?edit=<id>`), tipado con zod (§12.5).
- El drawer es **resizable** (vue-resizable-panels) y su ancho persiste por sesión.

### 9.2 Especificación por formulario

| Drawer | Imagen | Campos (orden) |
| --- | --- | --- |
| Nueva tarea | `lateral-derecho-tareas.png` | Título · Descripción (tiptap, toolbar mínima B/I/lista/link) · Cliente (select con avatar, opcional) · Tipo (obligatorio) + Categoría (deshabilitada hasta elegir tipo, PRD-v2 §8.3) en 2 columnas · Estado inicial + Fecha límite (date picker) en 2 columnas · Adjuntos (dropzone dashed, Fase 2) |
| Nuevo cliente | `lateral-derecho-clientes.png` | Avatar (círculo con ícono user + badge `+` verde para subir) · Nombre/Empresa (obligatorio) · Email · Teléfono (un campo, varchar: soporta `+54 9 11 0000-1111`) · País (select) · Rubro · Notas (textarea) |
| Nuevo ingreso | `lateral-derecho-ingreso.png` | Hero card de Monto (fondo tinte verde, número grande, código de moneda a la derecha) · Concepto · Cuenta destino (select con punto de color) · Cliente (opcional, con avatar) · Fecha + Estado de cobro (2 col; pill Cobrado/Pendiente con punto) · Nota |
| Nuevo egreso | `lateral-derecho-egreso.png` | Hero card de Monto (tinte rojo suave, label "MONTO" en rojo) · Concepto · Categoría (select con punto de color) · Cuenta origen · Fecha + Estado de pago (2 col) · Nota |
| Nueva transferencia | `lateral-derecho-trasferencia.png` | Hero card de Monto a transferir · Card Origen (cuenta con ícono + "Disponible: $ X") + flecha swap + Card Destino (cuenta + "Saldo actual: $ X") · banner ámbar si las monedas coinciden ("Sin conversión aplicada") · Fecha · Nota (opcional) · strip de previsualización ("Origen quedará en $ X · Destino en $ Y") |
| Nueva cuenta | `lateral-derecho-cuenta.png` | Nombre de la cuenta · Tipo de cuenta (select con ícono: Banco/Billetera/Efectivo) · Moneda + Saldo inicial (2 col) · Color (8 swatches; el seleccionado con ring verde) |
| Nuevo tipo | `lateral-derecho-tipo.png` | Nombre del tipo · Color (8 swatches) · Descripción (opcional) |
| Nueva categoría | `lateral-derecho-categoria.png` | Nombre de la categoría · Color (8 swatches) · Descripción (opcional) |
| Nuevo estado | `lateral-derecho-estado.png` | Nombre del estado · Color (8 swatches) · Posición en el tablero (select "Después de …" sobre los estados existentes → `tast_order`) |

La paleta de 8 swatches está definida en §8.2 (color de dato, nunca decoración).

---

## 10. Componentes transversales

### 10.1 BaseView

Componente con vistas grilla, lista y kanban, selector de vista y filtro de búsqueda. Cada instancia genera su propio id (`useId()` o prop `id`) y persiste filtros + vista en localStorage bajo esa key (anti-colisión). API heredada de PRD-v2 §9:

```vue
<BaseView
  id="tasks-list"                <!-- opcional; default: useId() -->
  :filters="filters"             <!-- { search: string } — persistido en localStorage[id] -->
  :records="records"
  :grid-structure="gridStructure"
  :list-structure="listStructure"
  :kanban-structure="kanbanStructure"
  :views="['list', 'grid']"      <!-- opcional; si se omite, las 3 vistas -->
/>
```

### 10.2 EditDrawer

El drawer de §9 implementado una sola vez en `ui/organisms/edit-drawer/`; los 9 formularios son organismos que lo componen con slots (header/body/footer). Encapsula: overlay, slide (250ms cubic-bezier(0.32, 0.72, 0, 1)), focus trap, cierre por `Esc`/overlay, URL sync, resizable.

### 10.3 Regla de wrappers (aislamiento de librerías, machine-enforced)

Ningún componente de negocio importa una librería de UI de terceros directamente. Cada librería se expone a través de un wrapper propio en `app/shared/vendor/`, único lugar que conoce la dependencia. Enforced con `eslint-plugin-import` + `no-restricted-paths`:

| Wrapper propio | Encapsula |
| --- | --- |
| `vendor/shadcn-vue/` | `shadcn-vue` (Button, Input, Dialog, Sheet, Tabs, …) — re-exportadas; único lugar que importa shadcn-vue |
| `vendor/icons/` | `@phosphor-icons/vue` |
| `vendor/zag/` | `@zag-js/*` + `vue-zag` (dialog, popover, tabs, select, menu, switch, tooltip, accordion, date-picker, pin-input, checkbox) |
| `vendor/tanstack/` | `@tanstack/vue-query` |
| `vendor/orpc/` | `@orpc/client` |
| `vendor/dnd/` | `vue-draggable-plus` |
| `vendor/charts/` | `unovis/vue` |
| `vendor/richtext/` | `tiptap` |
| `vendor/resizable/` | `vue-resizable-panels` |
| `vendor/toast/` | `vue-sonner` |
| `vendor/i18n/` | `@nuxtjs/i18n` |
| `vendor/forms/` | `vee-validate` + `zod` |

Un import de cualquiera de estas librerías fuera de `app/shared/vendor/` es un error de review y de lint.

---

## 11. Arquitectura y stack

Monolito-monorepo (turborepo). Backend clean architecture + ports & adapters; frontend atomic design + DDD layering. Backend: **unchanged except the one-line dev CORS origin for web-v3** (§15.1) (nitro, h3, orpc, kysely, PostgreSQL, bun, effect, xstate, shiki, OpenTelemetry, Makefile; husky + commitlint).

### 11.1 Stack frontend (web-v3, locked)

| Concern | Choice | Notes |
| --- | --- | --- |
| Framework | **Nuxt 4** (Vue 3.5+) | Composition API + `<script setup lang="ts">` only. |
| Language | **TypeScript 5.9** (strict) | `strict`, `noUncheckedIndexedAccess`, `exactOptionalPropertyTypes`. |
| Rendering | **SPA (`ssr: false`)** | Decisión D-v4-1 (§11.2). |
| Routing | **vue-router, tabla única en archivo** | `pages: false`; `app/router/routes.ts` (§12). |
| Package manager | **bun 1.4** | Lockfile committed. |
| Styling | **Tailwind CSS v4** (`@tailwindcss/vite`) | Tokens en `app/assets/css/tokens.css` (§11.3). |
| Headless primitives | **Zag.js v1.44** + shadcn-vue styling tokens | Igual que web-v2; preset `components.json` heredado (luma/zinc/green/roboto/phosphor/large/solid/bold). |
| State (app) | **Pinia** (`@pinia/nuxt`) | Un store por bounded context. |
| State (workflows) | **XState v5** | Timer, auth, wizards; diseñadas en Stately antes de codear. |
| Data fetching | **TanStack Query (vue)** sobre orpc | Cache key = procedure path + input. Websocket solo invalida. |
| API client | **@orpc/client** contra `@crm/contract` | `credentials: 'include'`. |
| Icons | **@phosphor-icons/vue** | Encapsulado. |
| Forms | **vee-validate** + **zod** | Mismos schemas que `@crm/contract`. |
| Drag & drop | **vue-draggable-plus** | Kanban. |
| Charts | **unovis/vue** | Donut en Schedule. |
| Rich text | **tiptap** | Descripción de tareas. |
| Resizable panels | **vue-resizable-panels** | Sidebar + drawer. |
| Toasts | **vue-sonner** | Una sola superficie. |
| OTP | **@zag-js/pin-input** | Preserva ceros a la izquierda. |
| Date picker | **@zag-js/date-picker** | |
| i18n | **@nuxtjs/i18n** | Encapsulado en `vendor/i18n/`. Español único en v1. |
| Tests | **vitest** + **@vue/test-utils** + **@testing-library/vue** + **Playwright** | |
| Lint | **eslint** (vue + ts) + **prettier** | Incluye `no-restricted-paths` de vendors y layers. |

### 11.2 D-v4-1: SPA (`ssr: false`) — rationale

- La app es 100% detrás de login salvo 3 páginas legales; no hay requisito SEO ni de first-paint server-rendered (no-goals §5).
- El núcleo interactivo (timer en vivo, websocket, kanban con optimistic UI, localStorage) es client-only por naturaleza; SSR agregaría superficie de hydration bugs y doble implementación de fetching (SSR + cliente) sin beneficio de producto.
- Nuxt aporta valor igualmente: auto-imports acotados, módulos (Pinia, i18n, Tailwind), Nitro dev server, DevTools, y una ruta de migración a SSR/hybrid vía `routeRules` si Fase 3 lo pide (riesgo §17).
- Las páginas legales se sirven como SPA con contenido markdown versionado en el bundle; si SEO legal se vuelve requisito, se prerrenderizan en Fase 3 sin tocar la app.

### 11.3 Design tokens (`app/assets/css/tokens.css`)

Único archivo con valores crudos. Tailwind v4 los lee vía `@theme`. Ningún hex fuera de este archivo. Valores fijados por el catálogo de imágenes y los recursos del design system:

```css
:root {
  /* Primary (green) — estática, no cambia por tema */
  --color-primary-50:  #f0fdf4;
  --color-primary-100: #dcfce7;
  --color-primary-200: #bbf7d0;
  --color-primary-300: #86efac;
  --color-primary-400: #4ade80;
  --color-primary-500: #22c55e;  /* accent (dark) */
  --color-primary-600: #16a34a;  /* accent (light) + hover base */
  --color-primary-700: #15803d;  /* accent hover/active + texto verde AA en claro */
  --color-primary-800: #166534;
  --color-primary-900: #14532d;

  /* Zinc (neutral) */
  --color-zinc-50:  #fafafa;   /* bg */
  --color-zinc-100: #f4f4f5;
  --color-zinc-200: #e4e4e7;   /* border */
  --color-zinc-300: #d4d4d8;
  --color-zinc-400: #a1a1aa;
  --color-zinc-500: #71717a;
  --color-zinc-600: #52525b;   /* text-2 */
  --color-zinc-700: #3f3f46;
  --color-zinc-800: #27272a;
  --color-zinc-900: #18181b;   /* text */
  --color-zinc-950: #09090b;

  /* Semantic (light) */
  --color-bg:        var(--color-zinc-50);
  --color-surface:   #ffffff;
  --color-surface-2: var(--color-zinc-100);  /* sidebar, secciones anidadas */
  --color-border:    var(--color-zinc-200);
  --color-text:      var(--color-zinc-900);
  --color-text-2:    var(--color-zinc-600);
  --color-accent:    var(--color-primary-600);
  --color-accent-hover: var(--color-primary-700);
  --color-accent-fg: #ffffff;
  --color-error:     #dc2626;
  --color-warning:   #d97706;
  --color-info-bg:   var(--color-primary-50);   /* banners informativos */

  /* Data palette — los 8 swatches de tipos/categorías/estados/cuentas */
  --color-data-blue:   #3b82f6;
  --color-data-green:  #22c55e;
  --color-data-pink:   #db2777;
  --color-data-cyan:   #0891b2;
  --color-data-amber:  #d97706;
  --color-data-purple: #7c3aed;
  --color-data-red:    #dc2626;
  --color-data-gray:   #3f3f46;

  /* Radius — marca registrada: esquinas suaves */
  --radius-sm:   0.5rem;   /* inputs, selects, badges */
  --radius:      0.75rem;  /* botones, cards, items, chips */
  --radius-lg:   1rem;     /* cards grandes, drawers, panel timer */
  --radius-xl:   1.25rem;  /* contenedores destacados */
  --radius-full: 9999px;   /* pills, avatares, botones primarios */

  /* Type — Roboto, escala ratio ~1.125 */
  --font-family: 'Roboto', system-ui, sans-serif;
}

.dark {
  --color-bg:        var(--color-zinc-950);
  --color-surface:   var(--color-zinc-900);
  --color-surface-2: var(--color-zinc-800);
  --color-border:    var(--color-zinc-800);
  --color-text:      var(--color-zinc-50);
  --color-text-2:    var(--color-zinc-400);
  --color-accent:    var(--color-primary-500);
  --color-accent-hover: var(--color-primary-400);
  --color-accent-fg: var(--color-zinc-950);
  --color-error:     #f87171;
  --color-warning:   #fbbf24;
}
```

**Reglas visuales vinculantes (del catálogo):** hairlines de 1px con `border`; sin sombras decorativas (solo elevación funcional de drag/popover/drawer: `0 8px 24px rgb(0 0 0 / 0.08)` claro / `0 8px 24px rgb(0 0 0 / 0.4)` oscuro); un solo acento verde, nunca decorativo (solo acción primaria, item activo, foco, éxito, links inline); texto verde pequeño en claro solo `primary-700` (AA); dígitos de timer en `tabular-nums`; Phosphor `regular` navegación / `bold` acciones / `fill` solo item activo del sidebar; foco canónico `outline: 2px solid var(--color-accent); outline-offset: 2px`.

### 11.4 Estructura del frontend (DDD + atomic design, convenciones Nuxt 4)

```text
apps/web-v3/
├── app/
│   ├── app.vue                      # providers: theme, i18n, toast, query client
│   ├── app.config.ts
│   ├── router.options.ts            # extiende vue-router con routes.ts — Nuxt lo resuelve solo en <srcDir>/router.options.ts (= app/)
│   ├── router/
│   │   ├── routes.ts                # ★ TABLA ÚNICA DE RUTAS (§12)
│   │   └── search-schemas.ts        # zod schemas de search params por ruta
│   ├── middleware/
│   │   └── auth.global.ts           # único middleware: lee meta.auth y meta.guest (§12.4)
│   ├── domain/                      # bounded contexts puros (zod, sin Vue/orpc)
│   │   ├── task/ │ schedule/ │ client/ │ auth/ │ config/ │ finance/
│   │   └── shared/                  # branded ids, errors, pagination, Result
│   ├── application/                 # use cases (orquestan domain + ports)
│   ├── infrastructure/              # adapters: api (orpc), realtime (ws), persistence
│   ├── ui/
│   │   ├── atoms/                   # primitivas re-exportadas desde shared/vendor/shadcn-vue (sin dominio, sin imports de terceros)
│   │   ├── molecules/               # presentacionales tipadas contra value objects
│   │   ├── organisms/               # domain-aware (base-view, kanban-board, edit-drawer…)
│   │   ├── templates/               # app-shell, auth-layout, legal-layout
│   │   └── views/                   # ★ una por ruta (NO pages/: false), glue fino
│   ├── machine/                     # XState v5 (diseñadas en Stately)
│   ├── stores/                      # Pinia (auth, theme, ui)
│   ├── shared/
│   │   ├── vendor/                  # ★ única puerta de librerías (§10.3)
│   │   └── composables/             # wrappers de use cases (use-timer, use-list-tasks…)
│   ├── assets/css/                  # tokens.css + main.css (@theme Tailwind v4)
│   └── plugins/                     # orpc client, query client, ws
├── components.json                  # preset shadcn-vue heredado
├── nuxt.config.ts
├── eslint.config.ts                 # no-restricted-paths (layers + vendors)
├── package.json
└── tests/ (unit · integration · e2e)
```

**Dirección de dependencias (machine-enforced, igual que PRD-v3 §5.1):** `domain/` no importa nada de Nuxt/Vue/orpc; `application/` solo `domain/`; `infrastructure/` puede `domain/`, `application/`, vendors orpc/tanstack; `ui/` es el tope; `shared/vendor/<tool>/` solo `<tool>` + validación. Regla adicional v4: los auto-imports de Nuxt están **desactivados** para `node_modules` fuera de vendor (config `imports` con allowlist) — un componente que quiera Zag/TanStack/etc. debe importar el wrapper.

## 12. Routing en archivo único (requirement v4)

### 12.1 Configuración

`nuxt.config.ts`:

```ts
export default defineNuxtConfig({
  ssr: false,
  pages: false,          // ← ninguna ruta por carpeta
  // ...
})
```

### 12.2 Tabla de rutas (`app/router/routes.ts`)

Toda ruta de la app vive en este archivo. Agregar/quitar/cambiar una pantalla es editar una fila acá — jamás crear un archivo en una carpeta `pages/`. (Fragmento representativo; la lista completa es la tabla §7.2.)

```ts
import type { RouteRecordRaw } from 'vue-router'

export const routes: RouteRecordRaw[] = [
  { path: '/', name: 'index', redirect: () => '/dashboard' /* por sesión */ },
  { path: '/login', name: 'login', component: () => import('~/ui/views/login.vue'), meta: { layout: 'auth', guest: true } },
  { path: '/login-verification', name: 'login-verification', component: () => import('~/ui/views/login-verification.vue'), meta: { layout: 'auth', guest: true } },

  // autenticadas — layout default 'app' vía app.vue
  { path: '/dashboard', name: 'dashboard', component: () => import('~/ui/views/dashboard.vue'), meta: { auth: true } },
  { path: '/tasks', name: 'tasks', component: () => import('~/ui/views/tasks.vue'), meta: { auth: true } },
  { path: '/tasks-config', name: 'tasks-config', component: () => import('~/ui/views/tasks-config.vue'), meta: { auth: true } },
  { path: '/schedules', name: 'schedules', component: () => import('~/ui/views/schedules.vue'), meta: { auth: true } },
  { path: '/clients', name: 'clients', component: () => import('~/ui/views/clients.vue'), meta: { auth: true } },
  { path: '/incomes', name: 'incomes', component: () => import('~/ui/views/incomes.vue'), meta: { auth: true } },
  { path: '/expenses', name: 'expenses', component: () => import('~/ui/views/expenses.vue'), meta: { auth: true } },
  { path: '/transfers', name: 'transfers', component: () => import('~/ui/views/transfers.vue'), meta: { auth: true } },
  { path: '/config', name: 'config', component: () => import('~/ui/views/config.vue'), meta: { auth: true } },

  { path: '/terms', name: 'terms', component: () => import('~/ui/views/legal/terms.vue'), meta: { layout: 'legal', guest: true } },
  { path: '/privacy', name: 'privacy', component: () => import('~/ui/views/legal/privacy.vue'), meta: { layout: 'legal', guest: true } },
  { path: '/cookies', name: 'cookies', component: () => import('~/ui/views/legal/cookies.vue'), meta: { layout: 'legal', guest: true } },

  { path: '/:pathMatch(.*)*', name: 'not-found', component: () => import('~/ui/views/not-found.vue'), meta: { layout: 'auth', guest: true } },
]
```

`app/router.options.ts` (Nuxt resuelve las router options únicamente en `<srcDir>/router.options.ts`; con Nuxt 4 `srcDir` = `app/`, así que el archivo va en `app/`, no en `app/router/`):

```ts
import type { RouterOptions } from 'vue-router'
import { routes } from './router/routes'

export default <RouterOptions>{
  routes,
  scrollBehavior: () => ({ top: 0 }),
}
```

### 12.3 Layouts por meta

Los layouts viven en `app/layouts/` (`auth.vue`, `legal.vue`, `default.vue` = AppShell) y se seleccionan con `meta.layout` en cada fila de la tabla. `default.vue` renderiza sidebar + topbar + `<RouterView />`. Con `pages: false` no existe el pages module: `<NuxtPage />` no tiene páginas que resolver — el patrón de custom router documentado por Nuxt usa `<RouterView />` en el layout.

### 12.4 Guards como middleware de ruta

Un único middleware global, `app/middleware/auth.global.ts`, corre en cada navegación y lee el `meta` de la fila (los `RouteRecordRaw` de §12.2 no declaran `meta.middleware`, y un middleware *nombrado* sin esa declaración jamás se ejecuta — por eso un solo `.global.ts`, sin `guest.ts` aparte): si `to.meta.auth` y no hay sesión (Pinia `auth` store hidratado + verificación orpc), redirige a `/login` preservando `?redirect=`; si `to.meta.guest` y ya hay sesión, redirige a `/dashboard`.

### 12.5 Search params tipados (sucesor de nuqs)

Drawers, tabs y filtros viven en la URL. Cada ruta declara su schema zod en `app/router/search-schemas.ts`; el composable `useRouteSearch(routeName)` (en `shared/composables/`) parsea/valida `route.query` contra el schema y devuelve refs reactivas + setter que navega con `router.replace`. Deep-linking, back/forward nativo y tipos seguros sin dependencia de nuqs.

### 12.6 Anti-regresión

Un test de integración (vitest) importa `routes` y la tabla §7.2 y verifica: misma cantidad de rutas, mismos paths, toda ruta autenticada tiene `meta.auth`, toda pública tiene `meta.guest` + layout adecuado. Si alguien crea `pages/` en el futuro, el test de estructura falla (`pages/` debe estar ausente).

## 13. Estructura de BD (schema corregido — inherited unchanged from PRD-v2 §11)

Convenciones (obligatorias): tablas en inglés; prefijo de 4 letras por tabla (2+2 en tablas de dos palabras); referencias `<prefijo_origen>_<prefijo_referencia>_id`; toda tabla lleva `created_at`/`updated_at`/`deleted_at` salvo excepciones documentadas (`logs` append-only: solo `created_at`; `sino`, `apps`, `currency`: lookups globales seedeados, sin `deleted_at`); UUIDv7; toda tabla de negocio lleva `<prefix>_user_id NOT NULL` + índice; FKs siempre del hijo al padre contra PK o UNIQUE.

```sql
-- ============ Auth & usuarios ============

CREATE TABLE "user" (
    "user_id" uuid NOT NULL,
    "user_name" varchar NOT NULL,
    "user_email" varchar NOT NULL,
    "user_sino_emailverificado" int NOT NULL DEFAULT 0,
    "user_theme" varchar NOT NULL DEFAULT 'system',
    "user_accepted_terms_at" timestamptz,
    "user_terms_version" varchar,
    "user_created_at" timestamptz NOT NULL,
    "user_updated_at" timestamptz NOT NULL,
    "user_deleted_at" timestamptz,
    PRIMARY KEY ("user_id"),
    CONSTRAINT "uq_user_email" UNIQUE ("user_email"),
    CONSTRAINT "ck_user_theme" CHECK ("user_theme" IN ('light', 'dark', 'system'))
);

CREATE TABLE "login" (
    "logi_id" uuid NOT NULL,
    "logi_email" varchar NOT NULL,
    "logi_code" varchar(6) NOT NULL,
    "logi_attempts" int NOT NULL DEFAULT 0,
    "logi_expires_at" timestamptz NOT NULL,
    "logi_consumed_at" timestamptz,
    "logi_created_at" timestamptz NOT NULL,
    "logi_updated_at" timestamptz NOT NULL,
    PRIMARY KEY ("logi_id")
);
CREATE INDEX "idx_login_email_created" ON "login" ("logi_email", "logi_created_at");

CREATE TABLE "session" (
    "sess_id" uuid NOT NULL,
    "sess_user_id" uuid NOT NULL,
    "sess_token_hash" varchar NOT NULL,
    "sess_expires_at" timestamptz NOT NULL,
    "sess_created_at" timestamptz NOT NULL,
    "sess_updated_at" timestamptz NOT NULL,
    "sess_deleted_at" timestamptz,
    PRIMARY KEY ("sess_id"),
    CONSTRAINT "uq_session_token" UNIQUE ("sess_token_hash")
);
CREATE INDEX "idx_session_user" ON "session" ("sess_user_id");

CREATE TABLE "email_sending" (
    "emse_id" uuid NOT NULL,
    "emse_from" varchar NOT NULL,
    "emse_to" varchar NOT NULL,
    "emse_title" text NOT NULL,
    "emse_description" text NOT NULL,
    "emse_user_id" uuid,
    "emse_logi_id" uuid,
    "emse_task_id" uuid,
    "emse_sino_sending" bigint,
    "emse_created_at" timestamptz NOT NULL,
    "emse_updated_at" timestamptz NOT NULL,
    PRIMARY KEY ("emse_id")
);

-- ============ Lookups globales (seed, sin user_id) ============

CREATE TABLE "sino" (
    "sino_id" int NOT NULL,
    "sino_validate" int,
    "sino_created_at" timestamptz NOT NULL,
    "sino_updated_at" timestamptz NOT NULL,
    PRIMARY KEY ("sino_id")
);

CREATE TABLE "apps" (
    "apps_id" uuid NOT NULL,
    "apps_name" varchar NOT NULL,
    "apps_description" varchar,
    "apps_url" varchar,
    "apps_sino_active" int NOT NULL,
    "apps_created_at" timestamptz NOT NULL,
    "apps_updated_at" timestamptz NOT NULL,
    PRIMARY KEY ("apps_id")
);

CREATE TABLE "currency" (
    "curr_id" uuid NOT NULL,
    "curr_title" varchar NOT NULL,
    "curr_code" varchar NOT NULL,
    "curr_symbol" varchar NOT NULL,
    "curr_decimal" smallint NOT NULL,
    "curr_created_at" timestamptz NOT NULL,
    "curr_updated_at" timestamptz NOT NULL,
    PRIMARY KEY ("curr_id"),
    CONSTRAINT "uq_currency_code" UNIQUE ("curr_code")
);

-- ============ Catálogos por usuario ============

CREATE TABLE "types" (
    "type_id" uuid NOT NULL,
    "type_user_id" uuid NOT NULL,
    "type_title" varchar NOT NULL,
    "type_description" varchar,
    "type_color" varchar,
    "type_icono" varchar,
    "type_apps_id" uuid NOT NULL,
    "type_created_at" timestamptz NOT NULL,
    "type_updated_at" timestamptz NOT NULL,
    "type_deleted_at" timestamptz,
    PRIMARY KEY ("type_id")
);
CREATE INDEX "idx_types_user" ON "types" ("type_user_id") WHERE "type_deleted_at" IS NULL;

CREATE TABLE "categories" (
    "cate_id" uuid NOT NULL,
    "cate_user_id" uuid NOT NULL,
    "cate_title" varchar NOT NULL,
    "cate_description" varchar,
    "cate_icono" varchar,
    "cate_color" varchar,
    "cate_apps_id" uuid NOT NULL,
    "cate_created_at" timestamptz NOT NULL,
    "cate_updated_at" timestamptz NOT NULL,
    "cate_deleted_at" timestamptz,
    PRIMARY KEY ("cate_id")
);
CREATE INDEX "idx_categories_user" ON "categories" ("cate_user_id") WHERE "cate_deleted_at" IS NULL;

CREATE TABLE "client" (
    "clie_id" uuid NOT NULL,
    "clie_user_id" uuid NOT NULL,
    "clie_name" varchar NOT NULL,
    "clie_email" varchar,
    "clie_areaphone" varchar,
    "clie_phone" varchar,
    "clie_atta_id" uuid,
    "clie_acco_id" uuid,
    "clie_created_at" timestamptz NOT NULL,
    "clie_updated_at" timestamptz NOT NULL,
    "clie_deleted_at" timestamptz,
    PRIMARY KEY ("clie_id")
);
CREATE INDEX "idx_client_user" ON "client" ("clie_user_id") WHERE "clie_deleted_at" IS NULL;

CREATE TABLE "type_categories_client" (
    "tccl_id" uuid NOT NULL,
    "tccl_user_id" uuid NOT NULL,
    "tccl_type_id" uuid NOT NULL,
    "tccl_cate_id" uuid NOT NULL,
    "tccl_clie_id" uuid,
    "tccl_created_at" timestamptz NOT NULL,
    "tccl_updated_at" timestamptz NOT NULL,
    "tccl_deleted_at" timestamptz,
    PRIMARY KEY ("tccl_id"),
    CONSTRAINT "uq_tccl_combo" UNIQUE NULLS NOT DISTINCT
        ("tccl_user_id", "tccl_type_id", "tccl_cate_id", "tccl_clie_id")
);

-- ============ Tareas ============

CREATE TABLE "task_state" (
    "tast_id" uuid NOT NULL,
    "tast_user_id" uuid NOT NULL,
    "tast_title" varchar NOT NULL,
    "tast_color" varchar,
    "tast_icono" varchar,
    "tast_order" int NOT NULL,
    "tast_created_at" timestamptz NOT NULL,
    "tast_updated_at" timestamptz NOT NULL,
    "tast_deleted_at" timestamptz,
    PRIMARY KEY ("tast_id")
);
CREATE INDEX "idx_task_state_user" ON "task_state" ("tast_user_id") WHERE "tast_deleted_at" IS NULL;

CREATE TABLE "task" (
    "task_id" uuid NOT NULL,
    "task_user_id" uuid NOT NULL,
    "task_title" varchar NOT NULL,
    "task_description" text,
    "task_clie_id" uuid,
    "task_type_id" uuid NOT NULL,
    "task_cate_id" uuid,
    "task_tast_id" uuid NOT NULL,
    "task_kanban_order" double precision NOT NULL DEFAULT 0,
    "task_created_at" timestamptz NOT NULL,
    "task_updated_at" timestamptz NOT NULL,
    "task_deleted_at" timestamptz,
    PRIMARY KEY ("task_id")
);
CREATE INDEX "idx_task_user" ON "task" ("task_user_id") WHERE "task_deleted_at" IS NULL;
CREATE INDEX "idx_task_kanban" ON "task" ("task_user_id", "task_tast_id", "task_kanban_order");

-- ============ Schedule ============

CREATE TABLE "schedule" (
    "sche_id" uuid NOT NULL,
    "sche_user_id" uuid NOT NULL,
    "sche_title" varchar NOT NULL,
    "sche_clie_id" uuid,
    "sche_task_id" uuid,
    "sche_type_id" uuid,
    "sche_cate_id" uuid,
    "sche_created_at" timestamptz NOT NULL,
    "sche_updated_at" timestamptz NOT NULL,
    "sche_deleted_at" timestamptz,
    PRIMARY KEY ("sche_id")
);
CREATE INDEX "idx_schedule_user" ON "schedule" ("sche_user_id") WHERE "sche_deleted_at" IS NULL;

CREATE TABLE "schedule_items" (
    "scit_id" uuid NOT NULL,
    "scit_sche_id" uuid NOT NULL,
    "scit_start" timestamptz NOT NULL,
    "scit_end" timestamptz,
    "scit_duration" interval,
    "scit_origin" varchar NOT NULL DEFAULT 'manual',
    "scit_last_heartbeat" timestamptz,
    "scit_created_at" timestamptz NOT NULL,
    "scit_updated_at" timestamptz NOT NULL,
    "scit_deleted_at" timestamptz,
    PRIMARY KEY ("scit_id"),
    CONSTRAINT "ck_scit_origin" CHECK ("scit_origin" IN ('manual', 'resumed')),
    CONSTRAINT "ck_scit_end_after_start" CHECK ("scit_end" IS NULL OR "scit_end" >= "scit_start")
);
CREATE INDEX "idx_schedule_items_sche" ON "schedule_items" ("scit_sche_id");
CREATE UNIQUE INDEX "uq_open_timer" ON "schedule_items" ("scit_sche_id") WHERE "scit_end" IS NULL;

-- ============ Finance ============

CREATE TABLE "accounts" (
    "acco_id" uuid NOT NULL,
    "acco_user_id" uuid NOT NULL,
    "acco_title" varchar NOT NULL,
    "acco_icon" varchar NOT NULL,
    "acco_color" varchar NOT NULL,
    "acco_curr_id" uuid NOT NULL,
    "acco_initial_amount" numeric NOT NULL DEFAULT 0,
    "acco_created_at" timestamptz NOT NULL,
    "acco_updated_at" timestamptz NOT NULL,
    "acco_deleted_at" timestamptz,
    PRIMARY KEY ("acco_id")
);
CREATE INDEX "idx_accounts_user" ON "accounts" ("acco_user_id") WHERE "acco_deleted_at" IS NULL;

CREATE TABLE "income" (
    "inco_id" uuid NOT NULL,
    "inco_user_id" uuid NOT NULL,
    "inco_title" varchar NOT NULL,
    "inco_descriptions" varchar,
    "inco_acco_id" uuid NOT NULL,
    "inco_clie_id" uuid,
    "inco_type_id" uuid NOT NULL,
    "inco_cate_id" uuid,
    "inco_curr_id" uuid NOT NULL,
    "inco_amount" numeric NOT NULL,
    "inco_created_at" timestamptz NOT NULL,
    "inco_updated_at" timestamptz NOT NULL,
    "inco_deleted_at" timestamptz,
    PRIMARY KEY ("inco_id"),
    CONSTRAINT "ck_income_amount" CHECK ("inco_amount" > 0)
);
CREATE INDEX "idx_income_user" ON "income" ("inco_user_id") WHERE "inco_deleted_at" IS NULL;

CREATE TABLE "expenses" (
    "expe_id" uuid NOT NULL,
    "expe_user_id" uuid NOT NULL,
    "expe_title" varchar NOT NULL,
    "expe_descriptions" varchar,
    "expe_acco_id" uuid NOT NULL,
    "expe_clie_id" uuid,
    "expe_type_id" uuid NOT NULL,
    "expe_cate_id" uuid,
    "expe_curr_id" uuid NOT NULL,
    "expe_amount" numeric NOT NULL,
    "expe_created_at" timestamptz NOT NULL,
    "expe_updated_at" timestamptz NOT NULL,
    "expe_deleted_at" timestamptz,
    PRIMARY KEY ("expe_id"),
    CONSTRAINT "ck_expenses_amount" CHECK ("expe_amount" > 0)
);
CREATE INDEX "idx_expenses_user" ON "expenses" ("expe_user_id") WHERE "expe_deleted_at" IS NULL;

CREATE TABLE "transfers" (
    "tran_id" uuid NOT NULL,
    "tran_user_id" uuid NOT NULL,
    "tran_acco_from" uuid NOT NULL,
    "tran_sino_other" int NOT NULL,
    "tran_acco_to" uuid,
    "tran_other" varchar,
    "tran_curr_id" uuid NOT NULL,
    "tran_amount" numeric NOT NULL,
    "tran_created_at" timestamptz NOT NULL,
    "tran_updated_at" timestamptz NOT NULL,
    "tran_deleted_at" timestamptz,
    PRIMARY KEY ("tran_id"),
    CONSTRAINT "ck_transfers_amount" CHECK ("tran_amount" > 0),
    CONSTRAINT "ck_transfers_not_self" CHECK ("tran_acco_from" <> "tran_acco_to"),
    CONSTRAINT "ck_transfers_destination" CHECK (
        ("tran_acco_to" IS NOT NULL AND "tran_other" IS NULL)
        OR ("tran_acco_to" IS NULL AND "tran_other" IS NOT NULL)
    )
);
CREATE INDEX "idx_transfers_user" ON "transfers" ("tran_user_id") WHERE "tran_deleted_at" IS NULL;

-- ============ Adjuntos ============

CREATE TABLE "attachments" (
    "atta_id" uuid NOT NULL,
    "atta_user_id" uuid NOT NULL,
    "atta_s3id" text NOT NULL,
    "atta_title" varchar NOT NULL,
    "atta_format" varchar NOT NULL,
    "atta_created_at" timestamptz NOT NULL,
    "atta_updated_at" timestamptz NOT NULL,
    "atta_deleted_at" timestamptz,
    PRIMARY KEY ("atta_id")
);

CREATE TABLE "task_attachments" (
    "taat_task_id" uuid NOT NULL,
    "taat_atta_id" uuid NOT NULL,
    "taat_created_at" timestamptz NOT NULL,
    PRIMARY KEY ("taat_task_id", "taat_atta_id")
);
CREATE TABLE "income_attachments" (
    "inat_inco_id" uuid NOT NULL,
    "inat_atta_id" uuid NOT NULL,
    "inat_created_at" timestamptz NOT NULL,
    PRIMARY KEY ("inat_inco_id", "inat_atta_id")
);
CREATE TABLE "expense_attachments" (
    "exat_expe_id" uuid NOT NULL,
    "exat_atta_id" uuid NOT NULL,
    "exat_created_at" timestamptz NOT NULL,
    PRIMARY KEY ("exat_expe_id", "exat_atta_id")
);
CREATE TABLE "transfer_attachments" (
    "trat_tran_id" uuid NOT NULL,
    "trat_atta_id" uuid NOT NULL,
    "trat_created_at" timestamptz NOT NULL,
    PRIMARY KEY ("trat_tran_id", "trat_atta_id")
);

-- ============ Logs (append-only) ============

CREATE TABLE "logs" (
    "logs_id" uuid NOT NULL,
    "logs_user_id" uuid NOT NULL,
    "logs_task_id" uuid,
    "logs_tast_id" uuid,
    "logs_tccl_id" uuid,
    "logs_clie_id" uuid,
    "logs_type_id" uuid,
    "logs_cate_id" uuid,
    "logs_acco_id" uuid,
    "logs_sche_id" uuid,
    "logs_inco_id" uuid,
    "logs_expe_id" uuid,
    "logs_tran_id" uuid,
    "logs_title" varchar NOT NULL,
    "logs_description" text NOT NULL,
    "logs_created_at" timestamptz NOT NULL,
    PRIMARY KEY ("logs_id")
);
CREATE INDEX "idx_logs_user" ON "logs" ("logs_user_id", "logs_created_at");

-- ============ Foreign keys (hijo → padre) ============

ALTER TABLE "session" ADD CONSTRAINT "fk_session_user" FOREIGN KEY ("sess_user_id") REFERENCES "user" ("user_id");
ALTER TABLE "email_sending" ADD CONSTRAINT "fk_email_sending_user" FOREIGN KEY ("emse_user_id") REFERENCES "user" ("user_id");
ALTER TABLE "email_sending" ADD CONSTRAINT "fk_email_sending_login" FOREIGN KEY ("emse_logi_id") REFERENCES "login" ("logi_id");
ALTER TABLE "email_sending" ADD CONSTRAINT "fk_email_sending_task" FOREIGN KEY ("emse_task_id") REFERENCES "task" ("task_id");
ALTER TABLE "types" ADD CONSTRAINT "fk_types_user" FOREIGN KEY ("type_user_id") REFERENCES "user" ("user_id");
ALTER TABLE "types" ADD CONSTRAINT "fk_types_apps" FOREIGN KEY ("type_apps_id") REFERENCES "apps" ("apps_id");
ALTER TABLE "categories" ADD CONSTRAINT "fk_categories_user" FOREIGN KEY ("cate_user_id") REFERENCES "user" ("user_id");
ALTER TABLE "categories" ADD CONSTRAINT "fk_categories_apps" FOREIGN KEY ("cate_apps_id") REFERENCES "apps" ("apps_id");
ALTER TABLE "client" ADD CONSTRAINT "fk_client_user" FOREIGN KEY ("clie_user_id") REFERENCES "user" ("user_id");
ALTER TABLE "client" ADD CONSTRAINT "fk_client_attachments" FOREIGN KEY ("clie_atta_id") REFERENCES "attachments" ("atta_id");
ALTER TABLE "client" ADD CONSTRAINT "fk_client_accounts" FOREIGN KEY ("clie_acco_id") REFERENCES "accounts" ("acco_id");
ALTER TABLE "type_categories_client" ADD CONSTRAINT "fk_tccl_user" FOREIGN KEY ("tccl_user_id") REFERENCES "user" ("user_id");
ALTER TABLE "type_categories_client" ADD CONSTRAINT "fk_tccl_types" FOREIGN KEY ("tccl_type_id") REFERENCES "types" ("type_id");
ALTER TABLE "type_categories_client" ADD CONSTRAINT "fk_tccl_categories" FOREIGN KEY ("tccl_cate_id") REFERENCES "categories" ("cate_id");
ALTER TABLE "type_categories_client" ADD CONSTRAINT "fk_tccl_client" FOREIGN KEY ("tccl_clie_id") REFERENCES "client" ("clie_id");
ALTER TABLE "task_state" ADD CONSTRAINT "fk_task_state_user" FOREIGN KEY ("tast_user_id") REFERENCES "user" ("user_id");
ALTER TABLE "task" ADD CONSTRAINT "fk_task_user" FOREIGN KEY ("task_user_id") REFERENCES "user" ("user_id");
ALTER TABLE "task" ADD CONSTRAINT "fk_task_client" FOREIGN KEY ("task_clie_id") REFERENCES "client" ("clie_id");
ALTER TABLE "task" ADD CONSTRAINT "fk_task_types" FOREIGN KEY ("task_type_id") REFERENCES "types" ("type_id");
ALTER TABLE "task" ADD CONSTRAINT "fk_task_categories" FOREIGN KEY ("task_cate_id") REFERENCES "categories" ("cate_id");
ALTER TABLE "task" ADD CONSTRAINT "fk_task_task_state" FOREIGN KEY ("task_tast_id") REFERENCES "task_state" ("tast_id");
ALTER TABLE "schedule" ADD CONSTRAINT "fk_schedule_user" FOREIGN KEY ("sche_user_id") REFERENCES "user" ("user_id");
ALTER TABLE "schedule" ADD CONSTRAINT "fk_schedule_client" FOREIGN KEY ("sche_clie_id") REFERENCES "client" ("clie_id");
ALTER TABLE "schedule" ADD CONSTRAINT "fk_schedule_task" FOREIGN KEY ("sche_task_id") REFERENCES "task" ("task_id");
ALTER TABLE "schedule" ADD CONSTRAINT "fk_schedule_types" FOREIGN KEY ("sche_type_id") REFERENCES "types" ("type_id");
ALTER TABLE "schedule" ADD CONSTRAINT "fk_schedule_categories" FOREIGN KEY ("sche_cate_id") REFERENCES "categories" ("cate_id");
ALTER TABLE "schedule_items" ADD CONSTRAINT "fk_schedule_items_schedule" FOREIGN KEY ("scit_sche_id") REFERENCES "schedule" ("sche_id");
ALTER TABLE "accounts" ADD CONSTRAINT "fk_accounts_user" FOREIGN KEY ("acco_user_id") REFERENCES "user" ("user_id");
ALTER TABLE "accounts" ADD CONSTRAINT "fk_accounts_currency" FOREIGN KEY ("acco_curr_id") REFERENCES "currency" ("curr_id");
ALTER TABLE "income" ADD CONSTRAINT "fk_income_user" FOREIGN KEY ("inco_user_id") REFERENCES "user" ("user_id");
ALTER TABLE "income" ADD CONSTRAINT "fk_income_accounts" FOREIGN KEY ("inco_acco_id") REFERENCES "accounts" ("acco_id");
ALTER TABLE "income" ADD CONSTRAINT "fk_income_client" FOREIGN KEY ("inco_clie_id") REFERENCES "client" ("clie_id");
ALTER TABLE "income" ADD CONSTRAINT "fk_income_types" FOREIGN KEY ("inco_type_id") REFERENCES "types" ("type_id");
ALTER TABLE "income" ADD CONSTRAINT "fk_income_categories" FOREIGN KEY ("inco_cate_id") REFERENCES "categories" ("cate_id");
ALTER TABLE "income" ADD CONSTRAINT "fk_income_currency" FOREIGN KEY ("inco_curr_id") REFERENCES "currency" ("curr_id");
ALTER TABLE "expenses" ADD CONSTRAINT "fk_expenses_user" FOREIGN KEY ("expe_user_id") REFERENCES "user" ("user_id");
ALTER TABLE "expenses" ADD CONSTRAINT "fk_expenses_accounts" FOREIGN KEY ("expe_acco_id") REFERENCES "accounts" ("acco_id");
ALTER TABLE "expenses" ADD CONSTRAINT "fk_expenses_client" FOREIGN KEY ("expe_clie_id") REFERENCES "client" ("clie_id");
ALTER TABLE "expenses" ADD CONSTRAINT "fk_expenses_types" FOREIGN KEY ("expe_type_id") REFERENCES "types" ("type_id");
ALTER TABLE "expenses" ADD CONSTRAINT "fk_expenses_categories" FOREIGN KEY ("expe_cate_id") REFERENCES "categories" ("cate_id");
ALTER TABLE "expenses" ADD CONSTRAINT "fk_expenses_currency" FOREIGN KEY ("expe_curr_id") REFERENCES "currency" ("curr_id");
ALTER TABLE "transfers" ADD CONSTRAINT "fk_transfers_user" FOREIGN KEY ("tran_user_id") REFERENCES "user" ("user_id");
ALTER TABLE "transfers" ADD CONSTRAINT "fk_transfers_acco_from" FOREIGN KEY ("tran_acco_from") REFERENCES "accounts" ("acco_id");
ALTER TABLE "transfers" ADD CONSTRAINT "fk_transfers_acco_to" FOREIGN KEY ("tran_acco_to") REFERENCES "accounts" ("acco_id");
ALTER TABLE "transfers" ADD CONSTRAINT "fk_transfers_currency" FOREIGN KEY ("tran_curr_id") REFERENCES "currency" ("curr_id");
ALTER TABLE "transfers" ADD CONSTRAINT "fk_transfers_sino" FOREIGN KEY ("tran_sino_other") REFERENCES "sino" ("sino_id");
ALTER TABLE "attachments" ADD CONSTRAINT "fk_attachments_user" FOREIGN KEY ("atta_user_id") REFERENCES "user" ("user_id");
ALTER TABLE "task_attachments" ADD CONSTRAINT "fk_taat_task" FOREIGN KEY ("taat_task_id") REFERENCES "task" ("task_id");
ALTER TABLE "task_attachments" ADD CONSTRAINT "fk_taat_attachments" FOREIGN KEY ("taat_atta_id") REFERENCES "attachments" ("atta_id");
ALTER TABLE "income_attachments" ADD CONSTRAINT "fk_inat_income" FOREIGN KEY ("inat_inco_id") REFERENCES "income" ("inco_id");
ALTER TABLE "income_attachments" ADD CONSTRAINT "fk_inat_attachments" FOREIGN KEY ("inat_atta_id") REFERENCES "attachments" ("atta_id");
ALTER TABLE "expense_attachments" ADD CONSTRAINT "fk_exat_expenses" FOREIGN KEY ("exat_expe_id") REFERENCES "expenses" ("expe_id");
ALTER TABLE "expense_attachments" ADD CONSTRAINT "fk_exat_attachments" FOREIGN KEY ("exat_atta_id") REFERENCES "attachments" ("atta_id");
ALTER TABLE "transfer_attachments" ADD CONSTRAINT "fk_trat_transfers" FOREIGN KEY ("trat_tran_id") REFERENCES "transfers" ("tran_id");
ALTER TABLE "transfer_attachments" ADD CONSTRAINT "fk_trat_attachments" FOREIGN KEY ("trat_atta_id") REFERENCES "attachments" ("atta_id");
ALTER TABLE "user" ADD CONSTRAINT "fk_user_sino" FOREIGN KEY ("user_sino_emailverificado") REFERENCES "sino" ("sino_id");
ALTER TABLE "logs" ADD CONSTRAINT "fk_logs_user" FOREIGN KEY ("logs_user_id") REFERENCES "user" ("user_id");
```

## 14. Seeds (inherited unchanged)

Al registrarse un usuario (primer OTP validado): estados `Pendiente` (1), `En progreso` (2), `Completado` (3); una cuenta `Efectivo` en su moneda; tipos y categorías base por módulo.
Seeds globales (migración): `sino` (0/1), `apps` (tasks, schedule, finance), `currency` (USD, EUR, ARS, …).

## 15. Coexistencia y cutover

### 15.1 Durante la construcción

- `apps/web` y `apps/web-v2` quedan **frozen** (solo bugfixes). `web-v3` es el frontend en desarrollo activo.
- Puertos: `apps/web` → `WEB_PORT=5173`, `apps/web-v2` → `WEB_V2_PORT=5174`, `apps/web-v3` → **`WEB_V3_PORT=5175`**. El backend (`API_PORT=3000`) **no** acepta hoy CORS de los tres: el allowlist de desarrollo en `apps/api/src/http/composition-root.ts:131` lista solo `http://localhost:5173` y `http://localhost:5174`, y el cliente orpc manda `credentials: 'include'`, de modo que **toda llamada credentialed desde `web-v3` (`:5175`) queda bloqueada por CORS**.
  - **Work item (único cambio de backend permitido):** agregar el origin `http://localhost:5175` (derivado de `WEB_V3_PORT`) al allowlist de CORS de desarrollo en `apps/api/src/http/composition-root.ts`. Es una línea de dev-infra; no cambia contrato, producto ni datos.
- Flag `WEB_V3_ENABLED=1` habilita el routing a web-v3.
- `@crm/contract` se construye antes que cualquier frontend; los tres consumen los mismos tipos.
- Commit prefix `web-v3:` en mensajes para greppability.

### 15.2 Cutover gate (remoción de web y web-v2)

`apps/web` y `apps/web-v2` se eliminan solo cuando **todo** lo siguiente es verdadero:

1. `web-v3` implementa **todo** el Phase 1 con los acceptance criteria de PRD-v2 §8 pasando en E2E (no manual).
2. Paridad visual contra el catálogo: screenshot diff lado a lado de las 23 imágenes de `docs/img/CRM-HOME — Diseño UI (web-v2)/` (14 pantallas de página + 9 drawers `lateral-derecho-*.png`), diffando cada imagen exactamente una vez; sin desviaciones no aprobadas (los tokens §11.3 son la referencia).
3. Dos semanas de dogfooding interno sin P0/P1.
4. Bundle budget: first-load JS ≤ 300 KB gzip en `/dashboard`.
5. Lighthouse: performance ≥ 90, a11y ≥ 95, best-practices ≥ 95 en `/dashboard`, `/tasks`, `/schedules`.

Cutover PR: borrar `apps/web` y `apps/web-v2`, actualizar workspaces/turbo, un solo `WEB_PORT`, README. Revisado por dos engineers y una semana detrás de feature flag. Rollback: tag `legacy/web-v2` por 90 días; el flag vuelve; `@crm/contract` no se revierte.

## 16. Testing strategy (inherited + delta v4)

| Level | Tool | What it covers |
| --- | --- | --- |
| Unit | vitest | `domain/` y `application/` con ports en memoria |
| Component | vitest + @vue/test-utils + @testing-library/vue | molecules/organisms (incl. EditDrawer y los 9 formularios) |
| Integration | vitest + orpc MSW | `infrastructure/api/*` wire format; **route table test** (§12.6) |
| State machine | xstate v5 + Stately MCP | timer/auth machines con behavior review en el PR |
| E2E | Playwright | happy path por ruta + los acceptance criteria críticos de PRD-v2 §8 (OTP con ceros, kanban persistido, timer medianoche, schedule libre, tema persistido, teléfono `+54…`, transfer externa) |
| Visual | Playwright screenshots | diff contra el catálogo §15.2.2 |

Coverage: 80% líneas en `domain/` + `application/`; 70% en `ui/organisms/`.

## 17. Riesgos y decisiones pendientes

| Tema | Estado |
| --- | --- |
| SSR/hybrid (D-v4-1) | SPA elegido; re-evaluar en Fase 3 si hay requisito SEO/first-paint. `routeRules` es la ruta de migración. |
| Tabs de Config: el catálogo muestra 5 (Perfil, Estados, Tipos, Categorías, Cuentas); PRD-v2 §8.7 define 8 (+ apps, monedas, adjuntos) | Decisión: implementar los 8 del PRD-v2; los 3 extra usan el mismo patrón pill-tab. El catálogo se considera parcial. |
| Mock "Nueva tarea" incluye "Estado inicial" y "Fecha límite" | `task` no tiene fecha límite ni estado seleccionable en create (PRD-v2 §8.3: siempre nace en `Pendiente`). Decisión: el drawer **no** muestra esos dos campos en v1; se agregan solo si una Fase posterior agrega las columnas a la BD. |
| Mock de cliente incluye País/Rubro/Notas; BD solo soporta name/email/phone/atta/acco | Decisión v1: campos name/email/phone (+avatar como `clie_atta_id` Fase 2). País/Rubro/Notas quedan fuera hasta migración de schema. |
| Mock de ingreso/egreso omite Tipo (obligatorio en BD, PRD-v2 §8.6) | Decisión: el drawer incluye Tipo (select) aunque el mock no lo dibuje; es requisito de BD. |
| Mock de transferencia dibuja solo cuentas propias | Destino externo (`tran_other`) se ofrece como opción "Externo…" en el select Destino (PRD-v2 §8.6). |
| `logs_taty_id` del schema PRD-v2 | Campo heredado sin procedencia clara; se conserva tal cual (inherited unchanged), a aclarar en un change posterior. |
| Conversión de monedas | Fuera del MVP (PRD-v2 §13). |
| Redacción legal | Placeholders versionados; contenido profesional pendiente (PRD-v2 §13). |
| Re-aceptación de términos | Fase 2. |
| CORS de desarrollo no incluye el origin de `web-v3` (`:5175`) | Excepción única al backend "unchanged": agregar `http://localhost:5175` al allowlist de CORS de desarrollo en `apps/api/src/http/composition-root.ts` (§15.1). Es dev-infra, sin cambio de contrato; sin esa línea `web-v3` no puede llamar al backend con `credentials: 'include'` en desarrollo. |

## 18. Acceptance criteria for "PRD-v4 done"

- [ ] `apps/web-v3` corre junto a `apps/web` y `apps/web-v2` en `develop` (puertos 5173/5174/5175) y pasa el E2E suite en CI.
- [ ] Todo PRD-v2 §8 acceptance criterion pasa en `web-v3` (E2E, no manual).
- [ ] Las rutas existen **solo** en `app/router/routes.ts` (`pages: false`, sin carpeta `pages/`); el test §12.6 lo verifica.
- [ ] Paridad visual con las 23 imágenes del catálogo — 14 pantallas de página + 9 drawers `lateral-derecho-*.png`, cada una diffada exactamente una vez (screenshot diff en CI).
- [ ] `app/shared/vendor/` es el único lugar con imports de librerías UI de terceros (lint-enforced).
- [ ] `domain/` tiene cero imports de Nuxt/Vue/orpc/TanStack (lint-enforced).
- [ ] `app/assets/css/tokens.css` es el único archivo con valores crudos de color (lint-enforced).
- [ ] Toda máquina de estado tiene behavior review de Stately adjunto al PR.
- [ ] Cutover gate §15.2 cumplido.

## 19. Day of judgment (review)

Una vez redactado, este PRD pasa por **revisión dual adversarial** (skill `judgment-day`): dos revisores independientes producen crítica estructurada sobre producto, arquitectura, coherencia con PRD-v2/v3/DESIGN, fidelidad al catálogo visual y decisiones v4 (SPA, routing en archivo único, coexistencia de tres frontends), con a lo sumo dos rondas de fix/re-juicio. El output (pass, fixes, re-juicio) es la puerta que cierra el PRD antes de cualquier implementación.
