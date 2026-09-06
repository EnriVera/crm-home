# CRM-HOME — PRD v2

> **Estado de este documento:** versión corregida del PRD original. Incorpora los hallazgos de la revisión dual (Judgment Day): corrección integral del schema SQL, definición de sesión/auth, reglas de negocio faltantes y marco de producto (problema, usuario, MVP, criterios de aceptación).
> **Decisión de modelo:** producto **multi-user real**. Cada usuario ve y gestiona únicamente sus propios datos.

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
- Config: usuario, tipos, categorías, cuentas, apps, monedas, adjuntos.
- Clients (CRUD simple — necesario para tareas).
- Tasks completo (vistas grilla/kanban/lista, drag & drop, /tasks-config con estados).
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

### No-goals (explícitos)

- App mobile nativa (la web debe ser responsive, nada más).
- Conversión automática de monedas / cotizaciones.
- Facturación electrónica, invoices, integraciones contables.
- Colaboración entre usuarios (compartir tareas, workspaces).
- Notificaciones push.

## 6. Decisiones de producto globales

1. **Multi-user con aislamiento total:** toda tabla de negocio lleva `<prefix>_user_id`. Toda query filtra por el usuario autenticado. No existe visibilidad cruzada entre usuarios.
2. **Registro implícito:** no hay formulario de registro. La primera vez que un email valida un OTP correctamente, se crea el usuario y se le siembran sus datos por defecto (estados de tarea: `Pendiente`, `En progreso`, `Completado`; una cuenta `Efectivo` en su moneda; tipos/categorías base).
3. **Borrado lógico universal:** toda tabla tiene `created_at`, `updated_at`, `deleted_at` (ver excepciones documentadas en §13).
4. **Saldos calculados, no mutados:** el balance de una cuenta NUNCA se guarda como total corriente. Se calcula: `acco_initial_amount + ingresos − gastos ± transferencias` (excluyendo registros con `deleted_at`). Así, editar o borrar lógicamente un movimiento no requiere "revertir" nada.
5. **Modelo de sincronización:** los CRUD viajan por HTTP (orpc + tanstack-query con cache de nitro). El websocket se usa ÚNICAMENTE para: (a) eventos de invalidación (`{entity, id, action}` → invalida la query correspondiente) y (b) heartbeat del timer activo. Al reconectar, se refetchea lo invalidado. Ningún CRUD depende del websocket.
6. **Moneda:** una cuenta tiene una sola moneda. Las transferencias entre cuentas de distinta moneda están **fuera del MVP** (la UI lo bloquea con mensaje claro).
7. **Aislamiento de herramientas (ports & adapters):** ninguna librería de terceros se importa directamente desde la lógica de negocio. En backend, dominio/aplicación dependen de puertos (interfaces) y la infraestructura los implementa (ver §10). En frontend, toda librería de UI se consume a través de un componente wrapper propio (ver §9). Cambiar de herramienta = cambiar un adapter, no el negocio.
8. **Tema claro/oscuro:** se configura en Config → apariencia y se persiste en la cuenta del usuario (`user_theme`), de modo que acompaña al usuario en cualquier dispositivo. Las páginas públicas (login, legales) usan la preferencia del sistema operativo porque todavía no hay usuario autenticado.
9. **Telemetría vendor-neutral:** se instrumenta con OpenTelemetry y se exporta por OTLP con destino definido por variables de entorno (`OTEL_EXPORTER_OTLP_ENDPOINT`). Cambiar de backend de observabilidad (local, Grafana/Tempo, SaaS) es configuración, nunca código. En el MVP: trazas + métricas de backend únicamente.
10. **Flujo git:** dos ramas permanentes: `main` (producto final, solo recibe merges estables) y `develop` (rama de desarrollo activa; el trabajo diario ocurre acá o en ramas de feature que mergean a `develop`). Commits con **Conventional Commits** (`feat:`, `fix:`, `chore:`, `docs:`, …) enforced por hook `commit-msg` con husky + commitlint — un commit que no cumple el formato es rechazado.

