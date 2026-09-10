# Design System Specification

> Change: `frontend-foundation` · Dominio nuevo (spec completa).
> Deriva de las decisiones D6 y D7 del design. Autoridad visual: `DESIGN.md` (raíz).

## Purpose

Define el sistema de diseño de CRM-HOME: tokens semánticos verde/Poppins en un
único archivo con valores por tema claro y oscuro (PRD §9), utilities de
tailwind v4 generadas desde los tokens, variante `dark:` por clase, tokens de
estado y de foco visible, la regla de contraste WCAG 2.2 AA vinculante, la
resolución de tema sin backend con frontera estable hacia `user_theme`, y los
componentes base que consumen exclusivamente tokens.

## Requirements

### Requirement: Archivo único de tokens con estructura de tres capas

`apps/web/src/styles/tokens.css` DEBE ser el único archivo de tokens del sistema
(PRD §9 "ajustable en un solo archivo") y DEBE organizarse en tres capas:

1. `@theme` estático con la escala `--color-primary-50…900` (verde) y
   `--font-sans` Poppins; la escala NO DEBE cambiar por tema.
2. Variables semánticas por tema en `:root` (claro) y `.dark` (oscuro):
   `--color-primary`, `--color-background`, `--color-surface`, `--color-border`,
   `--color-text-primary`, `--color-text-secondary`, más los tokens de estado y
   foco; cada bloque DEBE declarar `color-scheme: light|dark` coherente.
3. Registro de las variables semánticas en `@theme inline` para generar
   utilities reales (`bg-background`, `bg-surface`, `bg-primary`,
   `border-border`, `text-text-primary`, `text-text-secondary`, `text-error`,
   `text-success`, `outline-focus`), reemplazando la sintaxis de arbitrary value
   `bg-(--color-…)`.

Ningún componente PUEDE hardcodear valores hex ni tipografías fuera de
`tokens.css` (regla §9).

#### Scenario: Utilities semánticas generadas desde tokens

- GIVEN `tokens.css` con las tres capas
- WHEN un componente usa `bg-surface` o `text-text-secondary`
- THEN tailwind v4 genera la utility que resuelve a la variable semántica del tema activo, sin arbitrary values

#### Scenario: Ningún valor hardcodeado en componentes

- GIVEN el código de `src/components/`
- WHEN se buscan valores hex (`#[0-9a-fA-F]{3,6}`) o familias tipográficas literales fuera de `tokens.css`
- THEN no hay coincidencias (todo valor visual proviene de tokens)

### Requirement: Variante dark por clase

`tokens.css` DEBE declarar `@custom-variant dark (&:where(.dark, .dark *));` de
modo que la variante `dark:` responda a la clase `.dark` en `<html>` y NO a la
media query `prefers-color-scheme` (default de tailwind v4).

#### Scenario: dark: responde a la clase

- GIVEN `<html>` sin la clase `dark` y un SO configurado en oscuro
- WHEN se renderiza un elemento con una utility `dark:…`
- THEN la variante NO se aplica hasta que `<html>` tenga la clase `dark`

### Requirement: Tokens de estado y foco con contraste AA

El sistema DEBE definir tokens de estado `--color-error` y `--color-success` y
un token de foco `--color-focus`, con valores por tema que cumplan contraste AA
como texto pequeño sobre el fondo de su tema (claro: error `#dc2626`, success
`#15803d`, foco `#15803d`; oscuro: error `#f87171`, success `#4ade80`, foco
`#4ade80`, sobre `background`/`surface` del tema).

#### Scenario: Tokens de estado utilizables como texto en ambos temas

- GIVEN los tokens de estado y foco declarados por tema
- WHEN se miden sus ratios de contraste contra `background`/`surface` de su tema
- THEN error, success y foco alcanzan al menos 4.5:1 en ambos temas

### Requirement: Regla de contraste AA documentada y aplicada

El sistema DEBE aplicar simultáneamente la regla de contraste WCAG 2.2 AA y la
regla de la **lista cerrada de usos del acento verde**. El acento verde NUNCA
DEBE aparecer como decoración: solo se permite en los cinco usos canónicos
siguientes (modo Operate; un verde por intención, no por costumbre):

1. **Acción primaria** — relleno del único botón primario por pantalla
   (`Button` variante `primary`).
2. **Estado activo de navegación** — item activo del sidebar
   (`NavItem` con `aria-current="page"` o equivalente).
3. **Foco visible** — anillo `outline-focus` de 2 px con offset 2 px.
4. **Indicador de éxito** — mensajes de éxito inline (`StatusMessage`
   variante `success`).
5. **Links inline** — anchors dentro de prosa o breadcrumbs
   (`login-verification-page`, `routes/index`).

