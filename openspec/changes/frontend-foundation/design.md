# Design — frontend-foundation

> Change SDD: `frontend-foundation` (CRM-HOME) · Fase: design
> Fuentes verificadas contra el repo real: `apps/web/**`,
> `node_modules/@octanejs/app-core/types/index.d.ts` (0.2.3),
> `node_modules/octane/dist/index.d.ts`, `docs/PRD-v2.md` (§6.8, §7, §8.1, §9),
> `PRODUCT.md`, `openspec/config.yaml`, `openspec/changes/monorepo-scaffold/design.md` (D6/D7/D10),
> skill `impeccable` (new-work, operate, onboard).
> Autoridad visual: **`DESIGN.md` en la raíz del repo** (mundo visual fijado por
> el usuario: minimalista, verde primario, Poppins, oscuro con tokens semánticos;
> modo de superficies: **Operate**, login = puerta de entrada liviana).

## 1. Resumen ejecutivo

El change es aditivo sobre el scaffold y todas las incógnitas técnicas de la
proposal quedan **cerradas con evidencia**:

- El wrapper OTP se implementa sobre **zagjs `pin-input`** (D1).
- `/` redirige **302 a `/login`** con middleware `before` de RenderRoute (D2).
- **Octane 0.2.3 SÍ expone el path actual al layout**: `RenderRouteProps.url`
  (pathname + search, idéntico en SSR e hidratación) llega a cada entry y a su
  layout — verificado en los tipos de app-core. No hace falta prop explícita ni
  `window.location` (D3).
- El sidebar usa íconos vía wrapper propio `vendor/icons/` con **SVG inline
  vendored** (paths phosphor, MIT), sin dependencia nueva (D4).
- `shellRoute(path, entry)` / `authRoute(path, entry)` generan la tabla de rutas
  desde una lista canónica (D5).
- Estructura exacta de tokens, `lib/theme/`, anti-FOUC y componentes del shell y
  del login quedan especificados en D6–D9.

## 2. Decisiones

### D1 — Wrapper `vendor/otp-input/`: zagjs `pin-input` con adapter vanilla

**Decisión:** `OtpInput` se implementa sobre `@zag-js/pin-input` +
`@zag-js/core` (máquina headless), con un `normalizeProps` vanilla mínimo
(~30 líneas) y el wiring de ciclo de vida **dentro del wrapper**. El único
módulo del codebase que importa `@zag-js/*` es `components/vendor/otp-input/`.

**Justificación:**

1. **Es el stack declarado**: `openspec/config.yaml` → `stack.frontend.components: zagjs`.
   Elegir otra base contradice la decisión de stack ya tomada.
2. **La a11y difícil ya está resuelta** por la máquina: navegación por teclado
   entre celdas, auto-avance, backspace que retrocede, **paste distribuido entre
   celdas** (el caso que preserva ceros a la izquierda, §8.1), `inputmode` y
   `autocomplete="one-time-code"`. Hand-rolled (6 inputs + clipboard + teclado)
   es el riesgo 🔴 que explore marcó: hacerlo mal rompe WCAG 2.2 AA, vinculante.
3. **Testeable headless en TS puro** (patrón D10): la máquina se crea con
   `@zag-js/core` sin DOM; los tests envían eventos (`VALUE`, `PASTE`) y
   asertan `context.value` — `"041283"` queda `["0","4","1","2","8","3"]`.
   La capa DOM (`connect` + `normalizeProps`) queda delgada y sin lógica.
4. **ReactCompat descartado**: montar `input-otp` vía `octane/react` introduce
   una segunda runtime (React) en el bundle por un solo componente, contra el
   espíritu de D6. La regla §9 se cumple igual: el wrapper se llama `OtpInput`
   y la dependencia real queda encapsulada; si mañana zagjs se cambia, solo se
   toca `vendor/otp-input/`.

**Riesgo asumido y mitigación:** zagjs documenta adapters de framework
(react/vue/solid); el vanilla exige un `normalizeProps` propio (mapeo de
`htmlFor`→`for`, `onChange`→`oninput`, estilos/data-attrs). Mitigación: el
normalizeProps es código del wrapper (único lugar), con comentario de
provenance, y los tests headless cubren la máquina que es donde vive la lógica.
Si en implementación zagjs resultara incompatible con el runtime de Octane
(p. ej. por uso de APIs DOM ausentes en SSR), el fallback es hand-rolled con la
**misma interfaz pública del wrapper** y la misma máquina de estados UI de D9.4
— el contrato no cambia.