---

## 7. Navegación

Árbol de secciones en el lateral izquierdo (resizable con resizable-panels):

```
|- Dashboard          /dashboard
|- Tareas             /tasks
|- Schedule           /schedules
|- Clients            /clients
|- Finance
|  |- Income          /incomes
|  |- Expenses        /expenses
|  |- Transfers       /transfers
|- Config             /config
```

Tabla canónica de rutas (fuente única de verdad — cualquier otra mención de URL en este documento es un error):

| Pantalla | URL |
| --- | --- |
| Login | `/login` |
| Verificación OTP | `/login-verification` |
| Dashboard | `/dashboard` |
| Tareas | `/tasks` |
| Config de tareas | `/tasks-config` |
| Clients | `/clients` |
| Income | `/incomes` |
| Expenses | `/expenses` |
| Transfers | `/transfers` |
| Schedule | `/schedules` |
| Config | `/config` |
| Términos y condiciones | `/terms` |
| Política de privacidad | `/privacy` |
| Política de cookies | `/cookies` |

Las páginas legales son **públicas** (no requieren sesión) y se linkean desde el footer del login y del layout principal de la app.

Toda acción que consulta/crea un registro o levanta una modal se refleja en la URL usando el router MPA propio de Octane + `URLSearchParams` (deep-linking y estado compartible). **nuqs NO aplica** (su rol lo cubre el router propio).

---

## 8. Módulos

### 8.1 Login (`/login` + `/login-verification`)

Flujo passwordless:

1. El usuario ingresa solo su email en `/login`.
2. Se genera un código OTP de 6 dígitos (`varchar`, puede tener ceros a la izquierda), se persiste en `login` y se encola el email en `email_sending` (una task de nitro lo envía).
3. Redirige a `/login-verification`, donde se ingresa el código con el paquete **input-otp**.
4. Al validar: se marca el OTP como consumido, se crea la **sesión** (registro en `session` + cookie httpOnly, secure, sameSite=lax, duración 30 días con renovación deslizante) y redirige a `/dashboard`.

Reglas de seguridad (obligatorias):

- El OTP **expira a los 10 minutos**.
- Máximo **5 intentos** fallidos por código; al superarse, el código queda invalidado y hay que pedir uno nuevo.
- Máximo **3 envíos** de código por hora por email (rate limiting).
- Si el email no existe como usuario, se crea al validar el primer OTP (ver §6.2).
- "Cerrar sesión" (desde Config → usuario) hace borrado lógico del registro de `session`: la cookie queda inválida de inmediato.

**Criterios de aceptación:**

- [ ] Un código con ceros a la izquierda (ej. `041283`) valida correctamente.
- [ ] Un código expirado o con 5 intentos fallidos es rechazado con mensaje claro.
- [ ] Recargar el browser con sesión activa mantiene al usuario logueado.
- [ ] Cerrar sesión invalida la cookie aunque se reutilice.

### 8.2 Dashboard (`/dashboard`)

**MVP (Fase 1):**

- Card del timer actualmente corriendo (o CTA para iniciar uno).
- Resumen de tareas agrupadas por estado (contador por columna del kanban).
- Últimas 5 tareas actualizadas.

**Fase 2:** balances por cuenta, ingresos vs gastos del mes corriente, gráfico de tiempo por tipo/categoría.

**Criterios de aceptación (MVP):**

- [ ] Si hay un timer corriendo, se muestra con su tiempo transcurrido en vivo.
- [ ] Estado vacío definido: usuario nuevo ve CTAs ("creá tu primera tarea", "iniciá tu primer timer"), nunca una pantalla en blanco.

### 8.3 Tareas (`/tasks`)

