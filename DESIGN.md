# DESIGN.md — CRM-HOME

> Autoridad visual del producto (skill impeccable). Mundo visual **fijado por el
> usuario** (PRD §9 + PRODUCT.md Brand Commitments); este documento lo registra y
> operacionaliza. No es un menú de opciones: es la regla.
> Modo de las superficies: **Operate** (app de gestión — scanability,
> consistencia y expectativas nativas primero; la marca vive en detalles
> precisos). Login: puerta de entrada (onboarding liviano, cero fricción).

## 1. Mundo visual

**Tesis:** una herramienta de trabajo serena. Mucho aire, una acción primaria
por pantalla, ningún ornamento. La interfaz desaparece dentro de la tarea; el
verde aparece solo donde hay algo que hacer o algo que confirmar.

**Estrategia de color:** *Restrained* — neutrales + un solo acento (verde).
El acento se usa para: acción primaria, selección actual (nav activo, foco) e
indicadores de estado de éxito. Nunca como decoración.

**Escena física:** freelancer en su escritorio, de día y de noche; la app se
usa en sesiones largas de trabajo. Ambos temas (claro/oscuro) son ciudadanos de
primera clase: mismo sistema, valores distintos.

## 2. Tokens (fuente única: `apps/web/src/styles/tokens.css`)

Ningún valor hex, tipografía o sombra hardcodeado en componentes. Todo estilo
se define como token semántico ajustable en ese único archivo.

### 2.1 Escala primaria (estática, no cambia por tema)

`primary-50 #f0fdf4` · `100 #dcfce7` · `200 #bbf7d0` · `300 #86efac` ·
`400 #4ade80` · `500 #22c55e` · `600 #16a34a` · `700 #15803d` ·
`800 #166534` · `900 #14532d`

### 2.2 Tokens semánticos por tema

| Token | Claro | Oscuro | Uso |
| --- | --- | --- | --- |
| `primary` | `#16a34a` (600) | `#22c55e` (500) | Relleno de acción primaria, indicadores |
| `background` | `#ffffff` | `#0b120c` | Fondo de página |
| `surface` | `#f6f8f7` | `#111a12` | Cards, sidebar, paneles |
| `border` | `#e2e8f0` | `#243324` | Separadores y bordes de control |
| `text-primary` | `#0f172a` | `#f1f5f9` | Texto principal |
| `text-secondary` | `#52606d` | `#9fb3a4` | Texto secundario, labels inactivos |
| `error` | `#dc2626` | `#f87171` | Mensajes de error (AA como texto) |
| `success` | `#15803d` | `#4ade80` | Mensajes de éxito (AA como texto) |
| `focus` | `#15803d` | `#4ade80` | Anillo de foco visible |

En tema oscuro el sidebar/paneles usan `surface` (segunda capa neutral apenas
más clara que `background`); en claro, igual relación.

### 2.3 Regla de contraste WCAG 2.2 AA (vinculante)

- **Claro:** texto interactivo pequeño (links, labels de nav, texto de botones
  ghost) usa **`primary-700` o más oscuro** (`#15803d` ≈ 5:1 sobre blanco).
  `#16a34a` (~3.3:1) queda reservado a: texto grande (≥24px, o ≥18.66px en
  bold), íconos y gráficos de UI (mínimo 3:1), y **rellenos** de acción
  primaria con texto blanco encima.
- **Oscuro:** texto interactivo usa `primary-400`/`primary-500` sobre
  `background`/`surface` (≥4.5:1).
- `error` y `success` son AA como texto pequeño en ambos temas; los mensajes de
  estado usan esos tokens, no la escala primaria.
- **Foco visible canónico:** `outline: 2px solid <focus>; outline-offset: 2px`.
  Jamás `outline: none` sin reemplazo equivalente.

## 3. Tipografía

