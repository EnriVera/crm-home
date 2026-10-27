# CRM-HOME — PRD-DESIGN (web-v2)

> **Documento companion de `docs/PRD-v3.md`.** Define la dirección visual, las secciones (rutas), la iconografía, el color, la forma y las animaciones del frontend `apps/web-v2`. No re-define alcance funcional: eso vive en PRD-v2 §7–§8 y se hereda sin cambios.
>
> **Relación con `DESIGN.md` (raíz):** ese documento gobernaba `apps/web` (octane, Poppins, radio discreto). Este documento **lo reemplaza para `web-v2`** en todo lo visual. Donde difieren, manda este documento (radio más redondeado, Roboto según preset shadcn-vue §3.2 de PRD-v3, superficies zinc).

---

## 1. Dirección visual

**Tesis:** una herramienta de trabajo serena y redondeada. Minimalismo real: mucho aire, neutros zinc, un solo acento verde, bordes redondeados generosos, cero ornamento. La interfaz desaparece; el verde aparece solo donde hay algo que hacer o confirmar.

**Personalidad:** cálida pero precisa. Los bordes redondeados le quitan lo corporativo/frío al minimalismo; el verde le da vida sin gritar.

### 1.1 Inspiración ClickUp — estructural, no visual

Tomamos de ClickUp la **arquitectura de experiencia de tareas**, no su estética (su look es denso y saturado; el nuestro es aire + zinc + un acento). Lo que adoptamos:

| De ClickUp | Aplicación en CRM-HOME |
| --- | --- |
| Kanban como vista principal de tareas, columnas por estado, orden arrastrable | `/tasks` vista kanban (PRD-v2 §8.3) |
| Card compacta con: estado, título, badges de tipo/categoría/cliente | Anatomy de `TaskCard` (§7.2) |
| Creación rápida: botón primario único + drawer lateral derecho | `EditTaskDrawer` (§7.3) |
| Switcher de vistas (lista / grilla / kanban) persistente por módulo | `BaseView` (PRD-v2 §9) |
| Drawer de edición con detalle a la derecha, sin perder contexto del board | Drawer resizable derecho en tareas, clients, config |
| Barra superior de timer con autocomplete que liga a una tarea | Barra de `/schedules` (§7.4) |
| Sidebar con agrupación clara y un solo item activo | `AppShell` (§7.1) |

Lo que **no** tomamos: densidad extrema, múltiples acentos de color, celebraciones/efectos llamativos por cada acción, iconos rellenos para navegación.

---

## 2. Secciones de la aplicación (rutas)

Fuente única de verdad de rutas: PRD-v2 §7 (tabla canónica). Esta tabla agrega a cada ruta su ícono Phosphor y su acción primaria.

### 2.1 Árbol de navegación (sidebar)

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

### 2.2 Tabla de rutas

| Ruta | Nombre | Ícono (Phosphor) | Fase | Acción primaria |
| --- | --- | --- | --- | --- |
| `/` | Redirect por sesión | — | 1 | — |
| `/login` | Login | `EnvelopeSimple` | 1 | Enviar código |
| `/login-verification` | Verificación OTP | `LockKeyOpen` | 1 | Verificar |
| `/dashboard` | Dashboard | `SquaresFour` | 1 | Iniciar timer (si no hay ninguno) |
| `/tasks` | Tareas | `CheckSquare` | 1 | Nueva tarea (`Plus`) |
| `/tasks-config` | Config de tareas | `SlidersHorizontal` | 1 | Nuevo estado |
| `/schedules` | Schedule | `Clock` | 1 | Play (`Play`) |
| `/clients` | Clients | `Users` | 1 | Nuevo cliente |
| `/incomes` | Income | `TrendUp` | 2 | Nuevo ingreso |
| `/expenses` | Expenses | `TrendDown` | 2 | Nuevo gasto |
| `/transfers` | Transfers | `ArrowsLeftRight` | 2 | Nueva transferencia |
| `/config` | Config | `Gear` | 1 | — (tabs; acción por tab) |
| `/terms` | Términos | — (pública, footer) | 1 | — |
| `/privacy` | Privacidad | — (pública, footer) | 1 | — |
| `/cookies` | Cookies | — (pública, footer) | 1 | — |