1. **Botón "Nueva tarea"** → abre lateral derecho (resizable) con:
   - Título (obligatorio).
   - Descripción (editor **lexical**).
   - Cliente (opcional).
   - Tipo de tarea (obligatorio). Regla: si se seleccionó cliente, el dropdown muestra los tipos **del cliente + los globales** (los globales son los que tienen `tccl_clie_id NULL` en `type_categories_client`). Si no hay cliente, solo los globales.
   - Categoría (opcional). Solo seleccionable si hay tipo elegido; las opciones se filtran por el tipo seleccionado (misma lógica cliente/global vía `type_categories_client`).
   - Adjuntos (opcional, 1 o más) — **Fase 2**.
   - Al guardar, la tarea queda en el estado por defecto del usuario (`Pendiente`, seed al registrarse).
2. **Ruedita de configuración** al lado del botón → redirige a `/tasks-config`.
3. **Listado** con componente `BaseView` (vistas grilla, kanban, lista):
   - Grilla: botón editar, ícono del tipo, título, descripción breve, categoría, cliente, estado.
   - Kanban: columnas por estado ordenadas según `task_state.tast_order`; drag & drop con **dnd-kit** entre columnas (cambia estado) y dentro de la columna (cambia `task_kanban_order`, persistido — el orden sobrevive al reload).
   - Lista: ícono del tipo a la izquierda; header con cliente/estado; centro con título; footer con descripción.

`/tasks-config`: tabs (por ahora solo "Estados"). CRUD de estados con lateral derecho, vistas grilla y lista vía `BaseView`.

**Criterios de aceptación:**

- [ ] No se puede seleccionar categoría sin tipo (campo deshabilitado con tooltip).
- [ ] Al cambiar el cliente, tipo y categoría incompatibles se resetean.
- [ ] Arrastrar una card a otra columna persiste el nuevo estado y el nuevo orden; al recargar, todo queda donde estaba.
- [ ] Una tarea nueva aparece en la columna "Pendiente" sin intervención.

### 8.4 Schedule (`/schedules`)

1. **Barra superior:** input de texto libre + selector de tipo + selector de categoría + botón play.
   - Al escribir, se buscan tareas existentes (popup debajo del input). Seleccionar una tarea liga el schedule a esa tarea y autocompleta tipo/categoría/cliente desde ella.
   - Si el texto no corresponde a ninguna tarea, se crea un **schedule libre** (sin tarea, sin cliente; tipo/categoría opcionales). NUNCA crea una tarea implícita.
2. **Lista de schedules previos** con botón para reiniciar uno: completa la barra superior y arranca el timer. Si había otro corriendo, el anterior **se cierra automáticamente** (se persiste su fin) y arranca el nuevo. Tiene buscador.
3. **Gráfico de torta** con el tiempo total por schedule (`@octanejs/recharts` — diferido al change de schedule; SSR no testeado).
4. **Detalle por día:** cada ejecución con tarea (o texto libre), tipo, categoría, hora inicio, hora fin y **tipo de ejecución** (`manual` = arrancado desde la barra, `resumed` = reiniciado desde el historial). Buscador + filtros por tipo, categoría y tarea.

**Regla de timer y desconexión (obligatoria):**

- Mientras el timer corre, el frontend envía heartbeat por websocket cada 30 s (actualiza `scit_last_heartbeat`).
- Si el browser se cierra/crash: al volver a entrar, el timer abierto se **reanuda visualmente** y el tiempo cuenta desde el inicio real.
- Si un item quedó abierto con heartbeat más viejo que 12 hs, se cierra automáticamente en su último heartbeat y se le avisa al usuario en su próxima sesión para que lo ajuste manualmente.

**Criterios de aceptación:**

- [ ] Un schedule libre se guarda sin tarea, cliente, tipo ni categoría.
- [ ] Cerrar el browser con timer corriendo y volver: el tiempo no se pierde.
- [ ] Un timer que cruza medianoche reporta duración correcta.
- [ ] Iniciar un schedule desde el historial cierra el que estaba corriendo.