- **Familia única: Poppins** (`@fontsource/poppins`, pesos 400/500/600/700).
  Una sola familia bien afinada lleva headings, labels, botones, cuerpo y datos
  (Operate: no hay pairing display/body).
- **Escala fija en rem, ratio ~1.125–1.2** (nada fluido): 12 / 14 / 16 (base) /
  18 / 20 / 24 / 32. Los títulos de página viven en 20–24; no hay display
  sizes en superficies de gestión.
- Pesos: 400 cuerpo, 500 labels y nav, 600 títulos y acción primaria, 700
  excepcional (marca/títulos de pantalla).
- Medida de prosa ≤ 65–75ch donde haya texto corrido (páginas legales, ayuda).

## 4. Espaciado, forma y elevación

- Grilla de 4px (spacing de tailwind). **Aire generoso**: padding de página
  ≥ 24–32px; más espacio *arriba* de un encabezado que debajo.
- Radio de borde único y discreto (`rounded-md`/`rounded-lg`) en cards e
  inputs; el mismo radio en toda la app.
- **Sin sombras decorativas ni bordes innecesarios** (Brand Commitment). La
  jerarquía se construye con espacio, peso tipográfico y `surface` vs
  `background`, no con elevación. El único "anillo" del sistema es el de foco.
- Bordes de 1px con token `border` solo donde separan regiones o definen
  controles (inputs, cards).

## 5. Temas (claro/oscuro)

- Estrategia de **clase** (`.dark` en `<html>`); `dark:` de tailwind responde a
  la clase vía `@custom-variant`.
- Páginas públicas (login, OTP, legales) siguen `prefers-color-scheme` del SO
  (PRD §6.8). Shell: toggle con persistencia (hoy `localStorage`; mañana
  `user_theme` en cuenta — la frontera `lib/theme/` absorbe el swap).
- Script inline anti-FOUC en `index.html` (sin flash al cargar).
- Todo componente se verifica en **ambos** temas; ninguno asume fondo claro.

## 6. Componentes y estados

- Todo componente interactivo tiene: **default, hover, focus, active, disabled,
  loading, error** (no se entregan a medias).
- Una **única acción primaria por pantalla** (verde sólido, texto blanco). El
  resto son ghost/secondary con `text-secondary`/`primary-700`.
- Mismo vocabulario en todas las pantallas: misma forma de botón, mismo
  control de formulario, mismo estilo de ícono. Si "guardar" se ve distinto en
  dos lugares, uno está mal.
- Mensajes de estado inline (tokens `error`/`success`), nunca toasts para
  errores de formulario. Estados vacíos que enseñan (qué aparecerá aquí + CTA),
  nunca "no hay nada".
- Íconos: set phosphor vendored en `vendor/icons/` (union cerrada `IconName`),
  20px en nav, trazo consistente; ícono + label en el nav expandido, ícono solo
  (con `aria-label`) en el colapsado.

## 7. Motion

- 150–250ms, solo para **comunicar estado** (hover, colapso del sidebar,
  aparición de mensajes). Nada decorativo, nada coreografiado al cargar la
  página. Respeta `prefers-reduced-motion`.

## 8. Qué NO hacer (bans absolutos)

- Ningún hex, fuente o sombra fuera de `tokens.css`.
- Ninguna librería de UI importada fuera de `components/vendor/` (regla §9).
- No display fonts en labels, botones o datos; no gradientes decorativos; no
  glassmorphism; no icon tiles genéricos.
- No modales como primera opción: agotar alternativas inline/progresivas.
- No más de una acción primaria por pantalla; no acento verde en elementos
  inactivos o decorativos.
- No reinventar affordances estándar (scrollbars custom, form controls
  exóticos); el producto es Operate: la familiaridad ganada es la feature.
- No texto interactivo pequeño en `#16a34a` sobre fondo claro (rompe AA).
- No estados de interfaz entregados por la mitad (un botón sin disabled/loading
  es un componente sin terminar).
