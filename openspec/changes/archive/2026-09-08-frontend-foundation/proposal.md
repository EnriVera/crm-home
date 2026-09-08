# Proposal — frontend-foundation

> Change SDD: `frontend-foundation` (CRM-HOME)
> Estado: proposal · Artifact store: openspec · Execution: auto
> Delivery: `ask-on-risk` (default de sesión) — **este change probablemente excede
> review_budget 400 → ver §4 y §8**
> Fuentes vinculantes: `docs/PRD-v2.md` (§6.8, §7, §8.1, §9), `PRODUCT.md`
> (Brand Commitments, WCAG 2.2 AA), `openspec/config.yaml`, `explore.md`
> (hallazgos verificados contra el código real de `apps/web` y los tipos de
> `@octanejs/app-core`).

## 1. Intent (intención)

Construir la **base visual y estructural del frontend** de CRM-HOME sobre el
scaffold existente de `apps/web`, en tres piezas:

1. **Design system completo**: tokens semánticos verde/Poppins con valores por
   tema claro y oscuro (PRD §9), utilities de tailwind v4 generadas desde los
   tokens, variante `dark:` por clase, tokens de estado y de foco visible, y
   resolución de tema sin backend (páginas públicas siguen al SO; shell con
   toggle local persistido en `localStorage`).
2. **App shell con sidebar**: layout de la app autenticada con navegación
   lateral según el árbol canónico del PRD §7, registrando las rutas destino
   como placeholders (el shell NO implementa lógica de negocio de módulos).
3. **Login + verificación OTP (solo UI)**: pantallas `/login` y
   `/login-verification` (PRD §8.1) como UI pura sin backend — el flujo real de
   auth (OTP, sesión, cookies, seeds de registro) es otro change.

El change es **mayormente aditivo**: el scaffold ya dejó tailwind v4 con tokens
base, el wrapper `vendor/i18n` real y testeado, y routing por tabla en
`octane.config.ts`. No abre decisiones de producto: scope y mundo visual están
confirmados por el usuario (handoff pre-proposal; PRD §9 fijado sin rondas
estéticas adicionales).

## 2. Alcance

### 2.1 Design system (tokens + tema)

- Extender `src/styles/tokens.css` como **único archivo de tokens** (PRD §9
  "ajustable en un solo archivo"):
  - Mantener la escala `--color-primary-50…900` estática en `@theme`.
  - Mover/declarar las variables semánticas (`background`, `surface`, `border`,
    `text-primary`, `text-secondary`) con `@theme inline` para generar
    utilities reales (`bg-surface`, `text-text-secondary`, …) en lugar del
    arbitrary-value actual `bg-(--color-background)`.
  - Agregar tokens de estado (`error`, `success`) para mensajes del login y
    token de **foco visible** (WCAG 2.2 AA).
  - Valores por tema vía `:root` / `.dark` con `color-scheme`.
- `@custom-variant dark (&:where(.dark, .dark *))` para que `dark:` responda a
  la clase `.dark` en `<html>` (el default de tailwind v4 es media query).
- **`lib/theme/`** (TS puro + `useSyncExternalStore`, patrón ya probado con
  i18n): resolución de tema — público: `prefers-color-scheme`; shell: estado
  local + persistencia temporal en `localStorage` (`crm-theme`). Frontera
  estable: el change de auth reemplaza la fuente por `user_theme` sin tocar
  componentes.
- **Script inline anti-FOUC** bloqueante en `<head>` de `index.html` que setea
  `class="dark"` antes del primer paint (documentar interacción con CSP nonce
  de app-core).
- **Regla de contraste AA documentada**: en tema claro, texto interactivo
  pequeño usa `primary-700` o más oscuro (`#16a34a` da ~3.3:1 — solo válido
  para texto grande/UI). Componentes base (botón primario, input, card,
  mensaje de estado) como atoms/molecules que consumen solo tokens.

### 2.2 App shell (layout + sidebar + rutas placeholder)

- `routes/__app-shell.tsrx`: layout con sidebar izquierdo + área de contenido.
- Navegación según árbol canónico PRD §7: Dashboard, Tareas, Schedule,
  Clients, Finance (grupo no clicable con Income/Expenses/Transfers), Config.
  Labels desde i18n (`nav.*`).
- Navegación con **anchors normales** (`<a href>`): Octane es MPA (SSR +
  hidratación por ruta, sin router cliente verificado). Estado activo derivado
  del path actual; `aria-current="page"`.
- Rutas nuevas en `octane.config.ts` (todas `RenderRoute`; el modelo plano de
  Octane repite el layout por ruta — mitigar con helper `shellRoute(...)`):
  `/dashboard`, `/tasks`, `/schedules`, `/clients`, `/incomes`, `/expenses`,
  `/transfers`, `/config` → **placeholders** (`AppTitle` + texto i18n, sin
  lógica de módulos, sin guards de auth — no hay sesión en este change).
