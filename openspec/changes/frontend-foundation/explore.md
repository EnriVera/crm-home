# Explore — frontend-foundation

> Fase explore del change SDD `frontend-foundation` (CRM-HOME).
> Fuentes leídas: `apps/web/**` (real), `docs/PRD-v2.md` (§6.8, §7, §8.1, §9),
> `PRODUCT.md` (Brand Commitments, WCAG 2.2 AA), `openspec/config.yaml`,
> `openspec/changes/monorepo-scaffold/design.md` (D6/D7/D10), tipos de
> `@octanejs/app-core` y `octane` instalados.

## 1. Resumen ejecutivo

El scaffold dejó `apps/web` con bases sólidas y directamente reutilizables:
tailwind **v4** con tokens semánticos ya declarados en `@theme` + variables CSS
por clase `.dark`, wrapper `vendor/i18n` real y testeado, y routing por tabla
explícita en `octane.config.ts`. El change frontend-foundation es
**mayormente aditivo**: extender tokens (faltan escalas por tema y tokens de
componente), crear dos layouts (auth público + app shell), registrar ~11 rutas
nuevas en `octane.config.ts`, y construir login/OTP como UI pura sin backend.
Los riesgos reales son: (a) el modelo de routing de Octane es **plano (MPA)** —
no hay rutas anidadas ni router cliente, el layout se repite por ruta; (b)
`input-otp` es una librería **React** y Octane no es runtime-compatible con
React (D6) — hay que decidir el wrapper OTP; (c) el flash de tema (FOUC) en SSR
exige un script inline en `index.html`.

## 2. Estado real de `apps/web`

### Estructura (verificada en disco)

```
apps/web/
├─ index.html                 # estático, placeholders <!--ssr-head--> / <!--ssr-body-->
├─ octane.config.ts           # tabla de rutas (defineConfig + RenderRoute)
├─ vite.config.ts             # plugins: octane(), tailwindcss(); build target esnext
├─ package.json               # deps: octane 0.2.3, @octanejs/vite-plugin 0.1.52,
│                             #   i18next 26.4.2, @fontsource/poppins 5.3.0
│                             # devDeps: tailwindcss 4.3.3 + @tailwindcss/vite, tsrx plugin
└─ src/
   ├─ routes/__root.tsrx      # layout raíz (I18nProvider + <main> centrado)
   ├─ routes/index.tsrx       # ruta "/" → SmokePage
   ├─ components/{atoms,molecules,organisms,templates,pages,base-view,vendor}
   │  ├─ vendor/i18n/         # wrapper REAL: core.ts (TS puro) + provider.tsrx + index.ts
   │  └─ pages/smoke-page.tsrx + atoms/app-title + molecules/feature-card
   ├─ lib/i18n/               # config.ts (es default), locales/es.json, i18n.test.ts
   └─ styles/{main.css,tokens.css}
```

### Tailwind v4 — ya configurado con tokens

- Sin `tailwind.config.*`: todo vía CSS (`@import "tailwindcss"` + `@theme`).
- `tokens.css` ya declara: escala `--color-primary-50…900` (verde, valores del
  PRD §9: `#16a34a` claro / `#22c55e` oscuro), `--font-sans` Poppins, y
  variables semánticas `--color-background|surface|border|text-primary|text-secondary`
  con valores por `:root` y `.dark`, más `color-scheme`.
- Los componentes consumen tokens con sintaxis v4 `bg-(--color-background)`
  (arbitrary value), NO con utilities generadas. Oportunidad: mover las
  variables semánticas dentro de `@theme` (o `@theme inline`) para generar
  utilities `bg-background`, `text-text-primary`, etc., y que `dark:` funcione
  con la estrategia de clase (`@custom-variant dark`).
- **Falta:** `@custom-variant dark` (tailwind v4 no activa `dark:` por clase
  `.dark` por defecto — default es `prefers-color-scheme`); tokens de estado
  (error/success para mensajes de login); tokens de foco visible (WCAG).

### Router Octane — modelo plano, NO file-based ni anidado

Verificado contra `node_modules/@octanejs/app-core/types/index.d.ts`:

- Las rutas se declaran **explícitamente** en `octane.config.ts`:
  `new RenderRoute({ path, entry: [exportName, file], layout? })`.
- `RenderRouteOptions` tiene `path`, `entry`, `layout` (UN solo layout por
  ruta), `before` (middleware), `status`. **No hay `children`**: no existe
  árbol de rutas anidadas ni herencia de layouts. `__root.tsrx` actual no es
  especial para el framework: es simplemente el `layout` asignado a `/`.