### 8.5 Clients (`/clients`)

CRUD completo con vistas grilla y lista vía `BaseView`. Campos: nombre (obligatorio), email, teléfono (área + número, ambos `varchar` para soportar `+`, ceros iniciales y formatos internacionales), adjunto/logo (Fase 2), cuenta asociada (opcional).

**Criterios de aceptación:**

- [ ] El teléfono `+54 9 11 0000-1111` se guarda y se muestra exactamente igual.
- [ ] No se puede borrar (ni lógicamente) un cliente con tareas o movimientos activos sin confirmación explícita que liste las dependencias.

### 8.6 Finance — Income, Expenses, Transfers (Fase 2)

CRUD completo en `/incomes`, `/expenses`, `/transfers`, vistas grilla y lista vía `BaseView`.

Reglas de negocio:

- Todo monto es `> 0` (CHECK en BD + validación en form).
- Income/expense: cuenta, tipo y moneda obligatorios; categoría y cliente opcionales.
- Transfer: cuenta origen obligatoria; destino es **exactamente uno** de: otra cuenta del usuario (`tran_acco_to`) o un destino externo de texto libre (`tran_other` con `tran_sino_other = sí`). CHECK en BD garantiza la exclusividad.
- No se permite transferir de una cuenta a sí misma.
- El balance de cada cuenta es calculado (ver §6.4) — ninguna escritura de movimientos muta `accounts`.

**Criterios de aceptación:**

- [ ] Crear, editar y borrar lógicamente movimientos siempre deja el balance consistente con la suma de movimientos.
- [ ] Una transferencia externa no requiere cuenta destino; una interna sí.
- [ ] La UI impide transferencias entre cuentas de distinta moneda (MVP).

### 8.7 Config (`/config`)

Tabs: **usuario, apariencia, tipos, categorías, cuentas, apps, monedas, adjuntos**.

- **usuario:** información del usuario + botón cerrar sesión.
- **apariencia:** selector de tema `claro` / `oscuro` / `sistema` (sigue la preferencia del SO). Persiste en `user_theme` de la cuenta y se aplica de inmediato sin recargar.
- **tipos / categorías / cuentas / apps / monedas:** botón "nuevo" → lateral derecho con el formulario; listado con vistas grilla y lista vía `BaseView`.
- **adjuntos:** listado grilla/lista (solo lectura + eliminar).

`apps` representa los **módulos de la aplicación** (tasks, schedule, finance…) y sirve para que tipos y categorías se asocien a un módulo. Es tabla global seedeada, no editable por usuarios finales en el MVP (visible solo lectura).

`currency` es global seedeada (USD, EUR, ARS, etc.); los usuarios no crean monedas en el MVP.

### 8.8 Páginas legales (`/terms`, `/privacy`, `/cookies`)

Contenido institucional obligatorio para operar un producto con cuentas y datos financieros personales.

Reglas de negocio:

- Son **públicas** y se renderizan desde contenido estático versionado (markdown en el repo). Cada documento tiene una versión (ej. `terms_version = "1.0"`).
- En el **registro implícito** (primer OTP validado) se registra la aceptación: `user_accepted_terms_at` + `user_terms_version`. El copy del login deja claro que al continuar se aceptan los términos, con link visible.
- Re-aceptación al publicar una versión nueva: **Fase 2** (banner persistente hasta aceptar).
- La redacción legal definitiva es contenido pendiente (ver §13); el MVP se construye con placeholders estructurados que el contenido final reemplaza sin tocar código.

**Criterios de aceptación:**

- [ ] Las tres páginas cargan sin sesión y mantienen el tema según la preferencia del SO.
- [ ] El footer del login y el de la app linkean a las tres páginas.
- [ ] Al registrarse un usuario quedan persistidos fecha y versión de aceptación.
- [ ] Cambiar el contenido de una página legal no requiere tocar componentes (solo el archivo de contenido).

