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

El sistema DEBE aplicar la regla de contraste WCAG 2.2 AA:

- En tema claro, el texto interactivo pequeño (links, labels de nav, botones
  ghost) DEBE usar `primary-700` o más oscuro; `primary-600` (`#16a34a`, ~3.3:1)
  SOLO PUEDE usarse para texto grande (≥24px o ≥18.66px bold), íconos/gráficos
  de UI (3:1) y fondos de acción primaria con texto blanco.
- En tema oscuro, el texto interactivo DEBE usar `primary-400`/`primary-500`
  sobre `background`/`surface` (≥4.5:1).
- El foco visible canónico DEBE ser `outline: 2px solid var(--color-focus);
  outline-offset: 2px` vía `focus-visible:`; `outline: none` está prohibido sin
  reemplazo equivalente (WCAG 2.2 AA — 2.4.7/2.4.13).

#### Scenario: Texto interactivo en tema claro

- GIVEN un link o label de nav en tema claro
- WHEN se inspecciona su color de texto
- THEN usa `primary-700` o más oscuro (nunca `primary-600` como texto pequeño)

#### Scenario: Foco visible en componentes interactivos

- GIVEN cualquier componente interactivo del sistema
- WHEN recibe foco por teclado
- THEN muestra el outline de 2px con el token `--color-focus` y offset de 2px

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