- Soporta patrones `:param` y `*slug` (relevante para futuras rutas dinámicas).
- **No se encontró router cliente / componente Link / useNavigate** en la API
  instalada: el codegen (`@octanejs/app-core/codegen`) genera entradas de
  hidratación **por ruta** → modelo MPA con SSR + hidratación por página. La
  navegación del sidebar será con anchors normales (`<a href>`) y full page
  load. Estado activo del nav: derivado de `window.location.pathname` en
  cliente (o del `Context.url` en SSR si el layout lo recibe — verificar en
  design; `RenderRouteProps` expone `params`, hay que confirmar si expone el
  path actual al layout).
- Octane exporta hooks React-like: `useState`, `useEffect`, `useRef`,
  `useId`, `useSyncExternalStore`, `useTransition`, etc. (verificado en
  `octane/dist/index.d.ts`). Suficiente para toggle de tema local y forms.
- Entry: no hay `main.tsx`; el plugin genera entries desde la tabla de rutas.

### i18n — wrapper real, patrón a replicar

- `vendor/i18n/core.ts`: TS puro, único import de `i18next`; expone
  `createI18n/getI18n/t/subscribeLanguageChange`.
- `vendor/i18n/provider.tsrx`: `I18nProvider` + `useT()` (re-render vía
  `useSyncExternalStore`).
- `lib/i18n/config.ts`: init con `es` default; importado por el layout raíz
  (existe en SSR e hidratación).
- `i18n.test.ts` (D10): test puro sin DOM que además escanea fuentes `.tsrx`
  y verifica que toda clave `t("...")` existe en el catálogo — **patrón
  extensible** a login/shell (agregar los nuevos archivos a la lista de
  sources, o generalizar el escaneo a un glob).
- Catálogo `es.json` anidado por sección (`app.*`, `smoke.*`). Convención
  sugerida: `auth.login.*`, `auth.otp.*`, `nav.*`, `theme.*`, `legal.*`.

## 3. Mapeo de rutas del change

Todas las rutas son `RenderRoute` nuevas en `octane.config.ts`:

| Ruta | Layout | Página | Real/placeholder |
| --- | --- | --- | --- |
| `/login` | auth-layout (público) | `pages/login-page` | real (UI sola) |
| `/login-verification` | auth-layout | `pages/login-verification-page` | real (UI sola) |
| `/dashboard`, `/tasks`, `/schedules`, `/clients`, `/incomes`, `/expenses`, `/transfers`, `/config` | app-shell-layout | placeholders | placeholder |
| `/` | decidir: redirect a `/login` o landing placeholder | — | decidir en design |

Implicación del modelo plano: **cada ruta protegida repite
`layout: "/src/routes/__app-shell.tsrx"`** en la tabla; el estado del shell
(sidebar colapsado, tema) NO sobrevive a la navegación salvo persistencia en
`localStorage` (coherente con el toggle temporal de tema). No hay guards de
auth en este change (backend inexistente): el shell se renderiza sin sesión.

## 4. Estrategia de tokens y tema

1. **Declaración:** todo en `src/styles/tokens.css` (único archivo de tokens,
   §9 "ajustable en un solo archivo"). Mantener la escala primary estática en
   `@theme`; agregar las variables semánticas a `@theme inline` (referenciando
   las vars por tema) para utilities `bg-surface`, `text-text-secondary`, etc.
2. **Variante dark por clase:** agregar `@custom-variant dark (&:where(.dark, .dark *));`
   en CSS para que `dark:` responda a la clase `.dark` en `<html>` (default v4
   es media query).
3. **Resolución del tema (sin backend):**
   - Páginas públicas (login/OTP/legales): `prefers-color-scheme` del SO
     (PRD §6.8).
   - Shell: toggle en el shell con estado local + persistencia temporal en
     `localStorage` (p. ej. `crm-theme`); el change de auth reemplazará la
     fuente por `user_theme` sin tocar los componentes (misma frontera:
     wrapper/lib `lib/theme/` + `useSyncExternalStore`, patrón ya probado
     con i18n).
4. **Anti-FOUC:** script inline bloqueante en `<head>` de `index.html` que lee
   `localStorage`/`matchMedia` y setea `class="dark"` antes del primer paint.
   Sin esto, el SSR sirve siempre el tema claro y hay flash. Nota: app-core
   soporta nonce CSP (`OCTANE_NONCE_STATE_KEY`) para scripts inline si en el
   futuro se endurece CSP — documentarlo.

## 5. Navegación del shell (PRD §7)