**Reglas:**

- Una **única acción primaria por pantalla** (botón verde sólido). Todo lo demás es ghost/secondary.
- El footer del login y del shell linkean las tres páginas legales (PRD-v2 §8.8).
- Tabs, drawers y filtros se reflejan en la URL (deep-linking).

---

## 3. Iconografía

- **Set único: Phosphor Icons** (`@phosphor-icons/vue`, encapsulado en `shared/vendor/icons/`, PRD-v3 §3.1).
- **Pesos por rol:** `regular` para navegación y elementos pasivos · `bold` para acciones (botones primarios, play/stop) · `fill` solo para el item activo del sidebar. Jamás `fill` en elementos pasivos.
- **Tamaños:** 20px sidebar/nav · 16px en línea (badges, meta de card) · 24px acciones destacadas (play) · 32px estados vacíos.
- **Trazo consistente:** un solo set en toda la app; mezclar familias es error de review.
- Todo ícono decorativo lleva `aria-hidden`; todo ícono sin label lleva `aria-label` accesible.

### 3.1 Mapeo de íconos por elemento

| Elemento | Ícono |
| --- | --- |
| Dashboard | `SquaresFour` |
| Tareas | `CheckSquare` |
| Schedule | `Clock` |
| Clients | `Users` |
| Finance (grupo) | `CurrencyCircleDollar` |
| Income / Expenses / Transfers | `TrendUp` / `TrendDown` / `ArrowsLeftRight` |
| Config | `Gear` |
| Config de tareas | `SlidersHorizontal` |
| Nueva (tarea/cliente/estado/…) | `Plus` |
| Timer: play / pause / stop | `Play` / `Pause` / `Square` (stop) |
| Reiniciar del historial | `ArrowClockwise` |
| Buscar | `MagnifyingGlass` |
| Editar | `PencilSimple` |
| Borrar | `Trash` |
| Cerrar (drawer/modal) | `X` |
| Filtros | `Funnel` |
| Calendario / fecha | `Calendar` |
| Vista lista / grilla / kanban | `Rows` / `SquaresFour`¹ / `Kanban` |
| Drag handle (kanban) | `DotsSixVertical` |
| Adjuntos | `Paperclip` |
| Tema: claro / oscuro / sistema | `Sun` / `Moon` / `Monitor` |
| Cerrar sesión | `SignOut` |
| Usuario | `UserCircle` |
| Estado vacío (genérico) | según módulo, en círculo tintado verde |
| Chequeo / éxito | `CheckCircle` |
| Error / warning | `WarningCircle` |

> ¹ `SquaresFour` se comparte entre Dashboard (nav) y vista grilla (switcher). No colisionan por contexto, pero si en uso se vuelve confuso, la vista grilla pasa a `LayoutGrid`. Decisión visual a confirmar en implementación de `/tasks`.

---

## 4. Color

### 4.1 Escala primaria — verde (estática, no cambia por tema)

| Token | Hex | Uso típico |
| --- | --- | --- |
| `primary-50` | `#f0fdf4` | Fondos tintados (estado vacío, hover suave) |
| `primary-100` | `#dcfce7` | Badges/chips de estado, track de progreso |
| `primary-200` | `#bbf7d0` | Bordes de hover en cards |
| `primary-300` | `#86efac` | Hover de acento, anillos suaves |
| `primary-400` | `#4ade80` | Acento interactivo en tema oscuro (texto) |
| `primary-500` | `#22c55e` | **Acento principal en tema oscuro** |
| `primary-600` | `#16a34a` | **Acento principal en tema claro** |
| `primary-700` | `#15803d` | Texto verde en tema claro (AA) |
| `primary-800` | `#166534` | Énfasis oscuro |
| `primary-900` | `#14532d` | Bordes/decoración muy oscura |

### 4.2 Neutros — zinc

`zinc-50 #fafafa` · `100 #f4f4f5` · `200 #e4e4e7` · `300 #d4d4d8` · `400 #a1a1aa` · `500 #71717a` · `600 #52525b` · `700 #3f3f46` · `800 #27272a` · `900 #18181b` · `950 #09090b`

### 4.3 Tokens semánticos por tema