- Accesibilidad vinculante: `<nav aria-label>` + lista, skip-link al
  contenido, foco visible, sidebar operable por teclado, contraste AA en ambos
  temas.
- Sidebar de ancho fijo/colapsable en este change (estado persistido en
  `localStorage`). **Resize con resizable-panels queda fuera**: es React y no
  corre en Octane (ver §4).

### 2.3 Login + OTP (UI sola)

- `routes/__auth.tsrx`: layout público minimalista (centrado, footer con links
  a `/terms`, `/privacy`, `/cookies` — los **destinos legales quedan fuera de
  este change**; los links existen pero las páginas llegan con el change de
  contenido legal).
- `/login` (`pages/login-page`): input email + botón primario (única acción
  primaria, Brand Commitments), validación de formato client-side (lógica en
  TS puro testeable). Al "enviar" navega a `/login-verification` pasando el
  email por `URLSearchParams` estándar (**nuqs es React — no se usa**).
- `/login-verification` (`pages/login-verification-page`):
  **wrapper `vendor/otp-input/` obligatorio** (regla §9: `OtpInput` encapsula
  input-otp). 6 dígitos, ceros a la izquierda preservados
  (`inputmode="numeric"`, `pattern="[0-9]*"`, NO `type="number"`). Mensajes de
  error/éxito con tokens de estado. Sin validación real: estados fake mínimos
  documentados en la spec.
- ⚠️ `input-otp` es React: la implementación del wrapper (zagjs `pin-input` —
  recomendada por explore — vs hand-rolled vs ReactCompat) es **decisión de
  design**, no de esta proposal.
- Todas las cadenas en `es.json` (`auth.login.*`, `auth.otp.*`, `nav.*`,
  `theme.*`) vía `useT()`; extender el test D10 de escaneo de claves a los
  nuevos archivos.
- Decisión de `/` (redirect a `/login` vs placeholder): se resuelve en design.

### 2.4 Tests (strict_tdd, sin excepción nueva)

- Lógica extraíble a TS puro con tests primero (patrón D10): resolución de
  tema, validación de email, estado/máquina del OTP, composición del árbol de
  navegación.
- Extensión del test de escaneo i18n a las nuevas pantallas.
- Render visual diferido como en scaffold (sin DOM en tests).

## 3. Capabilities

Dominios de spec que este change crea/modifica (el dominio `web` base ya
existe del scaffold — este change lo **modifica** y agrega tres nuevos):

| Capability | Tipo | Contenido |
| --- | --- | --- |
| `design-system` | **nueva** | Tokens semánticos por tema (único archivo), utilities tailwind v4 desde tokens, variante `dark:` por clase, tokens de estado y foco, regla de contraste AA, componentes base (botón/input/card/mensaje), resolución de tema sin backend + anti-FOUC. |
| `web-shell` | **nueva** | Layout app shell, sidebar con árbol canónico §7, estado activo, accesibilidad del nav, rutas placeholder registradas en `octane.config.ts`, persistencia local de preferencias del shell. |
| `web-auth-ui` | **nueva** | Layout público, pantalla `/login` con validación client-side, pantalla `/login-verification` con wrapper `OtpInput`, preservación de ceros a la izquierda, footer con links legales (destinos fuera de scope). |
| `web` | **modificada** | Tabla de rutas ampliada en `octane.config.ts`; `index.html` con script anti-FOUC; convenciones i18n extendidas (nuevas secciones del catálogo). |

El change de auth real consumirá `web-auth-ui` (reemplazando el estado fake) y
la frontera de `lib/theme/` (reemplazando `localStorage` por `user_theme`);
ambas fronteras se diseñan para ese swap sin tocar componentes.

## 4. Riesgos y mitigaciones