**Deps nuevas:** `@zag-js/pin-input`, `@zag-js/core` (pin exacto al instalar,
lockfile commitado).

**Interfaz pública del wrapper (contrato):**

```ts
interface OtpInputProps {
  length?: number;            // default 6
  disabled?: boolean;
  invalid?: boolean;          // pinta estado de error (tokens de estado)
  onComplete?: (code: string) => void;  // code preserva ceros a la izquierda
  "aria-label"?: string;
}
```

### D2 — Destino de `/`: redirect 302 a `/login`

**Decisión:** `/` deja de montar la SmokePage y pasa a un `RenderRoute` con
middleware `before` que responde `302 Location: /login`. El `entry` (requerido
por el tipo) apunta a una página mínima de fallback con un anchor a `/login`
(defensa ante un entorno que no ejecute middleware; en la práctica no renderiza).

**Justificación:** no hay landing pública en el PRD (§7 no lista `/`; el árbol
arranca en `/login` y `/dashboard`). Un placeholder dejaría una pantalla muerta
que el change de auth tendría que re-decidir; el redirect es el comportamiento
final deseado (sin sesión → login) y lo absorbe este change sin guards (cuando
exista sesión, el mismo punto cambia el destino a `/dashboard` — un solo
middleware). La función del middleware es TS puro y testeable: dado un Context,
devuelve `Response` 302 (test D10 sin DOM).

**Alternativa descartada:** placeholder en `/` (pantalla sin propósito de
producto; la smoke page ya cumplió su función de verificación del scaffold).

### D3 — Path actual en el layout: `props.url` (verificado, no asumido)

**Decisión:** el estado activo del sidebar se deriva de `props.url`.

**Evidencia** (`node_modules/@octanejs/app-core/types/index.d.ts`):

```ts
export interface RenderRouteProps {
  params: Record<string, string>;
  /** request `url` (pathname + search, origin-free — the client hydrate entry
      re-renders with the identical string) */
  url: string;
  state?: Map<string, unknown>;
}
```

Cada componente de ruta **y su layout** reciben `url` con el mismo string en
SSR e hidratación → el marcado de ruta activa es idéntico en ambos (sin
mismatch de hidratación). La lógica es TS puro testeable:

```ts
// lib/nav/active.ts
pathnameOf(url) = url.split("?")[0]
isItemActive(pathname, href) = pathname === href
isGroupActive(pathname, children) = children.some(c => isItemActive(pathname, c.href))
```

El sidebar emite `aria-current="page"` en el item activo. No se usa
`window.location` (SSR-safe) ni una prop explícita por ruta.

### D4 — Íconos del sidebar: wrapper `vendor/icons/` con SVG inline vendored

**Decisión:** el shell usa íconos, servidos por un wrapper propio
`components/vendor/icons/` que contiene los **paths SVG inline vendored** de
phosphor-icons (licencia MIT, provenance y versión de origen documentados en el
README del wrapper). Set cerrado inicial (~10): `house` (Dashboard),
`check-square` (Tareas), `calendar` (Schedule), `users` (Clients), `wallet`
(Finance), `arrow-down-circle`/`arrow-up-circle`/`arrows-left-right`
(Income/Expenses/Transfers), `gear` (Config), `sun`/`moon` (toggle de tema),
`sidebar` (colapsar). Sin dependencia nueva en `package.json`.

**Justificación:**

1. **Modo Operate (impeccable)**: el nav lateral con ícono + label es el
   patrón estándar de apps de gestión; los íconos mejoran la scanability del
   árbol §7 (8 destinos + grupo) y habilitan el sidebar colapsado a 64px
   (icon-only, D8). "Sin íconos" era aceptable pero degrada ambas cosas.
2. **`@phosphor-icons/react` es React** → incompatible con Octane (misma clase
   de problema que `input-otp`, explore §7). El wrapper §9 es obligatorio de
   todos modos; vendorizar los paths (assets estáticos, no runtime) es la forma
   mínima de cumplirla: cero deps, cero runtime, tree-shaking trivial.