| Token | Claro | Oscuro | Uso |
| --- | --- | --- | --- |
| `accent` | `primary-600` | `primary-500` | Acción primaria, selección, foco |
| `accent-fg` | `#ffffff` | `zinc-950` | Texto sobre acento |
| `bg` | `zinc-50` | `zinc-950` | Fondo de página |
| `surface` | `#ffffff` | `zinc-900` | Cards, drawers, popovers |
| `surface-2` | `zinc-100` | `zinc-800` | Sidebar, columnas kanban, secciones anidadas |
| `border` | `zinc-200` | `zinc-800` | Hairlines y bordes de control |
| `text` | `zinc-900` | `zinc-50` | Texto principal |
| `text-2` | `zinc-600` | `zinc-400` | Texto secundario |
| `error` | `#dc2626` | `#f87171` | Errores (AA como texto) |
| `success` | `primary-700` | `primary-400` | Mensajes de éxito |
| `warning` | `#d97706` | `#fbbf24` | Avisos (timer stale, confirmaciones) |

> Los colores propios de los datos del usuario (estados de tarea, tipos, categorías, cuentas: columnas `tast_color`, `type_color`, `cate_color`, `acco_color` del schema PRD-v2 §11) **se respetan como color de dato**: badge tintado, punto de color, borde de card. El verde de marca jamás compite con el color de un estado de tarea.

### 4.4 Regla del acento verde (vinculante)

El verde se usa **solo** en:

1. Acción primaria (relleno del único botón primario).
2. Item activo de navegación.
3. Anillo de foco visible.
4. Indicador de éxito.
5. Links inline en prosa.

**Nunca** como decoración, en elementos inactivos, en ghost buttons, ni en dos señales cromáticas para el mismo hecho. Contraste WCAG 2.2 AA: texto verde pequeño en claro solo como `primary-700` (≈5:1); `primary-600` queda para texto grande, íconos y rellenos con texto blanco. Foco canónico: `outline: 2px solid <accent>; outline-offset: 2px` — jamás `outline: none` sin reemplazo.

### 4.5 Implementación

Un solo archivo con valores crudos: `apps/web-v2/src/shared/ui/tokens.css` (PRD-v3 §4.4, §8.2). Tailwind v4 los lee vía `@theme` en `app.css`. **Ningún hex fuera de ese archivo.**

---

## 5. Forma: bordes redondeados y elevación

Marca registrada del producto: **esquinas suaves en todo**.

| Token | Valor | Uso |
| --- | --- | --- |
| `radius-sm` | `0.5rem` | Inputs, selects, badges pequeños |
| `radius` | `0.75rem` | Botones, cards, items de lista, chips |
| `radius-lg` | `1rem` | Cards grandes, drawers, modales, panel de timer |
| `radius-xl` | `1.25rem` | Contenedores destacados (timer card del dashboard) |
| `radius-full` | `9999px` | Avatares, pills de filtro, contador del timer |

Reglas:

- Bordes de **1px hairline** con token `border`; solo separan regiones o definen controles.
- **Sin sombras decorativas.** La jerarquía se construye con espacio, `surface` vs `bg`, peso tipográfico y el acento. La única sombra permitida es la de elevación funcional de un elemento arrastrado (drag) o un popover/drawer abierto — y es sutil (`0 8px 24px rgb(0 0 0 / 0.08)` claro / `0 8px 24px rgb(0 0 0 / 0.4)` oscuro).
- Mismo radio dentro de una familia de componentes; no mezclar `radius` y `radius-lg` en cards hermanas.
- Espaciado en grilla de 4px, aire generoso: padding de página ≥ 24–32px, 2rem entre secciones (PRD-v3 §8.1), más aire arriba de un encabezado que debajo.

---

## 6. Tipografía

- **Familia única: Roboto** (heading + body, según preset shadcn-vue PRD-v3 §3.2: `roboto`/`roboto`).
- Headings: Roboto `font-weight: 600`, `letter-spacing: -0.01em`. Body: `400`.
- Escala fija en rem, ratio ~1.125: **12 / 14 / 16 (base) / 18 / 20 / 24 / 32**. Títulos de página en 20–24. Nada de display sizes en superficies de gestión.
- Pesos: 400 cuerpo · 500 labels/nav · 600 títulos y acción primaria.
- Dígitos del timer y duraciones con `font-variant-numeric: tabular-nums` (el contador no "baila" al tick).
- Prosa corrida (legales, ayuda) con medida ≤ 65–75ch.

