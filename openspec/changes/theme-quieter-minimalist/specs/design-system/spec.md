# Delta para design-system

> Change: `theme-quieter-minimalist` · Fases explore/design/proposal DONE.
> Delta contra `openspec/specs/design-system/spec.md`
> (autoridad visual canónica, dominio introducido por
> `frontend-foundation`).
> Modo impeccable: **Operate**. Principio rector: "the accent is a precision
> tool, not decoration". La prosa de `DESIGN.md` se alinea en un follow-up
> gobernado (PR-A, gate separado); este delta solo codifica el contrato de
> comportamiento en la spec canónica.

## MODIFIED Requirements

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

(Previously: este requisito solo decía "el texto interactivo pequeño (links,
labels de nav, botones ghost) DEBE usar `primary-700` o más oscuro en tema
claro" — una regla de contraste demasiado permisiva que no enumeraba los
cinco usos canónicos del acento ni prohibía explícitamente ghost buttons,
cabeceras de grupo, caret OTP y fill del skip-link. Tampoco declaraba un
contrato de paleta pure-neutral por tema. La spec canónica previa no
aseguraba AA en el cambio de hex nuevos ni la coherencia del elenco verde.)

#### Scenario: Texto interactivo en tema claro

- GIVEN un link inline o un `NavItem` activo en tema claro
- WHEN se inspecciona su color de texto
- THEN usa `primary-700` (`#15803d`) o más oscuro para mantener AA; estos son
  los **únicos dos casos** donde el verde se usa como texto pequeño en tema
  claro. Ghost buttons, cabeceras de grupo, caret y skip-link fill NO usan
  verde — usan `text-text-primary` o `text-text-secondary`.

(Previously: el scenario original decía "link o label de nav en tema claro"
sin enumerar la lista cerrada ni excluir ghost buttons explícitamente.)

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