---

## 9. Componentes transversales

### BaseView (React/TSRX)

Componente con vistas grilla, lista y kanban, selector de vista y filtro de búsqueda. Cada instancia genera su propio id con `useId` (o recibe `id` por prop como override), y persiste sus filtros en localStorage bajo esa key para evitar colisiones.

```tsx
<BaseView
  id="tasks-list"                 // opcional; default: useId()
  filters={filters}               // { search: string } — persistido en localStorage[id]
  records={records}               // datos a mostrar
  gridStructure={gridStructure}   // estructura de la vista grilla
  listStructure={listStructure}   // estructura de la vista lista
  kanbanStructure={kanbanStructure} // estructura de las cards kanban
  views={['list', 'grid']}        // opcional; si se omite, muestra las 3 vistas
/>
```

### Sistema de diseño

Diseño **minimalista**: mucho aire, jerarquía tipográfica clara, una sola acción primaria por pantalla, sin bordes ni sombras decorativas innecesarias.

Todo estilo se define como **token semántico** (nunca un valor hex/tipografía hardcodeado en un componente). Tokens mínimos:

- **Color primario: verde.** Escala propia (`primary-50` … `primary-900`) con valores distintos para tema claro y oscuro. Referencia inicial: `green-600` de tailwind (`#16a34a`) en claro y `green-500` (`#22c55e`) en oscuro — ajustable en un solo archivo de tokens.
- Tokens de superficie y texto: `background`, `surface`, `border`, `text-primary`, `text-secondary`, cada uno con valor por tema.
- **Tipografía: Poppins** (vía `@fontsource/poppins`, pesos 400/500/600/700) como familia base en toda la app.

Implementación del tema: los tokens son variables CSS; el modo oscuro se aplica con la estrategia de clase (`class="dark"` en `<html>`) leyendo `user_theme`.

### Regla de wrappers (aislamiento de librerías en frontend)

Ningún componente de negocio importa una librería de UI de terceros directamente. Cada librería se expone a través de un wrapper propio en una capa dedicada (`components/vendor/`), que es el **único** lugar del codebase que conoce esa dependencia:

| Wrapper propio | Encapsula |
| --- | --- |
| `Icons` | `@octanejs/phosphor-icons` (adoptado) |
| `OtpInput` | `@octanejs/zag` (pin-input de zag; adoptado) |
| Sidebar resizable | `@octanejs/resizable-panels` (adoptado) |
| `Toast` | `@octanejs/sonner` (adoptado) |
| `Hooks` | `@octanejs/usehooks-ts` — **cohorte parcial** host-safe (adoptado; ausentes storage/media/DOM-observer, se deciden en su change consumidor) |
| `I18nProvider` / `t()` | `i18next` — **integración propia mantenida** (variante equivalente; `@octanejs/i18next` en gate de re-evaluación: se adopta cuando un change necesite `Trans`/ICU/pluralización) |
| ErrorBoundary | **nativa de Octane 0.2.3** (`ErrorBoundary`/`@try`-`@catch`; NO `react-error-boundary` ni su binding — divergencia component-stack vacío documentada) |
| `RichTextEditor` | `@octanejs/lexical` (diferido → change tasks) |
| `DragDrop` | `@octanejs/dnd-kit` (diferido → change tasks, kanban) |
| `DatePicker` | day-picker (diferido → change schedule) |
| `Charts` | `@octanejs/recharts` (diferido → change schedule; SSR no testeado, Brush/Treemap no soportados) |
| `DataTable` / `VirtualList` | tanstack table / virtual (diferido → change data layer) |
| `ColorPicker` | colorful (diferido → change config, categorías) |
| `Motion` | spring (diferido → primer change con animación) |