---

## 7. Layout y componentes clave

### 7.1 AppShell

Sidebar izquierda resizable (mín. íconos solos, con `aria-label`; expandida con ícono + label), topbar fina con breadcrumb/contexto y toggle de tema, área principal con padding generoso. Sidebar en `surface-2`, fondo `bg`. El item activo del sidebar: tinte `primary-50` (claro) / `primary-900/40` (oscuro) con barra indicadora de 3px redondeada a la izquierda + label en `accent`. **Un solo item activo.**

### 7.2 TaskCard (anatomy — inspiración ClickUp)

```text
┌───────────────────────────────────╮  radius-lg, surface, hairline
│ ● [Estado]          ⋮⋮            │  estado como chip tintado con su color de dato
│ Título de la tarea                │  500, 1 línea + ellipsis
│ Descripción breve…                │  text-2, 2 líneas max
│ [icono tipo] Tipo · [Users] Client│  meta 12px, text-2
│ ═══════░░░ 2h 15m                 │  barra de progreso de tiempo (si tiene)
└───────────────────────────────────╯
```

- Hover: borde pasa a `primary-300` + `translateY(-1px)`, 150ms.
- Drag: la card se eleva (sombra funcional + ring `primary-300` + leve scale 1.02); la columna destino se tinta `primary-50/50`.
- Click en la card abre el drawer de edición (no un modal, no navegar).

### 7.3 EditTaskDrawer

Drawer derecho resizable (`radius-lg` en la esquina visible, slide 250ms). Header con título del drawer + `X`. Formulario: título → descripción (tiptap, toolbar mínima) → cliente → tipo → categoría (vee-validate + zod; categoría deshabilitada hasta elegir tipo, PRD-v2 §8.3). Footer pegado: acción primaria "Guardar" a la derecha. Al guardar: toast de éxito + la card aparece en la columna correcta sin refetch visible.

### 7.4 Barra de Schedule (top de `/schedules`)

Un solo campo compuesto redondeado (`radius-full`, surface-2): texto libre con autocomplete de tareas (popover debajo, `radius-lg`), chips de tipo/categoría seleccionados, y botón play verde (`radius-full`, 40px, ícono `Play` bold). Al correr: el botón se vuelve stop (`Square`) y la barra entra en estado "activo" (borde `accent`, timer live dentro de la barra). **Un solo timer abierto por usuario** (regla `uq_open_timer`, PRD-v2 §8.4).

### 7.5 BaseView (lista / grilla / kanban)

Switcher persistido en localStorage por instancia (`useId`, PRD-v2 §9). Switcher como segmented control pill (`radius-full`), opción activa con tinte verde. Buscador con `MagnifyingGlass` a la izquierda, `radius-full`.

---

## 8. Animaciones y micro-interacciones

Principio: **animaciones simples que comunican estado y dirigen la atención** — nunca decorativas, nunca coreografiadas. CSS transitions + `<Transition>` de Vue; ninguna librería de motion en v1. Todo respeta `prefers-reduced-motion` (se reduce a cambios instantáneos).

| # | Momento | Animación | Duración / easing |
| --- | --- | --- | --- |
| 1 | Entrada de página (cambio de ruta) | Fade 8→100% + `translateY(4px)→0` | 180ms ease-out |
| 2 | Entrada de lista (primer render de cards/filas) | Stagger: cada item fade + `translateY(6px)→0`, ~30ms de separación, máx. 8 items | 200ms ease-out por item |
| 3 | Hover de card | Border → `primary-300` + `translateY(-1px)` | 150ms ease-out |
| 4 | Press de botón | `scale(1→0.97)` y vuelta | 100ms ease-out |
| 5 | Drag de card kanban | Lift (sombra funcional + ring + scale 1.02); columna destino tintada | 150ms al levantar; en vivo durante drag |
| 6 | Drop en kanban | La card se asienta (scale 1.02→1) y las demás hacen FLIP suave al reacomodarse | 200ms cubic-bezier(0.2, 0.8, 0.2, 1) |
| 7 | Apertura/cierre de drawer | Slide desde la derecha; overlay fade | 250ms cubic-bezier(0.32, 0.72, 0, 1) |
| 8 | Timer corriendo | Dígitos con tabular-nums (tick por segundo, sin animación); anillo/borde de la barra con **pulso suave** (opacity 0.6→1, loop 2s) solo mientras corre | 2s ease-in-out infinite |
| 9 | Skeletons de carga | Shimmer: barras en `surface-2` con barrido de luz sutil | 1.4s linear infinite |
| 10 | Toast de éxito/error | Slide-up + fade desde abajo-centro | 250ms ease-out |
| 11 | Toggle de tema | Crossfade de superficies | 200ms linear |
| 12 | Aparición de mensajes inline (éxito/error de form) | Fade + `translateY(-2px)` | 150ms ease-out |