Árbol: Dashboard, Tareas, Schedule, Clients, Finance (Income/Expenses/Transfers),
Config. Mapeo directo a las rutas canónicas §7; "Finance" es un **grupo no
clicable** (o colapsable) con 3 hijos. Labels desde i18n (`nav.*`). Sidebar
izquierdo; PRD dice "resizable con resizable-panels" — resizable-panels es
**React** (misma incompatibilidad que input-otp): en este change el sidebar
puede ser de ancho fijo/colapsable y dejar el resize para cuando exista el
wrapper (o wrapper propio con CSS `resize`/zagjs splitter). El shell NO
implementa lógica de módulos: páginas destino son placeholders con
`AppTitle` + texto i18n.

Accesibilidad (WCAG 2.2 AA, vinculante): `<nav aria-label>` + lista, link
activo con `aria-current="page"`, foco visible (token de foco), contraste AA
en ambos temas (verificar `#16a34a` sobre blanco para texto pequeño: ratio
~3.3:1 — solo válido para texto grande/UI; para texto usar `primary-700` en
claro), skip-link al contenido, sidebar operable por teclado.

## 6. Login + OTP (UI sola, PRD §8.1)

- `/login`: form con input email + botón primario (única acción primaria,
  Brand Commitments); validación de formato client-side; al "enviar" navega a
  `/login-verification` (sin backend: navegación directa, estado fake mínimo
  o email en query param con nuqs — nuqs es React: **no usar**, pasar por
  URLSearchParams estándar). Footer con links a `/terms`, `/privacy`,
  `/cookies` (§7: legales públicas; en este change los destinos pueden ser
  placeholders mínimos o quedar fuera — decidir en specify).
- `/login-verification`: **wrapper `vendor/otp-input/` obligatorio** (tabla §9:
  `OtpInput` encapsula input-otp). 6 dígitos, ceros a la izquierda (input
  `inputmode="numeric"`, patrón que preserve leading zeros — usar
  `pattern="[0-9]*"` y NO `type="number"`).
- ⚠️ **`input-otp` es React**; Octane no es runtime-compatible (D6 absorbió
  esto para react-i18next). Opciones para design:
  a) implementar `OtpInput` propio sobre **zagjs `pin-input`** (zagjs es el
     stack de componentes declarado en config.yaml y su core es
     framework-agnostic; el wrapper absorbe el wiring) — recomendada;
  b) usar la capa ReactCompat de Octane (`octane/react`) para montar input-otp
     — añade complejidad y una segunda runtime;
  c) OTP input hand-rolled (6 inputs + clipboard/paste + teclado) — riesgo de
     accesibilidad si se hace mal.
  La decisión es de design; la regla §9 se cumple igual vía wrapper.

## 7. Riesgos

| Riesgo | Nivel | Mitigación propuesta |
| --- | --- | --- |
| input-otp / resizable-panels / nuqs son React y no corren nativo en Octane | 🔴 | Wrappers §9 con implementación propia o zagjs core; decisión explícita en design antes de specify de componentes |
| Modelo de routing plano: sin layouts anidados ni guards; repetición de `layout` por ruta | 🟡 | Tabla generada por helper (`shellRoute(path, entry)`) en `octane.config.ts`; auth-guard diferido al change de auth |
| Sin router cliente (MPA): estado del shell se pierde entre páginas | 🟡 | Persistir tema/sidebar en localStorage; confirmar en design si Octane 0.2.3 expone navegación cliente no documentada en tipos |
| FOUC de tema en SSR | 🟡 | Script inline bloqueante en `index.html`; documentar interacción con CSP nonce |
| `dark:` de tailwind v4 apunta a media query, no a clase | 🟡 | `@custom-variant dark` en tokens.css; test visual ambos temas |
| Contraste AA del verde `#16a34a` como texto en tema claro | 🟡 | Escala primary completa; regla: texto interactivo ≥ primary-700 en claro |
| strict_tdd con UI sin DOM en tests | 🟡 | Lógica extraíble a TS puro testeable (resolución de tema, validación email, estado OTP) siguiendo patrón D10; render diferido como en scaffold |
| review_budget 400 con muchas pantallas | 🟡 | Commits atómicos (tokens → shell → login → OTP); probable size:exception — consultar al usuario (delivery ask-on-risk) |

## 8. Reglas vinculantes reafirmadas

- Ninguna librería de UI fuera de `components/vendor/` (i18n ya lo demuestra;
  OTP/icons/toast/etc. requieren wrapper propio primero).
- Íconos: phosphor-icons vía wrapper `vendor/icons/` si el shell usa íconos
  (PRD §7 no exige íconos en el árbol; evaluar en design — más simple sin).
- Todas las cadenas de UI en `es.json` vía `useT()` (test D10 extensible).
- El shell no implementa lógica de negocio de módulos (placeholders).
- No hay auth real: sin guards, sin cookies, sin `user_theme` persistido en
  backend.