NO aplican: tanstack `router` / `router-ssr-query` y `nuqs` (router MPA propio de Octane + `URLSearchParams`).

Regla verificable: un import de cualquiera de esas librerías fuera de `components/vendor/` es un error de review (y, cuando exista tooling, de lint).

### Resto de lineamientos técnicos

- Componentes modulares y reutilizables (atomic design en frontend).
- Adjuntos: se suben a Server Assets de nitro; se guarda el id + metadata en `attachments` y la relación en la tabla intermedia del módulo.
- Descripciones con **lexical** (`@octanejs/lexical`); colores con **colorful**; íconos con **`@octanejs/phosphor-icons`**; toasts con **`@octanejs/sonner`**; errores de UI con la **ErrorBoundary nativa de Octane** (`@try`-`@catch`; NO react-error-boundary); fechas con **day-picker**; animaciones con **spring**; utilidades TS con **`@octanejs/usehooks-ts`** (cohorte parcial host-safe).
- Laterales izquierdo y derecho resizables con **`@octanejs/resizable-panels`**.
- Emails: registro en `email_sending` + task de nitro que procesa la cola.

---

## 10. Arquitectura y stack

Monolito-monorepo (turborepo). Frontend con atomic design; backend con clean architecture.

### Ports & adapters (backend)

La lógica de negocio (dominio + casos de uso) solo conoce **puertos** (interfaces TS propias). Cada integración externa vive en un adapter intercambiable:

| Puerto | Implementación inicial |
| --- | --- |
| `EmailSender` | Cola `email_sending` + task de nitro |
| `OtpGenerator` / `TokenHasher` | crypto de bun |
| `IdGenerator` | UUIDv7 |
| `Clock` | Reloj del sistema (inyectable para tests) |
| `FileStorage` | Server Assets de nitro |
| `Telemetry` | OpenTelemetry SDK (ver abajo) |
| Repositorios por entidad | kysely sobre PostgreSQL |

Regla verificable: el dominio no importa `kysely`, `h3`, `nitro` ni ningún SDK externo; solo los adapters lo hacen. Esto hace que cambiar de ORM, de servidor HTTP o de proveedor de email sea un cambio acotado a un adapter.

### Telemetría (OpenTelemetry)

Alcance MVP — **backend, trazas + métricas**:

- **Trazas:** un span por request HTTP (nitro) con atributo del procedimiento orpc invocado; spans hijos por query kysely (statement sanitizado, **sin** valores de binds). Propagación W3C TraceContext.
- **Métricas:** histograma de duración de requests, contador de errores 5xx, contadores de negocio básicos (OTPs enviados, sesiones creadas, timers iniciados).
- **Export:** OTLP estándar, destino 100% configurable por entorno (`OTEL_EXPORTER_OTLP_ENDPOINT`, headers, sampling). Sin backend de observabilidad configurado, la telemetría se degrada a no-op sin afectar la app.
- **Privacidad:** ningún span ni métrica lleva PII (nunca emails, títulos de tareas ni montos); el identificador de usuario no se exporta como atributo.
- El acceso a la API de OTel se hace únicamente a través del puerto `Telemetry`, nunca importando el SDK desde la lógica de negocio.

Telemetría de frontend (web vitals, trazas de navegación) y logs estructurados correlacionados con trazas: **Fase 3**.