Cualquier uso del acento verde fuera de estos cinco casos (ghost buttons,
cabeceras de grupo de nav activas, caret de input OTP, fill on focus del
skip-link, cabeceras activas, decoración ambiental) NUNCA DEBE aparecer.

Reglas de contraste vinculadas:

- En tema claro, el texto interactivo pequeño usa verde `primary-700` o más
  oscuro **únicamente** en (a) el `NavItem` activo y (b) links inline. Ningún
  otro texto interactivo pequeño lleva verde. `primary-600` (`#16a34a`,
  ~3.3:1) SOLO PUEDE usarse para texto grande (≥24 px o ≥18.66 px bold),
  íconos/gráficos de UI (3:1) y rellenos de acción primaria con texto blanco
  encima.
- En tema oscuro, el texto interactivo verde usa `primary-400`/`primary-500`
  sobre `background`/`surface` (≥4.5:1), solo en los casos (a) y (b); mismas
  exclusiones que en claro.
- El foco visible canónico DEBE ser `outline: 2px solid var(--color-focus);
  outline-offset: 2px` vía `focus-visible:`; `outline: none` está prohibido sin
  reemplazo equivalente (WCAG 2.2 AA — 2.4.7/2.4.13).

Contrato de paleta (consumido por este requisito):

- Los neutrales semánticos (`background`, `surface`, `border`, `text-primary`,
  `text-secondary`) DEBEN ser gris-puro en ambos temas — sin sesgo cool, sin
  tinte verde.
- `tokens.css` DEBE declarar los hex exactos fijados en
  `openspec/changes/theme-quieter-minimalist/design.md` §2 D1 (light) y
  §2 D2 (dark); un cambio en la paleta exige revisar este requisito.

#### Scenario: Texto interactivo en tema claro

- GIVEN un link inline o un `NavItem` activo en tema claro
- WHEN se inspecciona su color de texto
- THEN usa `primary-700` (`#15803d`) o más oscuro para mantener AA; estos son
  los **únicos dos casos** donde el verde se usa como texto pequeño en tema
  claro. Ghost buttons, cabeceras de grupo, caret y skip-link fill NO usan
  verde — usan `text-text-primary` o `text-text-secondary`.

#### Scenario: Foco visible en componentes interactivos

- GIVEN cualquier componente interactivo del sistema
- WHEN recibe foco por teclado
- THEN muestra el outline de 2 px con el token `--color-focus` y offset de 2 px

#### Scenario: Lista cerrada de usos del acento verde

- GIVEN cualquier ruta del producto en cualquier tema (claro/oscuro)
- WHEN un usuario experto recorre la página completa de inicio a fin
- THEN el único verde visible en pantalla es: (1) el relleno del botón
  primario por pantalla, (2) el `NavItem` activo del sidebar, (3) el anillo
  `outline-focus` al tabular, (4) el texto de `StatusMessage` variante
  `success` cuando aplique, (5) los anchors inline (link de retorno en
  `login-verification`, anchor fallback en `routes/index`). Cualquier otro
  verde visible es un regression slipped contra la lista cerrada.

#### Scenario: Ghost button sin acento

- GIVEN el componente `Button` con `variant="ghost"` en cualquier tema
- WHEN se renderiza su estado base, hover o focus
- THEN su texto usa `text-text-primary` (claro y oscuro); en hover, el
  contenedor usa `bg-surface`. NUNCA usa `text-primary-700` ni
  `text-primary-400`. El verde permitido por la lista cerrada para foco
  (anillo `focus-visible:outline-focus`) se mantiene vía la `BASE_CLASS`
  heredada.

#### Scenario: Cabecera de grupo de nav activa sin acento

- GIVEN un `NavGroup` con `props.active === true` (algún hijo activo)
- WHEN se renderiza la cabecera del grupo
- THEN usa `text-text-primary` y `font-medium` sobre `bg-surface` del
  sidebar. NUNCA usa `text-primary-700` ni `text-primary-400`. La jerarquía
  "este grupo contiene una sección activa" se construye por peso
  tipográfico y contraste neutral, no por tinte verde. El item hijo activo
  (`NavItem`) sigue llevando el verde canónico de la lista cerrada
  (caso 2: nav activo); no hay dos señales cromáticas para el mismo hecho
  visual.

#### Scenario: Caret de celda OTP sin acento

- GIVEN el componente `OtpInput` con una celda enfocada (cualquier celda del
  array)
- WHEN el navegador aplica `caret-color` (Chrome 57+, Firefox 53+,
  Safari 11.1+)
- THEN el caret usa `caret-text-primary`, que resuelve a
  `--color-text-primary` del tema activo (`#171717` claro, `#fafafa` oscuro).
  NUNCA usa `caret-primary`. En navegadores sin soporte de `caret-color`, el
  caret toma el color del sistema sin regresión funcional.