3. El wrapper expone `<Icon name="house" size={20} />` con `name: IconName`
   (union cerrada) → imposible usar un ícono no decidido en design; ampliar el
   set es editar un archivo del wrapper. Si el set crece mucho, el upgrade path
   es `@phosphor-icons/core` (SVGs framework-agnostic) **dentro del mismo
   wrapper**, sin tocar consumidores.

**Alternativas descartadas:** `@phosphor-icons/react` (React); sin íconos
(peor scanability y sidebar colapsado ilegible); sprite/JS de phosphor web
(dependencia de runtime innecesaria para 10 paths).

### D5 — Helper `shellRoute` / `authRoute` y tabla generada desde lista canónica

**Decisión:** `octane.config.ts` define una lista canónica exportable y dos
helpers que la materializan:

```ts
// src/lib/nav/routes.ts (TS puro, testeable)
export const SHELL_ROUTES = [
  "/dashboard", "/tasks", "/schedules", "/clients",
  "/incomes", "/expenses", "/transfers", "/config",
] as const;

// octane.config.ts
const shellRoute = (path: string, entry: RenderRouteEntry) =>
  new RenderRoute({ path, entry, layout: "/src/routes/__app-shell.tsrx" });
const authRoute = (path: string, entry: RenderRouteEntry) =>
  new RenderRoute({ path, entry, layout: "/src/routes/__auth.tsrx" });
```

**Justificación:** el modelo plano de Octane (un `layout` por ruta, sin
herencia — verificado en `RenderRouteOptions`) fuerza a repetir el layout en
~11 rutas; el helper colapsa la repetición en una línea por ruta y la lista
canónica se comparte con `lib/nav/tree.ts` (árbol del sidebar) y con los tests
(las rutas del nav y las registradas no pueden divergir: un test las compara).
El auth-guard futuro se enchufa como `before` en `shellRoute` sin tocar las 8
declaraciones.

### D6 — Estructura exacta de tokens (`tokens.css` único archivo)

**Decisión:** tres capas en el mismo archivo, más la variante dark y el script
anti-FOUC.

**1. `@theme` (estático, sin cambios):** escala `--color-primary-50…900` y
`--font-sans` Poppins, tal como están. La escala NO cambia por tema (los
valores por tema se eligen apuntando a pasos distintos de la escala, §9 PRD).

**2. Variables semánticas por tema** en `:root` / `.dark` (se conservan los
valores existentes y se agregan estado y foco):

| Token | Claro | Oscuro |
| --- | --- | --- |
| `--color-primary` | `primary-600` `#16a34a` | `primary-500` `#22c55e` |
| `--color-background` | `#ffffff` | `#0b120c` |
| `--color-surface` | `#f6f8f7` | `#111a12` |
| `--color-border` | `#e2e8f0` | `#243324` |
| `--color-text-primary` | `#0f172a` | `#f1f5f9` |
| `--color-text-secondary` | `#52606d` | `#9fb3a4` |
| `--color-error` | `#dc2626` (4.5:1 sobre blanco) | `#f87171` (≈7:1 sobre `#0b120c`) |
| `--color-success` | `#15803d` (≈5:1 sobre blanco) | `#4ade80` (≈9:1 sobre `#0b120c`) |
| `--color-focus` | `#15803d` | `#4ade80` |

`color-scheme: light|dark` se mantiene por bloque (scrollbars/form controls
nativos coherentes).

**3. Registro en `@theme inline`** para generar utilities reales que responden
a la clase `.dark` (reemplaza el arbitrary-value actual `bg-(--color-background)`):

```css
@theme inline {
  --color-primary: var(--color-primary);
  --color-background: var(--color-background);
  --color-surface: var(--color-surface);
  --color-border: var(--color-border);
  --color-text-primary: var(--color-text-primary);
  --color-text-secondary: var(--color-text-secondary);
  --color-error: var(--color-error);
  --color-success: var(--color-success);
  --color-focus: var(--color-focus);
}
```

Utilities resultantes: `bg-background`, `bg-surface`, `bg-primary`,
`border-border`, `text-text-primary`, `text-text-secondary`, `text-error`,
`text-success`, `outline-focus`, … La escala sigue disponible como
`text-primary-700` etc.

**4. Variante dark por clase** (el default de tailwind v4 es media query):

```css
@custom-variant dark (&:where(.dark, .dark *));
```