**Backend:** nitro, h3, orpc, kysely, PostgreSQL, bun, vite, effect, xstate, shiki, OpenTelemetry (SDK + instrumentations + exporter OTLP), Makefile.
**Tooling de repo:** husky + @commitlint (Conventional Commits en hook `commit-msg`).
**Frontend:** octanejs (tsrx), vite, bun, tailwindcss, @fontsource/poppins, effect, xstate + @octanejs/xstate, i18next (integración propia; `@octanejs/i18next` en gate de re-evaluación). Bindings adoptados: @octanejs/zag (+@zag-js/pin-input), @octanejs/phosphor-icons, @octanejs/resizable-panels, @octanejs/sonner, @octanejs/usehooks-ts (cohorte parcial). Diferidos con change consumidor: @octanejs/lexical (tasks), @octanejs/dnd-kit (tasks/kanban), day-picker (schedule), @octanejs/recharts (schedule; SSR no testeado), colorful (config/categorías), tanstack store/db/query/form/table/virtual (data layer), spring (primera animación), shiki (sin consumidor en frontend). NO aplican: tanstack router / router-ssr-query / nuqs (router MPA propio de Octane + URLSearchParams); @octanejs/react-error-boundary (ErrorBoundary nativa de Octane 0.2.3).

---

## 11. Estructura de BD (schema corregido)

Convenciones (obligatorias al crear tablas):

1. Nombres de tablas en inglés.
2. Prefijo de 4 letras por tabla (ej. `categories` → `cate`). Tablas de dos palabras: 2+2 letras (ej. `task_attachments` → `taat`).
3. Referencias: `<prefijo_origen>_<prefijo_referencia>_id` (ej. `tccl_cate_id`).
4. Toda tabla lleva `created_at`, `updated_at`, `deleted_at`. **Excepciones documentadas:** `logs` es append-only (no se edita ni borra: lleva solo `created_at`); `sino`, `apps` y `currency` son lookups globales seedeados (llevan `created_at`/`updated_at`, sin `deleted_at` porque jamás se borran).
5. UUIDs: UUIDv7.
6. Toda tabla de negocio lleva `<prefix>_user_id NOT NULL` + índice. Las FKs se declaran **del hijo al padre** (la columna hija referencia la PK del padre). Toda FK referencia una PK o columna UNIQUE.