| Riesgo | Nivel | Mitigación |
| --- | --- | --- |
| `input-otp`, `resizable-panels` y `nuqs` son React y no corren nativo en Octane | 🔴 | Wrappers §9 con implementación propia: `OtpInput` sobre zagjs `pin-input` (recomendado por explore, stack declarado) o hand-rolled — decisión explícita en **design** antes de specify de componentes. Resize del sidebar y nuqs **fuera de scope** de este change. |
| Modelo de routing plano de Octane: un solo layout por ruta, sin anidación ni guards | 🟡 | Helper `shellRoute(path, entry)` en `octane.config.ts` para la repetición; auth-guard diferido al change de auth (shell se renderiza sin sesión). |
| MPA sin router cliente: el estado del shell se pierde entre páginas | 🟡 | Tema y sidebar persistidos en `localStorage`; design confirma si Octane 0.2.3 expone algo más. |
| FOUC de tema en SSR | 🟡 | Script inline bloqueante en `index.html`; documentar interacción con CSP nonce de app-core. |
| `dark:` de tailwind v4 apunta a media query por defecto | 🟡 | `@custom-variant dark` en tokens.css + verificación visual en ambos temas. |
| Contraste AA del verde `#16a34a` como texto en claro (~3.3:1) | 🟡 | Regla de escala documentada: texto interactivo ≥ `primary-700` en claro; tokens de foco. |
| **Tamaño del change vs review_budget 400** | 🟡 | Estimación honesta: **~800–1200 líneas nuevas** (tokens ampliados + 2 layouts + ~11 rutas + sidebar + 2 pantallas + wrapper OTP + catálogo i18n + tests). Excede el budget → con `ask-on-risk` se **consultará al usuario antes del primer commit**: `size:exception` con commits atómicos (tokens → shell → login → OTP) o split en changes encadenados (p. ej. `design-system` → `web-shell` + `web-auth-ui`). Esta proposal no decide: se eleva al usuario. |
| strict_tdd con UI sin DOM en tests | 🟡 | Toda la lógica extraíble a TS puro testeable (patrón D10 ya probado); render diferido como en scaffold. No se pide excepción TDD nueva. |

## 5. Rollback

- Change **aditivo** sobre `apps/web`: rollback = `git revert` de los commits
  del change en `develop` (commits atómicos por pieza facilitan revert
  parcial).
- No hay migraciones, datos, backend ni despliegues involucrados.
- Los cambios en `index.html` (script anti-FOUC) y `octane.config.ts` (tabla
  de rutas) son retrocompatibles con la ruta `/` de humo existente.

## 6. Criterios de éxito

1. `bun test` verde en workspace raíz, incluyendo tests nuevos de lógica pura
   (tema, email, OTP, nav) y el test i18n extendido a las nuevas pantallas.
2. `tokens.css` como única fuente de tokens; ningún valor hex/tipografía
   hardcodeado en componentes (regla §9); utilities semánticas funcionando con
   `dark:` por clase.
3. Sin flash de tema al cargar (script anti-FOUC) en ambos temas.
4. Sidebar con el árbol canónico §7 navegando a las rutas placeholder
   registradas; link activo con `aria-current="page"`; skip-link y foco
   visible presentes.
5. `/login` valida formato de email client-side y navega a
   `/login-verification`; `OtpInput` acepta 6 dígitos preservando ceros a la
   izquierda; wrapper bajo `components/vendor/` (ningún import de librería de
   UI fuera de `vendor/`).
6. Contraste AA verificado en ambos temas para texto interactivo (regla de
   escala aplicada).
7. Toda cadena de UI en `es.json` vía `useT()`.
8. Estrategia de tamaño acordada con el usuario (exception o split) antes de
   implementar; commits Conventional Commits en `develop`.

## 7. Áreas afectadas

| Área | Cambio |
| --- | --- |
| `apps/web/src/styles/tokens.css` | Tokens semánticos completos, `@theme inline`, `@custom-variant dark`, estado/foco |
| `apps/web/index.html` | Script inline anti-FOUC |
| `apps/web/octane.config.ts` | ~11 rutas nuevas + helper `shellRoute` |
| `apps/web/src/routes/` | `__app-shell.tsrx`, `__auth.tsrx`, páginas login/OTP/placeholders |
| `apps/web/src/components/` | Sidebar/nav, componentes base (botón, input, card, mensaje), `vendor/otp-input/` |
| `apps/web/src/lib/theme/` (nuevo) | Resolución de tema (TS puro + persistencia local) |
| `apps/web/src/lib/i18n/locales/es.json` | Secciones `auth.*`, `nav.*`, `theme.*` + test extendido |
| `apps/web/package.json` | Posible dep nueva: zagjs `pin-input` (decisión design) |

No se toca: `apps/api/`, `packages/`, `docs/`, tooling raíz.

## 8. Fuera de alcance (non-goals)

- **Backend de auth**: OTP real, sesión, cookies, seeds de registro implícito,
  rate limiting → change de auth. Las pantallas de este change tienen estado
  fake mínimo documentado.
- **Páginas legales** `/terms`, `/privacy`, `/cookies` → futuro change de
  contenido legal (los links del footer existen; los destinos no).
- **Lógica de módulos** (dashboard real, tareas, finance, etc.): las rutas del
  sidebar son placeholders.
- **Sidebar resizable** (resizable-panels es React) y **nuqs** para estado en
  URL: diferidos hasta que exista estrategia de wrapper; este change usa
  `URLSearchParams` estándar donde hace falta.
- **`user_theme` persistido en backend**: el tema usa `localStorage` temporal
  con frontera diseñada para el swap.
- Íconos (phosphor-icons vía `vendor/icons/`): se evalúa en design; el árbol
  §7 no los exige y el shell es más simple sin ellos.
- Guards de ruta / redirect por sesión: no hay sesión en este change.