**5. Regla de contraste AA (documentada en `DESIGN.md`, aplicada en
componentes):**

- **Tema claro:** texto interactivo pequeño (links, labels de nav, botones
  ghost) usa `primary-700` o más oscuro (`#15803d` ≈ 5:1 sobre blanco).
  `primary-600` (`#16a34a`, ~3.3:1) solo para texto grande (≥24px o ≥18.66px
  bold), íconos/gráficos de UI (3:1) y fondos de acción primaria con texto
  blanco (el verde como *relleno* no es texto).
- **Tema oscuro:** texto interactivo usa `primary-400`/`primary-500` sobre
  `background`/`surface` (≥4.5:1).
- Error/success usan sus tokens (ya AA como texto pequeño en ambos temas).
- **Foco visible canónico:** `outline: 2px solid var(--color-focus);
  outline-offset: 2px` vía `focus-visible:`; prohibido `outline: none` sin
  reemplazo equivalente (WCAG 2.2 AA — 2.4.7/2.4.13).

**6. Script anti-FOUC en `index.html`** (bloqueante, primer hijo de `<head>`,
antes del `<link rel="stylesheet">`):

```html
<script>
  (function () {
    var pub = /^\/(login|login-verification|terms|privacy|cookies)/.test(location.pathname);
    var stored = null;
    try { stored = localStorage.getItem("crm-theme"); } catch (e) {}
    var dark = pub || !stored
      ? matchMedia("(prefers-color-scheme: dark)").matches
      : stored === "dark";
    if (dark) document.documentElement.classList.add("dark");
  })();
</script>
```