```sql
-- ============ Auth & usuarios ============

CREATE TABLE "user" (
    "user_id" uuid NOT NULL,
    "user_name" varchar NOT NULL,
    "user_email" varchar NOT NULL,
    "user_sino_emailverificado" int NOT NULL DEFAULT 0,
    "user_theme" varchar NOT NULL DEFAULT 'system',   -- tema: 'light' | 'dark' | 'system'
    "user_accepted_terms_at" timestamptz,             -- aceptación de términos (registro implícito)
    "user_terms_version" varchar,                     -- versión aceptada, ej. '1.0'
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
    "logi_code" varchar(6) NOT NULL,          -- varchar: preserva ceros a la izquierda
    "logi_attempts" int NOT NULL DEFAULT 0,   -- máx 5 intentos (regla de app)
    "logi_expires_at" timestamptz NOT NULL,   -- 10 minutos
    "logi_consumed_at" timestamptz,           -- NULL = no usado
    "logi_created_at" timestamptz NOT NULL,
    "logi_updated_at" timestamptz NOT NULL,
    PRIMARY KEY ("logi_id")
);
CREATE INDEX "idx_login_email_created" ON "login" ("logi_email", "logi_created_at");

CREATE TABLE "session" (
    "sess_id" uuid NOT NULL,
    "sess_user_id" uuid NOT NULL,
    "sess_token_hash" varchar NOT NULL,       -- nunca se guarda el token en claro
    "sess_expires_at" timestamptz NOT NULL,   -- 30 días, renovación deslizante
    "sess_created_at" timestamptz NOT NULL,
    "sess_updated_at" timestamptz NOT NULL,
    "sess_deleted_at" timestamptz,            -- cerrar sesión = borrado lógico
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
    "curr_decimal" smallint NOT NULL,         -- cantidad de decimales (0, 2, 3...)
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
    "clie_areaphone" varchar,                 -- varchar: soporta + y ceros iniciales
    "clie_phone" varchar,
    "clie_atta_id" uuid,
    "clie_acco_id" uuid,
    "clie_created_at" timestamptz NOT NULL,
    "clie_updated_at" timestamptz NOT NULL,
    "clie_deleted_at" timestamptz,
    PRIMARY KEY ("clie_id")
);
CREATE INDEX "idx_client_user" ON "client" ("clie_user_id") WHERE "clie_deleted_at" IS NULL;

-- NULL en tccl_clie_id = combinación GLOBAL (disponible sin cliente).
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
    "tast_user_id" uuid NOT NULL,             -- cada usuario define sus estados
    "tast_title" varchar NOT NULL,            -- el kanban lo muestra: obligatorio
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
    "task_kanban_order" double precision NOT NULL DEFAULT 0, -- orden dentro de la columna
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
    "sche_title" varchar NOT NULL,            -- texto libre o título de la tarea
    "sche_clie_id" uuid,                      -- nullable: schedule libre
    "sche_task_id" uuid,                      -- nullable: schedule libre
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
    "scit_start" timestamptz NOT NULL,        -- timestamptz: soporta cruce de medianoche
    "scit_end" timestamptz,                   -- NULL = timer corriendo
    "scit_duration" interval,                 -- interval, no time
    "scit_origin" varchar NOT NULL DEFAULT 'manual', -- 'manual' | 'resumed'
    "scit_last_heartbeat" timestamptz,        -- heartbeat del timer (cada 30 s)
    "scit_created_at" timestamptz NOT NULL,
    "scit_updated_at" timestamptz NOT NULL,
    "scit_deleted_at" timestamptz,
    PRIMARY KEY ("scit_id"),
    CONSTRAINT "ck_scit_origin" CHECK ("scit_origin" IN ('manual', 'resumed')),
    CONSTRAINT "ck_scit_end_after_start" CHECK ("scit_end" IS NULL OR "scit_end" >= "scit_start")
);
CREATE INDEX "idx_schedule_items_sche" ON "schedule_items" ("scit_sche_id");
-- Un solo timer abierto por usuario (vía schedule):
CREATE UNIQUE INDEX "uq_open_timer" ON "schedule_items" ("scit_sche_id") WHERE "scit_end" IS NULL;

-- ============ Finance ============

CREATE TABLE "accounts" (
    "acco_id" uuid NOT NULL,
    "acco_user_id" uuid NOT NULL,
    "acco_title" varchar NOT NULL,
    "acco_icon" varchar NOT NULL,
    "acco_color" varchar NOT NULL,
    "acco_curr_id" uuid NOT NULL,
    "acco_initial_amount" numeric NOT NULL DEFAULT 0, -- el balance SE CALCULA, no se guarda
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

-- ============ Adjuntos (tabla intermedia por módulo: FKs reales) ============

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

-- ============ Foreign keys (siempre del hijo al padre) ============

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

## 12. Seeds obligatorios

Al registrarse un usuario (primer OTP validado), se crean para él:

- Estados de tarea: `Pendiente` (orden 1), `En progreso` (orden 2), `Completado` (orden 3).
- Una cuenta `Efectivo` en la moneda por defecto.
- Tipos y categorías base por módulo.

Seeds globales (migración): `sino` (0/1), `apps` (tasks, schedule, finance), `currency` (USD, EUR, ARS, …).

## 13. Riesgos y decisiones pendientes

| Tema | Estado |
| --- | --- |
| Conversión de monedas en transferencias | Fuera del MVP; decidir en Fase 3 |
| `logs` como auditoría genérica | Diseño tentativo; evaluar event sourcing liviano si crece |
| Adjuntos en Fase 2 | Las tablas intermedias ya están en el schema para no migrar después |
| Redacción de textos legales | Contenido pendiente: requiere redacción/revisión profesional; el MVP usa placeholders versionados |
| Re-aceptación de términos al cambiar versión | Fase 2 (banner hasta aceptar) |
| Backend de observabilidad en producción | Pendiente de decisión de deploy; el código ya es OTLP vendor-neutral |
| Telemetría frontend y logs correlacionados | Fase 3 |