#### Scenario: Skip-link fill on focus sin acento

- GIVEN el componente `SkipLink` recibiendo foco por teclado en cualquier
  ruta
- WHEN el contenedor del skip-link se vuelve visible (`focus:not-sr-only`)
- THEN el fill usa `bg-text-primary` y el texto usa `text-background`
  (ratios AAA: 16.10:1 en claro, 19.30:1 en oscuro). El verde permitido por
  la lista cerrada para foco (anillo `focus-visible:outline-focus` de 2 px
  con offset 2 px) se mantiene intacto. El fill NUNCA usa `bg-primary` con
  `text-white`. WCAG 2.4.1 (Bypass Blocks) sigue cumpliéndose porque el
  outline verde supera el umbral no-textual 3:1 contra el fondo adyacente
  del documento (`#ffffff` claro, `#0a0a0a` oscuro).

#### Scenario: Contrato del tema oscuro — neutrales pure-neutral sin tinte verde

- GIVEN el bloque `.dark` de `apps/web/src/styles/tokens.css` con el tema
  oscuro activo
- WHEN se inspeccionan los tokens semánticos neutros
- THEN:
  - `--color-background` es `#0a0a0a` (sin tinte verde).
  - `--color-surface` es `#141414`.
  - `--color-border` es `#262626`.
  - `--color-text-primary` es `#fafafa`.
  - `--color-text-secondary` es `#a3a3a3`.
- Los tokens `--color-error` (`#f87171`), `--color-success` (`#4ade80`) y
  `--color-focus` (`#4ade80`) NO cambian. `--color-primary` (que apunta a la
  escala `primary-50…900`) NO cambia.

#### Scenario: Contraste AA de los neutrales — tema oscuro

- GIVEN los neutrales pure-neutral del tema oscuro
  (`#0a0a0a` / `#141414` / `#262626` / `#fafafa` / `#a3a3a3`)
- WHEN se mide el contraste de los textos contra sus fondos
- THEN:
  - `--color-text-primary #fafafa` sobre `--color-background #0a0a0a` ≥ 7:1
    (AAA).
  - `--color-text-primary #fafafa` sobre `--color-surface #141414` ≥ 7:1
    (AAA).
  - `--color-text-secondary #a3a3a3` sobre `--color-background #0a0a0a`
    ≥ 7:1 (AAA).
  - `--color-text-secondary #a3a3a3` sobre `--color-surface #141414` ≥ 4.5:1
    (AA).

#### Scenario: Contrato del tema claro — neutrales pure-neutral sin sesgo cool

- GIVEN el bloque `:root` de `apps/web/src/styles/tokens.css` con el tema
  claro activo
- WHEN se inspeccionan los tokens semánticos neutros
- THEN:
  - `--color-background` es `#ffffff` (sin cambios; ya neutro).
  - `--color-surface` es `#f5f5f5` (gris puro, neutral-100).
  - `--color-border` es `#e5e5e5` (gris puro, neutral-200).
  - `--color-text-primary` es `#171717` (neutral-900, near-black).
  - `--color-text-secondary` es `#737373` (neutral-500).
- Los tokens `--color-error` (`#dc2626`), `--color-success` (`#15803d`) y
  `--color-focus` (`#15803d`) NO cambian. `--color-primary` NO cambia. El
  orden ascendente de luminancia (`border < surface < background`) se
  preserva para mantener la jerarquía de separadores, paneles y página.

#### Scenario: Contraste AA de los neutrales — tema claro

- GIVEN los neutrales pure-neutral del tema claro
  (`#ffffff` / `#f5f5f5` / `#e5e5e5` / `#171717` / `#737373`)
- WHEN se mide el contraste de los textos contra sus fondos
- THEN:
  - `--color-text-primary #171717` sobre `--color-background #ffffff`
    ≥ 15:1 (AAA).
  - `--color-text-primary #171717` sobre `--color-surface #f5f5f5` ≥ 15:1
    (AAA).
  - `--color-text-secondary #737373` sobre `--color-background #ffffff`
    ≥ 4.5:1 (AA, ≥4.65:1 con margen ajustado).
  - `--color-text-secondary #737373` sobre `--color-surface #f5f5f5` ≥ 4.4:1
    (AA).

### Requirement: Resolución de tema sin backend con frontera estable

`apps/web/src/lib/theme/` DEBE resolver el tema sin backend mediante un puerto
`ThemePreferenceSource { read(): ThemeSetting; write(s): void; subscribe(cb) }`
con `Theme = "light"|"dark"` y `ThemeSetting = Theme|"system"`:

- Las páginas públicas (login, verificación OTP y futuras legales) DEBEN seguir
  `prefers-color-scheme` del SO (`SystemThemeSource`), sin toggle ni
  persistencia (PRD §6.8).
- El shell autenticado DEBE usar un estado local persistido temporalmente en
  `localStorage` bajo la clave `crm-theme` (`LocalStorageThemeSource`).
- Los componentes DEBEN conocer únicamente `useTheme()`; el cambio futuro a
  `user_theme` (backend) DEBE poder realizarse reemplazando la fuente en el
  punto de composición sin tocar componentes, tokens ni el script anti-FOUC.
- La lógica de resolución (`resolveTheme`, `isPublicPath`) DEBE ser TS puro
  testeable sin DOM.

#### Scenario: Página pública sigue al SO

- GIVEN `/login` con `crm-theme = "light"` en localStorage y el SO en oscuro
- WHEN se carga la página
- THEN el tema aplicado es oscuro (la preferencia guardada se ignora en rutas públicas)

#### Scenario: Shell honra la preferencia persistida

- GIVEN `/dashboard` con `crm-theme = "dark"` en localStorage y el SO en claro
- WHEN se carga la página
- THEN el tema aplicado es oscuro y `<html>` tiene la clase `dark`

#### Scenario: Swap de fuente sin tocar componentes

- GIVEN un componente que consume `useTheme()`
- WHEN se reemplaza `LocalStorageThemeSource` por una fuente `AccountThemeSource` en el punto de composición
- THEN el componente sigue funcionando sin cambios en su código

### Requirement: Sin flash de tema al cargar (anti-FOUC)

`apps/web/index.html` DEBE incluir un script inline bloqueante como primer hijo
de `<head>` (antes del `<link rel="stylesheet">`) que aplique la clase `dark` a
`<html>` antes del primer paint, replicando la regla de resolución: rutas
públicas o ausencia de preferencia guardada → `prefers-color-scheme`; resto →
`localStorage`. La duplicación de lógica con `lib/theme/` DEBE estar documentada
con comentarios cruzados en ambos archivos y la lista de rutas públicas DEBE
cubrirse con el test de `isPublicPath()`.

#### Scenario: Carga en oscuro sin flash

- GIVEN `crm-theme = "dark"` y una ruta del shell
- WHEN se carga la página
- THEN el primer paint ya tiene la clase `dark` en `<html>` (no hay flash de tema claro)

#### Scenario: Carga pública con SO claro y preferencia oscura guardada

- GIVEN `crm-theme = "dark"` y el SO en claro
- WHEN se carga `/login`
- THEN el primer paint es claro (la página pública sigue al SO)

### Requirement: Componentes base como atoms/molecules consumiendo solo tokens

El sistema DEBE proveer componentes base reutilizables — botón primario/ghost,
input de texto, mensaje de estado (error/success), skip-link y campo de
formulario (label + input + error) — organizados en `atoms/` y `molecules/`,
que DEBEN consumir exclusivamente tokens semánticos y DEBEN cumplir la regla de
contraste y foco visible de esta spec. El botón primario DEBE usar el verde como
relleno con texto blanco.

#### Scenario: Mensaje de estado usa tokens de estado

- GIVEN el componente de mensaje de estado
- WHEN se renderiza en variante `error` y `success`
- THEN usa `text-error`/`text-success` (tokens), sin colores literales, con contraste AA en ambos temas

### Requirement: Verificación de bundle y SSR de bindings visuales

Todo binding visual adoptado bajo `components/vendor/` DEBE cumplir las mismas
garantías que exige el design system a los componentes base: render SSR sin
regresión y sin mismatch de hidratación, y respeto de los tokens del sistema
(ningún binding PUEDE introducir valores visuales hardcodeados que compitan con
`tokens.css`). En particular, la adopción de `@octanejs/phosphor-icons` tras
`vendor/icons` DEBE verificar en implementación que:

1. El tree-shaking excluye del bundle los íconos no usados (el set completo de
   1.512 íconos NO PUEDE inflar el bundle; la union cerrada `IconName` acota el
   conjunto importado).
2. El render SSR del SVG funciona sin regresión en las pantallas que usan
   `Icon`.

La evidencia de ambas verificaciones (medición de bundle o inspección del build,
y comprobación SSR) DEBE quedar registrada en el change.

#### Scenario: Bundle no inflado por el set completo

- GIVEN el build de `apps/web` tras el swap de íconos
- WHEN se inspecciona el bundle generado
- THEN solo los íconos referenciados por `IconName` están incluidos y la evidencia queda registrada

#### Scenario: Icon renderiza en SSR sin regresión

- GIVEN una pantalla del shell que usa `Icon`
- WHEN se compara el HTML SSR con el hidratado
- THEN los SVG de íconos son idénticos en ambas fases, sin mismatch