Respeta PRD §6.8: páginas públicas (lista `pub`) ignoran la preferencia
guardada y siguen al SO; el resto honra `localStorage`. Es la **única
duplicación deliberada** de lógica de tema (debe correr pre-paint, sin
módulos); va con comentario cruzado a `lib/theme/core.ts` ("si cambias una,
cambia la otra") y la lista de rutas públicas se cubre con el test de
`isPublicPath()` en TS puro.

**CSP:** app-core soporta nonce por request (`OCTANE_NONCE_STATE_KEY`) pero
solo para scripts que genera el renderer; este script vive en el template
estático `index.html`, así que queda fuera de ese mecanismo. Hoy no hay CSP
configurada; cuando se endurezca, hay que extender el template con un
placeholder de nonce (documentado como deuda conocida, no bloquea el change).

### D7 — `lib/theme/`: frontera estable hacia `user_theme`

**Decisión:** tres módulos con una interfaz de fuente intercambiable:

```
src/lib/theme/
├─ core.ts        # TS puro: Theme = "light"|"dark"; ThemeSetting = Theme|"system";
│                 # STORAGE_KEY = "crm-theme";
│                 # resolveTheme(setting, systemDark): Theme;
│                 # isPublicPath(pathname): boolean  (lista §6.8)
├─ source.ts      # ThemePreferenceSource { read(): ThemeSetting; write(s): void;
│                 #   subscribe(cb): unsubscribe }
│                 # + LocalStorageThemeSource (hoy)
│                 # + SystemThemeSource (públicas: read() siempre "system")
├─ store.ts       # createThemeStore(source): { getSnapshot, getServerSnapshot,
│                 #   subscribe, setTheme } — aplica la clase .dark en <html>
└─ use-theme.ts   # useTheme(): { theme, setTheme } vía useSyncExternalStore
                  # (único import de octane en lib/theme; patrón ya probado
                  #  con vendor/i18n)
```

**Frontera hacia `user_theme`:** los componentes solo conocen `useTheme()`. El
change de auth introduce `AccountThemeSource` (lee/escribe `user_theme` vía RPC
con cache local) y cambia **una línea** en el punto de composición
(`createThemeStore(new AccountThemeSource(...))`); componentes, script
anti-FOUC y tokens no se tocan. Las páginas públicas componen con
`SystemThemeSource` (sin toggle, §6.8); el shell con `LocalStorageThemeSource`
(hoy) → `AccountThemeSource` (mañana).

**Persistencia del sidebar:** misma técnica, store mínimo propio
(`crm-sidebar`: `"expanded"|"collapsed"`), sin abstraer — una key no justifica
framework.

### D8 — Componentes del shell: sidebar colapsable hand-rolled, ancho fijo

**Decisión:**

- **Sidebar de ancho fijo en dos estados**: expandido `260px` (ícono + label) /
  colapsado `64px` (solo ícono, label en `title` + `aria-label`). Toggle en el
  pie del sidebar; estado persistido en `localStorage` (`crm-sidebar`).
  **Sin resize**: resizable-panels es React (explore §7) y queda fuera de
  scope; el colapsado cubre el caso real (ganar ancho de trabajo).
- **Composición** (atomic design, todo consume solo tokens):
  - atoms: `Icon` (wrapper), `Button` (primary/ghost), `SkipLink`,
    `StatusMessage` (error/success), `TextInput`.
  - molecules: `FormField` (label + input + error), `NavItem`
    (`<a>` + Icon + label + `aria-current`), `NavGroup` (Finance: encabezado no
    clicable + lista de hijos), `ThemeToggle` (sun/moon).
  - organisms: `SidebarNav` (`<nav aria-label>` + lista + ThemeToggle + toggle
    de colapso), `LoginForm`, `OtpForm`.
  - layouts: `routes/__app-shell.tsrx` (SkipLink → `<div flex>`: SidebarNav +
    `<main id="content">`), `routes/__auth.tsrx` (centrado + footer legal).
- **A11y vinculante del nav:** `<nav aria-label={t("nav.ariaLabel")}>` con
  `<ul>`; `aria-current="page"` en el activo (D3); skip-link como primer
  elemento focalizable apuntando a `#content`; foco visible con token
  `--color-focus`; sidebar operable por teclado (todo es `<a>`/`<button>`
  nativo — cero handlers de teclado custom); contraste AA por la regla D6.5
  (labels de nav en claro: `text-text-secondary` para inactivos,
  `primary-700` para el activo).
- **Navegación MPA:** anchors normales `<a href>` (full page load); el estado
  del shell sobrevive vía `localStorage` (D7) y el anti-FOUC evita flash de
  tema entre páginas.

**Justificación:** modo Operate — scanability y consistencia primero; un solo
patrón de nav estándar; nada de inventar affordances. El colapsado hand-rolled
son ~40 líneas (un booleano + una clase) contra introducir una estrategia de
wrapper para resizable-panels que el PRD no exige en este change.

### D9 — Componentes del login y máquina de estados OTP (UI sola)

**Decisión:**

- **`/login` (`pages/login-page`)**: card centrada `max-w-sm` sobre
  `bg-background`: título `auth.login.title`, subtítulo, `FormField` email
  (`type="email"`, `autocomplete="email"`), un **único botón primario** (Brand
  Commitments: una acción primaria por pantalla). Validación de formato
  client-side con `isValidEmail()` (TS puro, test primero); error inline bajo
  el campo + `aria-invalid` + `aria-describedby`. Al enviar válido:
  `location.assign("/login-verification?email=" + encodeURIComponent(email))`
  (MPA, `URLSearchParams` estándar — nuqs es React, fuera).
- **`/login-verification` (`pages/login-verification-page`)**: misma card; lee
  `email` del query (si falta, mensaje + link de vuelta a `/login`); `OtpInput`
  (D1) con `inputmode="numeric"`, `pattern="[0-9]*"`, **nunca `type="number"`**
  (preserva ceros a la izquierda, §8.1); subtítulo muestra el email destino;
  link "volver" y texto de reenvío (deshabilitado, fake).
- **Máquina de estados OTP en TS puro** (`lib/otp/otp-machine.ts`, tests
  primero): estados `idle → ready` (6 dígitos) → `submitting → error |
  expired`; contador de intentos (máx. 5, §8.1) y mensaje de expiración (10
  min, §8.1) como **datos de la máquina**, no strings en componentes. El
  submit llama a un puerto `OtpVerifier { verify(code): Promise<Verdict> }`;
  este change inyecta `FakeOtpVerifier` (siempre `invalid` tras latencia
  simulada, para exhibir el estado de error); el change de auth inyecta el
  verifier real vía RPC sin tocar UI ni máquina.
- **Footer legal** en `__auth.tsrx`: links a `/terms`, `/privacy`, `/cookies`
  (labels i18n). Los destinos NO existen en este change (fuera de scope):
  quedan como anchors reales que hoy resuelven al 404 default del dev server;
  el change de contenido legal los crea. No se crean placeholders legales (el
  proposal los excluyó).

**Onboarding liviano (skill onboard):** el login es la primera puerta —
cero fricción: un campo, un botón, copy que dice qué va a pasar ("te enviamos
un código de 6 dígitos"), sin tour, sin pasos, sin claims inventados. La OTP
explica el código y a dónde llegó. Nada más.

### D10 — Catálogo i18n y extensión del test de escaneo

**Decisión:** nuevas secciones en `es.json` — `nav.*` (8 items + grupo +
ariaLabel), `theme.*` (toggle/labels), `auth.login.*`, `auth.otp.*`,
`shell.*` (skipToContent, collapse/expand, placeholder) — y el test de escaneo
D10 se **generaliza a glob** de `src/**/*.{tsrx,ts}` (hoy lista hardcodeada de
3 archivos; con ~20 archivos nuevos la lista manual es deuda inmediata).
Convención de claves sin cambios (anidado por sección, `t("...")` literal
para que el escaneo regex lo capture).

## 3. Estructura de archivos (cambios)

| Archivo | Cambio |
| --- | --- |
| `apps/web/src/styles/tokens.css` | `@theme inline`, tokens estado/foco, `@custom-variant dark` (D6) |
| `apps/web/index.html` | script anti-FOUC (D6.6) |
| `apps/web/octane.config.ts` | helpers `shellRoute`/`authRoute`, ~11 rutas, redirect `/` (D2/D5) |
| `apps/web/package.json` | deps `@zag-js/pin-input`, `@zag-js/core` (D1) |
| `apps/web/src/routes/__app-shell.tsrx` | layout shell (nuevo) |
| `apps/web/src/routes/__auth.tsrx` | layout público (nuevo) |
| `apps/web/src/routes/index.tsrx` | pasa a fallback de redirect `/` (D2) |
| `apps/web/src/routes/{login,login-verification,dashboard,tasks,schedules,clients,incomes,expenses,transfers,config}.tsrx` | entries de ruta (nuevos; 8 placeholders) |
| `apps/web/src/components/vendor/otp-input/` | wrapper OtpInput + normalizeProps vanilla (nuevo, D1) |
| `apps/web/src/components/vendor/icons/` | wrapper Icon con SVG vendored (nuevo, D4) |
| `apps/web/src/components/atoms/` | `button`, `text-input`, `status-message`, `skip-link` (nuevos) |
| `apps/web/src/components/molecules/` | `form-field`, `nav-item`, `nav-group`, `theme-toggle` (nuevos) |
| `apps/web/src/components/organisms/` | `sidebar-nav`, `login-form`, `otp-form` (nuevos) |
| `apps/web/src/components/pages/` | `login-page`, `login-verification-page`, `placeholder-page` (nuevos) |
| `apps/web/src/lib/theme/` | core/source/store/use-theme (nuevo, D7) |
| `apps/web/src/lib/nav/` | `routes.ts`, `tree.ts`, `active.ts` + test (nuevo, D3/D5) |
| `apps/web/src/lib/validation/email.ts` + test | nuevo |
| `apps/web/src/lib/otp/otp-machine.ts` + test | nuevo (D9) |
| `apps/web/src/lib/i18n/locales/es.json` | secciones `nav`, `theme`, `auth`, `shell` |
| `apps/web/src/lib/i18n/i18n.test.ts` | escaneo generalizado a glob (D10) |
| `DESIGN.md` (raíz) | **autoridad visual impeccable** (nuevo) |
| `.impeccable/surface-briefs/{app-shell,auth}.md` | briefs + direction contract (nuevos) |

No se toca: `apps/api/`, `packages/`, tooling raíz. La SmokePage se retira con
sus claves `smoke.*` (la ruta `/` pasa a redirect).

## 4. Contratos

- `OtpInputProps` (D1) — estable hacia el change de auth.
- `ThemePreferenceSource` (D7) — estable hacia `user_theme`.
- `OtpVerifier` (D9) — puerto que el change de auth implementa con RPC real.
- `shellRoute(path, entry)` / `SHELL_ROUTES` (D5) — punto único donde el
  futuro auth-guard se enchufa como `before`.
- `IconName` union cerrada (D4) — el set de íconos es decisión de design.
- Layouts reciben `RenderRouteProps { params, url }` (D3) — el sidebar solo
  usa `url`.

## 5. Tests (strict_tdd, patrón D10 — puros, sin DOM)

1. `lib/theme/core.test.ts` — `resolveTheme` (setting × system), `isPublicPath`.
2. `lib/validation/email.test.ts` — `isValidEmail` (válidos, inválidos, edge).
3. `lib/otp/otp-machine.test.ts` — transiciones, intentos (5 máx), expiración,
   código con ceros a la izquierda como string.
4. `lib/nav/tree.test.ts` — árbol §7 completo y en orden; `isItemActive` /
   `isGroupActive` / `pathnameOf`; rutas del árbol ≡ `SHELL_ROUTES` registradas.
5. `vendor/otp-input/machine.test.ts` — máquina zagjs headless: type, backspace,
   **paste `"041283"` → 6 slots con ceros preservados**, `onComplete` con string.
6. Redirect `/`: middleware devuelve 302 `Location: /login` (Response es
   construible sin DOM en bun).
7. `i18n.test.ts` — escaneo por glob de todas las claves `t("...")` nuevas.

Render visual diferido como en scaffold (sin DOM en tests).

## 6. Rollout y tamaño

Commits atómicos (Conventional Commits, `develop`):

1. `feat(web): tokens semánticos completos, variante dark por clase y anti-FOUC`
   (tokens.css, index.html, lib/theme + tests).
2. `feat(web): componentes base y wrappers vendor/icons y vendor/otp-input`
   (deps zagjs, atoms/molecules + tests de máquina).
3. `feat(web): app shell con sidebar y rutas placeholder` (layouts, shellRoute,
   redirect `/`, nav + tests).
4. `feat(web): login y verificación OTP (UI)` (páginas, máquina OTP, catálogo
   i18n + tests).

**Tamaño:** estimación ~800–1200 líneas nuevas → excede `review_budget: 400`.
Con `delivery_strategy: ask-on-risk` se **consulta al usuario antes del primer
commit**: `size:exception` con los 4 commits atómicos (review por commit) vs
split en changes encadenados (`design-system` → `web-shell` + `web-auth-ui`).
Este design es válido para ambas estrategias (los commits 1–2 = change
`design-system` si se splitea).

**Rollback:** aditivo; `git revert` por commit. `index.html` y
`octane.config.ts` retrocompatibles.

## 7. Riesgos

| Riesgo | Nivel | Mitigación |
| --- | --- | --- |
| zagjs pin-input sin adapter oficial vanilla/Octane | 🟡 | normalizeProps propio dentro del wrapper; máquina testeada headless; fallback hand-rolled con la misma interfaz pública (D1) |
| `@theme inline` + `@custom-variant` con comportamiento inesperado en tailwind 4.3 | 🟡 | Verificación visual en ambos temas en el commit 1; patrón documentado oficial de v4 |
| Script anti-FOUC duplica lógica de tema | 🟢 | Única duplicación deliberada, comentario cruzado + test de `isPublicPath` |
| CSP futura rompe el script inline del template | 🟢 | Documentado (D6.6): app-core noncea solo scripts del renderer; placeholder de nonce cuando se endurezca CSP |
| Exceder review_budget 400 | 🟡 | Se eleva al usuario (ask-on-risk): exception con commits atómicos o split encadenado |
| Enums de íconos crecen sin control | 🟢 | Union cerrada `IconName`; ampliar = decisión de design del change que lo necesite |

## 8. Criterios de aceptación (mapeados)

1. `bun test` verde en raíz con los 7 grupos de tests nuevos.
2. Ningún hex/tipografía hardcodeado fuera de `tokens.css` (regla §9;
   verificable con grep de `#[0-9a-fA-F]{3,6}` en `src/components`).
3. Sin flash de tema al cargar en ambos temas y en páginas públicas (SO).
4. Sidebar con árbol §7 navegando a placeholders; `aria-current="page"`;
   skip-link; foco visible; colapso persistido.
5. `/login` valida email y navega a `/login-verification?email=…`; `OtpInput`
   acepta `041283` preservando ceros; estados de error/expiración visibles.
6. Contraste AA verificado en ambos temas según la regla D6.5.
7. Toda cadena en `es.json` vía `useT()` (test de escaneo por glob).
8. Estrategia de tamaño acordada con el usuario antes de implementar.