**Qué llama la atención (y está permitido):** el pulso del timer activo (8) — es el único loop permanente de la app y marca dónde está pasando la acción; el stagger de entrada (2) — da vida al primer render sin recargarlo; el lift del drag (5). Todo lo demás vive y muere en <300ms.

**Prohibido:** parallax, scroll-jacking, animaciones de carga de página largas, confetti/celebraciones, rebotes elásticos, loops decorativos fuera del timer.

---

## 9. Estados por sección

| Sección | Empty state | Loading | Error |
| --- | --- | --- | --- |
| `/login` | — | Botón en estado loading ("Enviando…") | Inline en el form (toast no) |
| `/login-verification` | — | Shimmer de los 6 boxes del OTP | Inline + reenviar código |
| `/dashboard` | Timer: CTA "Iniciar tu primer timer"; Tareas: CTA "Crear tu primera tarea". Ilustración = ícono del módulo en círculo `primary-50`, título 18px 600, texto `text-2`, un CTA | Skeleton de card de timer + 3 columnas de contadores | Panel "Algo salió mal" con retry |
| `/tasks` | Ícono `CheckSquare` en círculo tintado + "Todavía no tenés tareas" + CTA | Skeleton de board/cards | Retry + mensaje inline |
| `/tasks` kanban | Columnas renderizadas con placeholder vacío por columna ("Arrastrá una tarea acá" en dash) | Skeleton por columna | Retry |
| `/schedules` | CTA "Iniciá tu primer timer" + hint del autocomplete | Skeleton de barra + lista | Retry |
| `/clients`, `/config` tabs | Ícono del módulo + CTA "Nuevo…" | Skeleton de lista/grilla | Retry |
| Legales | — | — | 404/mensaje estático |

Reglas globales: nunca una pantalla en blanco; skeletons en la forma exacta del contenido final (sin spinners en el primer paint de una ruta, PRD-v3 §8.4); errores transitorios por toast, errores bloqueantes inline.

---

## 10. Qué NO hacer (bans)

- No hex, fuente, radio ni sombra fuera de `tokens.css`.
- No verde decorativo ni en elementos inactivos (regla §4.4).
- No más de una acción primaria por pantalla.
- No sombras decorativas; solo elevación funcional (drag, popover, drawer).
- No bordes puntiagudos en componentes nuevos: todo entra por la escala de radios §5.
- No iconos `fill` en navegación ni mezclar sets de íconos.
- No modales como primera opción: drawer o inline primero.
- No animaciones decorativas ni loops fuera del pulso del timer (§8).
- No display fonts, gradientes decorativos ni glassmorphism.
- No texto verde pequeño `#16a34a` sobre fondo claro (rompe AA): usar `primary-700`.
- No componentes entregados sin estados default/hover/focus/active/disabled/loading/error.

---

## 11. Referencias

- `docs/PRD-v3.md` — stack, preset shadcn-vue (§3.2), arquitectura frontend, tokens base (§8.2).
- `docs/PRD-v2.md` — tabla canónica de rutas (§7), módulos y criterios de aceptación (§8), reglas de producto (§6).
- `DESIGN.md` (raíz) — gobierna solo `apps/web` (frozen); para `web-v2` manda este documento.
- Implementación de tokens: `apps/web-v2/src/shared/ui/tokens.css` + `@theme` en `app.css` (PRD-v3 §4.4).
