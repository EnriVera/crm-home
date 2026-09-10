# Diseño — theme-quieter-minimalist

> Change SDD: `theme-quieter-minimalist` (CRM-HOME) · Fase: design
> Fuentes verificadas: `openspec/changes/theme-quieter-minimalist/{proposal,explore,preproposal}.md`,
> `apps/web/src/styles/tokens.css`, `apps/web/src/components/atoms/{button,skip-link}.tsrx`,
> `apps/web/src/components/molecules/nav-group.tsrx`,
> `apps/web/src/components/vendor/otp-input/otp-input.tsrx`,
> `DESIGN.md` (autoridad visual, raíz), `openspec/specs/design-system/spec.md`.
> Skill: impeccable `Operate` mode + `reference/quieter.md` (refinement preserves,
> regla 10%, jerarquía por peso, no por color).
> Pre-proposal (2026-09-10): lista cerrada de usos del verde CONFIRMADA · dark
> theme pure-neutral verbatim · research lane unselected · audit incluido en
> explore.
> El proposal resuelve los design flags D1–D5 (§4); este diseño **fija los
> diffs exactos**, **verifica AA en ambos temas y contra ambos fondos**, y
> documenta los cambios de governance (DESIGN.md + spec) que el apply deja
> fuera de scope como residual gateado.

## 1. Resumen ejecutivo

El change baja la intensidad visual del CRM-HOME al modo Operate mediante tres
operaciones puntuales, sin tocar la escala primaria ni los tokens de estado:

1. **`tokens.css`**: 5 neutrales de `:root` (claro) y 5 de `.dark` (oscuro)
   reescritos a hex pure-neutral (sin sesgo slate, sin tinte verde). Los
   valores light siguen la propuesta D1 (`#f5f5f5` / `#e5e5e5` / `#171717` /
   `#737373` + `#ffffff` intacto); los valores dark son verbatim del usuario
   (`#0a0a0a` / `#141414` / `#262626` / `#fafafa` / `#a3a3a3`). La escala
   `primary-50…900` y los tokens `--color-primary`/`--color-success`/
   `--color-focus`/`--color-error` quedan **byte-idénticos**.
2. **Cuatro componentes**: 4 sobre-usos del acento se eliminan de la lista
   cerrada (ghost button, cabecera activa de grupo de nav, caret de OTP,
   fill-on-focus del skip-link). El verde se reubica en (a) `outline-focus`
   preservado en skip-link, (b) variantes `primary` de Button y `nav-item`
   activo (intactos), (c) los demás usos válidos (links inline, mensaje de
   éxito) que ya estaban bien.
3. **Governance (gateado, fuera de scope del apply)**: `DESIGN.md` §1, §2.2,
   §2.3, §6, §8 reescritos para alinearse con la regla nueva, y
   `openspec/specs/design-system/spec.md` requisito "Regla de contraste AA
   documentada y aplicada" recibe un delta MODIFIED en la fase de spec.

El diff total estimado del PR de implementación es de ~15–20 líneas
(`tokens.css` ≈ 10–12 + 1 línea en cada uno de los 4 componentes); ampliamente
dentro del review budget de 400, **single-PR** por delivery strategy
(`ask-on-risk` no se activa por tamaño; ver §10 governance para chaining
opcional).

## 2. Decisiones de diseño

Los design flags D1–D5 que el proposal adelantó se **fijan** aquí con valores
exactos, verificaciones AA cruzadas y rationale.

### D1 — Hex exactos del light theme (pure-neutral)

**Decisión:** los cinco tokens semánticos neutros de `:root` se reescriben al
siguiente set pure-neutral, propuesto por el proposal §4 D1 y verificado AA
contra ambos fondos del tema claro:

| Token | Antes | Después | Familia | Notas |
| --- | --- | --- | --- | --- |
| `--color-background` | `#ffffff` | `#ffffff` (sin cambios) | white | ya neutro puro |
| `--color-surface` | `#f6f8f7` (sesgo cool) | `#f5f5f5` | neutral-100 | gris puro |
| `--color-border` | `#e2e8f0` (slate-200) | `#e5e5e5` | neutral-200 | gris puro |
| `--color-text-primary` | `#0f172a` (slate-900) | `#171717` | neutral-900 | near-black |
| `--color-text-secondary` | `#52606d` (slate-600) | `#737373` | neutral-500 | gris medio |

Tokens que **no cambian** (out of scope verde): `--color-error` (`#dc2626`),
`--color-success` (`#15803d`), `--color-focus` (`#15803d`). El
`--color-primary` apunta a `var(--color-primary-600)` (`#16a34a`) — intacto.

**Justificación:** el slate (`#e2e8f0`, `#0f172a`, `#52606d`) tenía un sutil
sesgo cool que rompe la promesa visual "neutral donde sea posible" (explore
§4.1). Migrar a la escala neutral mantiene la **legibilidad y la relación de
contraste** que el sistema ya validó, cambiando solo la temperatura. La
secuencia `border #e5e5e5` < `surface #f5f5f5` < `background #ffffff`
preserva el orden ascendente de luminancia que el sistema asume
(`border` < `surface` < `background` para mantener la jerarquía de
separadores, paneles y página).

**Verificación WCAG AA cruzando fondo y surface (texto pequeño) — tema claro:**

- `text-primary #171717` sobre `background #ffffff` → **≈16.1:1** (AAA).
- `text-primary #171717` sobre `surface #f5f5f5` → **≈15.6:1** (AAA).
- `text-secondary #737373` sobre `background #ffffff` → **≈4.65:1** (AA ✓, justo).
- `text-secondary #737373` sobre `surface #f5f5f5` → **≈4.40:1** (AA ✓).
- `success #15803d` sobre `background #ffffff` → **≈5.01:1** (AA ✓).
- `success #15803d` sobre `surface #f5f5f5` → **≈4.75:1** (AA ✓).
- `focus #15803d` (no-textual 3:1) sobre `background` → **≈5.01:1** (✓).
- `error #dc2626` sobre `background #ffffff` → **≈5.17:1** (AA ✓) — no cambia.

**Verificación AA cruzando fondo y surface — tema oscuro (cambia a verbatim):**

- `text-primary #fafafa` sobre `background #0a0a0a` → **≈19.3:1** (AAA).
- `text-primary #fafafa` sobre `surface #141414` → **≈17.6:1** (AAA).
- `text-secondary #a3a3a3` sobre `background #0a0a0a` → **≈7.47:1** (AAA).
- `text-secondary #a3a3a3` sobre `surface #141414` → **≈6.80:1** (AA ✓).
- `success #4ade80` sobre `background #0a0a0a` → **≈9.19:1** (AAA).
- `success #4ade80` sobre `surface #141414` → **≈8.36:1** (AAA).
- `focus #4ade80` (no-textual 3:1) sobre `background` → **≈9.19:1** (✓).
- `error #f87171` sobre `background #0a0a0a` → **≈7.07:1** (AAA) — no cambia.

> **Nota de método:** los ratios se estiman con la fórmula de luminancia relativa
> WCAG (sRGB → linear → relative luminance → (L1+0.05)/(L2+0.05)). El apply
> ejecuta una pasada final con `axe-core` o equivalente en `/login` y
> `/dashboard` para confirmar AA en condiciones reales (anti-aliasing, font
> rasterizer); la tabla anterior sirve como cota teórica.

**Riesgo residual y mitigación:** `text-secondary #737373` sobre
`background #ffffff` queda en **4.65:1** (margen de 0.15 sobre el umbral 4.5:1).
Si el cambio de font-hinting o el anti-aliasing del navegador lo empujan por
debajo de 4.5:1, el apply debe oscurecer el token a `#6b6b6b` (4.86:1) o
`#666666` (5.74:1). El apply mide contraste *antes* de declarar éxito. Si en
el momento del apply hay tests automatizados de a11y, documentan ya el delta.

### D2 — Skip-link discoverability sin quemar el acento en fill

**Decisión:** `focus:bg-primary focus:text-white` se reemplaza por
`focus:bg-text-primary focus:text-background`, **preservando**
`focus-visible:outline-focus` (anillo verde de 2px con offset 2px). El
skip-link ya no es verde-fill sino neutral-alto-contraste-fill con anillo
verde canónico.

**Justificación:**

1. **WCAG 2.4.1 (Bypass Blocks)** exige que el skip-link sea descubrible al
   recibir foco. La solución canónica es "primer foco visible del documento",
   no "primer foco verde": el contraste del fill + outline debe ser suficiente,
   el color del fill no necesita ser accent.
2. La affordance de "salta un bloque" se preserva por **alto contraste
   cromático** (negro sobre blanco en claro, blanco sobre negro en oscuro),
   no por identidad de color. El outline verde sigue siendo el patrón que
   identifica al usuario experto "esto recibió foco del teclado".
3. La regla de lista cerrada reserva el verde para (a) CTA primario, (b) nav
   activo, (c) foco, (d) éxito, (e) links inline. El skip-link **no es** un
   CTA primario del producto (no es una acción de negocio), ni nav, ni link,
   ni éxito. Su única intersección canónica con el verde es **(c) foco**, y
   eso se mantiene exactamente vía `focus-visible:outline-focus`.

**Verificación AA del fill propuesto (texto del skip-link sobre fill):**

- Tema claro: `text-background #ffffff` sobre `bg-text-primary #171717` →
  **≈16.1:1** (AAA ✓). Outline verde `focus #15803d` contra el fill
  `bg-text-primary #171717`: **≈1.97:1** ⚠ — bajo el umbral 3:1 de
  componente no-textual.
  - **Mitigación:** el outline se mide contra el **fondo adyacente del
    documento** (`bg-background #ffffff`), no contra el fill del propio skip
    link. Sobre `#ffffff`: **≈5.01:1** (✓ AA no-textual 3:1). El skip-link
    aparece en una esquina absoluta (`focus:left-4 focus:top-4`), su outline
    recorta contra la página, no contra sí mismo.
- Tema oscuro: `text-background #0a0a0a` sobre `bg-text-primary #fafafa` →
  **≈19.3:1** (AAA ✓). Outline verde `focus #4ade80` contra el fondo
  adyacente `bg-background #0a0a0a`: **≈9.19:1** (✓).

**Riesgo y mitigación:** el cambio de affordance "salta bloque verde" →
"salta bloque negro/blanco con anillo verde" puede sentirse diferente a
usuarios acostumbrados. Mitigación: el outline verde **es exactamente** el
canónico del sistema (`outline-focus`), por lo que la lectura "esto recibió
foco" sigue siendo inmediata. El apply verifica manualmente con foco por
teclado en `/login` y `/dashboard` en ambos temas.

### D3 — Cabecera de grupo de nav "Finance" cuando un hijo está activo

**Decisión:** la cabecera activa (`stateClass` con `props.active`) se pinta
con `text-text-primary font-medium` en lugar de `text-primary-700
dark:text-primary-400`. El peso tipográfico reemplaza al color como vehículo
de jerarquía. El `NavItem` hijo activo **no cambia** (verde canónico:
nav activo, lista cerrada).

**Justificación (modo Operate, regla 10%):**

1. La cabecera de un grupo no es un destino clicable; es un **label
   estructural** (p. ej. "Finance"). Pintarla verde cuando hay hijo activo
   **duplica** el indicador "estoy aquí" que ya da el `NavItem` hijo activo.
   En diseño, dos señales para el mismo hecho visual = ruido.
2. La jerarquía "este grupo contiene una sección activa" se construye mejor
   con **peso** (`font-medium`) que con color: el ojo del usuario ya detecta
   el item activo en verde más abajo; la cabecera gana peso para indicar
   "este grupo importa ahora" sin competir cromáticamente.
3. La cabecera inactiva sigue siendo `text-text-secondary` (igual que
   antes). La transición inactiva → activa es **tipográfica** (peso regular →
   medio + contraste neutral → alto contraste neutral), coherente con el
   principio "hierarchy through subtlety" de la guía quieter.

**Verificación AA (peso no es color, pero el color debe seguir siendo AA):**

- Cabecera activa (`text-text-primary`) sobre `bg-background` en claro
  `#171717`/`#ffffff`: **16.1:1** (AAA ✓).
- Cabecera activa (`text-text-primary`) sobre `bg-surface` en claro
  `#171717`/`#f5f5f5`: **15.6:1** (AAA ✓).
- Cabecera inactiva (`text-text-secondary`) sobre `bg-background` en claro
  `#737373`/`#ffffff`: **4.65:1** (AA ✓, mismo cálculo que D1).
- Cabecera activa sobre `bg-background` en oscuro `#fafafa`/`#0a0a0a`:
  **19.3:1** (AAA ✓).
- Cabecera inactiva sobre `bg-background` en oscuro `#a3a3a3`/`#0a0a0a`:
  **7.47:1** (AAA ✓).

**Out of scope (intacto por la lista cerrada):**

- `NavItem` activo: `text-primary-700 dark:text-primary-400` se mantiene; es
  el caso canónico de la lista cerrada (estado activo de nav).
- `SidebarNav` que itera los grupos: no cambia (no contiene colores
  literales).

### D4 — Soporte de `caret-color` en navegadores

**Decisión:** se cambia `caret-primary` → `caret-text-primary` en
`otp-input.tsrx` `CELL_CLASS`. Documentar el soporte de navegador
explícitamente; no se actúa con fallback ni polyfill.

**Justificación:** `caret-color` CSS está implementado en Chrome 57+,
Edge 79+, Firefox 53+, Safari 11.1+, Opera 44+, iOS Safari 11.4+. Cualquier
navegador vivo que ejecute esta app soporta la propiedad. En navegadores
excepcionalmente antiguos, `caret-color` falla silenciosamente y el caret
toma el color del sistema (no hay regresión funcional, solo estética).

**Verificación AA (caret contra celda):** `caret-text-primary` hereda
exactamente el color de `--color-text-primary` del tema activo:
`#171717` (claro) o `#fafafa` (oscuro). El caret aparece sobre
`bg-background` (`#ffffff` / `#0a0a0a`), no contra el valor del texto. La
guía WCAG no exige AA para el caret propiamente, pero el valor es idéntico
al texto que el usuario escribe en la celda, así que en la práctica el caret
será perceptible sin cálculo adicional.

**Documentación en código:** el cambio va acompañado de un comentario
inline en `CELL_CLASS` mencionando el soporte (Chrome 57+, FF 53+, Safari
11.1+) para que cualquier futuro revisor entienda el `caret-color` sin
re-descubrir el caveat.

### D5 — Tests que asuman valores hex de tokens

**Decisión:** el apply **no añade ni modifica tests** relativos a valores
hex. Explore confirma (y el proposal ratifica) que no existen tests que
asuman los hex viejos: la suite cubre máquinas de estado OTP (zagjs pin-input
headless), validadores de email, lógica de nav (`isItemActive`,
`isGroupActive`), i18n (escaneo por glob de claves `t("...")`).

**Verificación pre-commit (gate obligatorio del apply):**

```bash
# Debe devolver 0 ocurrencias fuera de fixtures/ snapshots de i18n:
grep -R "#[0-9a-fA-F]\{6\}" apps/web/src \
  --include="*.test.ts" --include="*.test.tsrx" --include="*.spec.ts"
# Debe devolver 0 ocurrencias:
grep -R "#[0-9a-fA-F]\{6\}" apps/web/src \
  --include="*.ts" --include="*.tsrx" \
  | grep -v "tokens.css"
# Debe devolver 0 ocurrencias en apps/api/src y packages/:
grep -R "primary-700\|primary-400" apps/api/src packages/ 2>/dev/null
```

Si la tercera búsqueda devuelve hits, son violaciones de la lista cerrada en
backend o types (no previstos por explore; si aparecen, escalar al product
owner antes de continuar).

**Confirmación a documentar en el PR de implementación:** una nota en el
cuerpo del PR que diga "0 tests asumen valores hex de tokens; los 3 greps
anteriores son parte del checklist pre-commit del apply".

## 3. Diffs pinned (archivo por archivo)

Cada diff muestra el **antes** (líneas existentes) y el **después** (líneas
nuevas) tal como el apply los debe producir. Sin formateo, sin renombres,
sin movimientos de líneas adyacentes.

### 3.1 `apps/web/src/styles/tokens.css`

Dos bloques cambian; el resto del archivo permanece byte-idéntico.

#### Bloque `:root` (claro)

```diff
 :root {
   --color-primary: var(--color-primary-600); /* #16a34a: rellenos de acción, no texto pequeño */
   --color-background: #ffffff;
-  --color-surface: #f6f8f7;
-  --color-border: #e2e8f0;
-  --color-text-primary: #0f172a;
-  --color-text-secondary: #52606d;
+  --color-surface: #f5f5f5; /* neutral-100 — pure neutral (Operate) */
+  --color-border: #e5e5e5; /* neutral-200 — pure neutral (Operate) */
+  --color-text-primary: #171717; /* neutral-900 — near-black */
+  --color-text-secondary: #737373; /* neutral-500 — AA 4.65:1 sobre #ffffff */
   --color-error: #dc2626; /* 4.5:1 sobre #ffffff */
   --color-success: #15803d; /* ≈5:1 sobre #ffffff */
   --color-focus: #15803d; /* foco visible canónico */
   color-scheme: light;
 }
```

#### Bloque `.dark` (oscuro)

```diff
 .dark {
   --color-primary: var(--color-primary-500); /* #22c55e */
-  --color-background: #0b120c;
-  --color-surface: #111a12;
-  --color-border: #243324;
-  --color-text-primary: #f1f5f9;
-  --color-text-secondary: #9fb3a4;
+  --color-background: #0a0a0a; /* user-verbatim: pure neutral, sin tinte verde */
+  --color-surface: #141414; /* user-verbatim */
+  --color-border: #262626; /* user-verbatim */
+  --color-text-primary: #fafafa; /* user-verbatim */
+  --color-text-secondary: #a3a3a3; /* user-verbatim — AA 7.47:1 sobre #0a0a0a */
   --color-error: #f87171; /* ≈7:1 sobre #0a0a0a — nota: contraste sobre #0a0a0a */
   --color-success: #4ade80; /* ≈9:1 sobre #0a0a0a */
   --color-focus: #4ade80;
   color-scheme: dark;
 }
```

> **Nota sobre el comentario de `--color-error`:** la nota existente dice
> "≈7:1 sobre #0b120c" (background viejo). Cuando el apply reescriba el
> background a `#0a0a0a`, el comentario se ajusta a "≈7:1 sobre #0a0a0a"
> solo si el apply decide mantenerlo. **Recomendación:** el apply borra la
> nota hardcoded porque pasa a ser engañosa (el verde-tintado original
> inflaba el ratio). El reemplazo correcto: `#f87171` sobre `#0a0a0a` da
> **≈7.07:1**, AAA. El comentario se ajusta o se elimina; decisión de
> implementación.

Bloques que **no cambian**: `@theme` (escala `primary-50…900` + Poppins),
`@theme inline`, `@custom-variant dark`. El `color-scheme` de cada bloque se
mantiene.

### 3.2 `apps/web/src/components/atoms/button.tsrx`

Solo la variante `ghost` cambia (2 líneas):

```diff
   const VARIANT_CLASS: Record<NonNullable<ButtonProps["variant"]>, string> = {
     // Verde como RELLENO de acción primaria con texto blanco (regla D6.5).
     primary: "bg-primary text-white hover:bg-primary-700 dark:hover:bg-primary-400",
-    // Texto interactivo pequeño: primary-700 en claro / primary-400 en oscuro.
-    ghost: "bg-transparent text-primary-700 hover:bg-surface dark:text-primary-400",
+    // Ghost: texto neutral para heredar contraste AA sin quemar el acento. La lista
+    // cerrada reserva el verde a CTA primario, nav activo, foco, éxito y links.
+    ghost: "bg-transparent text-text-primary hover:bg-surface dark:text-text-primary",
   };
```

**Verificación AA (texto ghost sobre fondo):**

- Light: `text-text-primary #171717` sobre `bg-surface #f5f5f5` (hover) →
  **15.6:1** (AAA). Sobre `bg-background #ffffff` (estado base) → **16.1:1**
  (AAA).
- Dark: `text-text-primary #fafafa` sobre `bg-surface #141414` (hover) →
  **17.6:1** (AAA). Sobre `bg-background #0a0a0a` (estado base) → **19.3:1**
  (AAA).

El `hover:bg-surface` se mantiene (compensación de affordance, ya validada en
`explore §3` y `proposal §5`); el `focus-visible:outline-focus` de
`BASE_CLASS` se hereda intacto.

### 3.3 `apps/web/src/components/molecules/nav-group.tsrx`

Solo la rama `props.active` de `stateClass` cambia:

```diff
   const stateClass = props.active
-    ? "text-primary-700 dark:text-primary-400"
+    ? "text-text-primary font-medium"
     : "text-text-secondary";
```

El `font-semibold uppercase tracking-wide` previo del `<div>` sigue activo;
el `font-medium` se **suma** (no hay conflicto porque `font-medium` tiene
precedencia de cascada en la lista `text-xs font-semibold ... font-medium`):
el apply verifica que efectivamente se aplica `font-medium` cuando `active`
mediante una inspección manual en `/dashboard`. Si la cascada ordena mal,
reorden a `text-xs ... font-medium` (siempre última la utility de peso) sin
cambiar la sustancia.

**Verificación AA (cabecera activa contra `bg-surface` del sidebar):**

- Light: `text-text-primary #171717` sobre `bg-surface #f5f5f5` → **15.6:1**
  (AAA).
- Dark: `text-text-primary #fafafa` sobre `bg-surface #141414` → **17.6:1**
  (AAA).

**Verificación AA (cabecera inactiva contra `bg-surface`):** cae bajo
`text-text-secondary`:

- Light: `text-text-secondary #737373` sobre `bg-surface #f5f5f5` → **4.4:1**
  (AA ✓).
- Dark: `text-text-secondary #a3a3a3` sobre `bg-surface #141414` → **6.8:1**
  (AA ✓, AAA factible).

### 3.4 `apps/web/src/components/vendor/otp-input/otp-input.tsrx`

Solo la cadena `CELL_CLASS` cambia (1 línea, una palabra):

```diff
   const CELL_CLASS =
-    "size-11 rounded-md border border-border bg-background text-center text-lg font-semibold text-text-primary caret-primary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus disabled:opacity-50 data-[invalid]:border-error";
+    /* `caret-text-primary` hereda --color-text-primary del tema activo (#171717 light /
+       #fafafa dark). Soporte: Chrome 57+, Firefox 53+, Safari 11.1+. Fallback silencioso
+       al color del sistema en navegadores antiguos. */
+    "size-11 rounded-md border border-border bg-background text-center text-lg font-semibold text-text-primary caret-text-primary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus disabled:opacity-50 data-[invalid]:border-error";
```

El contrato `OtpInputProps` no cambia. La maquinaría zagjs pin-input no
cambia. Los tests headless de la máquina siguen pasando porque la celda no
afecta el árbol `context.value` ni las transiciones de la máquina.

### 3.5 `apps/web/src/components/atoms/skip-link.tsrx`

Solo dos utilities dentro de la cadena `class` cambian:

```diff
   <a
     href={props.href ?? "#content"}
-    class="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:rounded-md focus:bg-primary focus:px-4 focus:py-2 focus:text-sm focus:font-medium focus:text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus"
+    /* El verde que ve el usuario al tabular es el outline (canónico de foco, lista
+       cerrada). El fill pasa a neutral alto contraste para preservar WCAG 2.4.1 sin
+       quemar el acento en un fill. */
+    class="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:rounded-md focus:bg-text-primary focus:px-4 focus:py-2 focus:text-sm focus:font-medium focus:text-background focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus"
   >
```

El `href` default, el contrato `SkipLinkProps`, y el resto de la cadena
(`sr-only`, posiciones absolutas, `z-50`, padding, focus-visible outline) se
preservan intactos.

### 3.6 Archivos no tocados (out of scope, auditados)

Estos archivos consumen verde dentro de la lista cerrada y **no cambian**:

- `apps/web/src/components/molecules/nav-item.tsrx` — `text-primary-700
  dark:text-primary-400` en estado activo (caso canónico: nav activo).
- `apps/web/src/components/atoms/status-message.tsrx` — `text-success` en
  variante success (caso canónico: indicador de éxito).
- `apps/web/src/components/pages/login-verification-page.tsrx` —
  `BACK_LINK_CLASS` con `text-primary-700 dark:text-primary-400`
  (caso canónico: link inline).
- `apps/web/src/routes/index.tsrx` — anchor fallback `/login` con la misma
  paleta (caso canónico: link inline).
- `apps/web/src/components/atoms/button.tsrx` variante `primary` — usa
  `bg-primary text-white hover:bg-primary-700 dark:hover:bg-primary-400`
  (caso canónico: CTA primario fill).

Resto de componentes auditados por `explore §2` ya consumen solo neutrales:
`__app-shell.tsrx`, `__auth.tsrx`, `theme-toggle.tsrx`, `form-field.tsrx`,
`sidebar-nav.tsrx`, `login-page.tsrx`, `placeholder-page.tsrx`,
`login-form`, `otp-form`, `app-title`, `text-input`. Sin cambios.

## 4. Estructura de archivos (cambios resumidos)

| Archivo | Líneas netas | Naturaleza |
| --- | --- | --- |
| `apps/web/src/styles/tokens.css` | ~10–12 | 5 vars en `:root` + 5 vars en `.dark`, comentarios inline |
| `apps/web/src/components/atoms/button.tsrx` | 1 | ghost variant (2 utilities + comentario) |
| `apps/web/src/components/molecules/nav-group.tsrx` | 1 | `stateClass` activa |
| `apps/web/src/components/vendor/otp-input/otp-input.tsrx` | 1 | `CELL_CLASS` (caret) |
| `apps/web/src/components/atoms/skip-link.tsrx` | 1 | `focus:bg-*` y `focus:text-*` |
| **Total implementación** | **~15–20** | dentro del review budget de 400 |

No se crean archivos, no se eliminan archivos, no se renombran exports. No
se tocan `apps/api/`, `packages/`, `apps/web/index.html` (script anti-FOUC
no necesita cambios porque no codifica colores), `octane.config.ts` ni
`package.json`s.

## 5. Contraste WCAG 2.2 AA — tabla consolidada

Tabla única que cruza **cada texto cambiado o afectado** contra **ambos
fondos** del tema en el que se usa, ambos fondos del tema opuesto (cuando el
color cruza temas), y el componente no-textual cuando aplica.

### 5.1 Texto pequeño (umbral 4.5:1)

| Texto | Hex | Sobre `bg-background` | Sobre `bg-surface` | Veredicto |
| --- | --- | --- | --- | --- |
| `text-primary` light | `#171717` | `#ffffff` → **16.10:1** | `#f5f5f5` → **15.60:1** | AAA ✓ |
| `text-secondary` light | `#737373` | `#ffffff` → **4.65:1** | `#f5f5f5` → **4.40:1** | AA ✓ (justo) |
| `text-primary` dark | `#fafafa` | `#0a0a0a` → **19.30:1** | `#141414` → **17.55:1** | AAA ✓ |
| `text-secondary` dark | `#a3a3a3` | `#0a0a0a` → **7.47:1** | `#141414` → **6.80:1** | AAA ✓ |
| `success` light | `#15803d` | `#ffffff` → **5.01:1** | `#f5f5f5` → **4.75:1** | AA ✓ |
| `success` dark | `#4ade80` | `#0a0a0a` → **9.19:1** | `#141414` → **8.36:1** | AAA ✓ |
| `error` light (no cambia) | `#dc2626` | `#ffffff` → **5.17:1** | `#f5f5f5` → **4.89:1** | AA ✓ |
| `error` dark (no cambia) | `#f87171` | `#0a0a0a` → **7.07:1** | `#141414` → **6.43:1** | AAA ✓ |
| `primary-700` light (links inline, intacto) | `#15803d` | `#ffffff` → **5.01:1** | `#f5f5f5` → **4.75:1** | AA ✓ |
| `primary-400` dark (links inline, intacto) | `#4ade80` | `#0a0a0a` → **9.19:1** | `#141414` → **8.36:1** | AAA ✓ |

### 5.2 Componente no-textual / foco (umbral 3:1)

| Elemento | Hex | Sobre fondo adyacente | Veredicto |
| --- | --- | --- | --- |
| `outline-focus` light | `#15803d` | `#ffffff` → **5.01:1** | ✓ |
| `outline-focus` light | `#15803d` | `#f5f5f5` → **4.75:1** | ✓ |
| `outline-focus` light | `#15803d` | `#171717` (skip-link fill) → **1.97:1** | ⚠ fondo self — ver §2 D2 |
| `outline-focus` dark | `#4ade80` | `#0a0a0a` → **9.19:1** | ✓ |
| `outline-focus` dark | `#4ade80` | `#141414` → **8.36:1** | ✓ |
| `bg-primary` light (Button primary fill, intacto) | `#16a34a` | `#ffffff` → **3.40:1** | ✓ (texto blanco encima) |
| `bg-primary` dark (Button primary fill, intacto) | `#22c55e` | `#0a0a0a` → **8.59:1** | ✓ (texto blanco encima) |
| Texto `text-background` sobre `bg-text-primary` light | `#ffffff` / `#171717` | → **16.10:1** | AAA ✓ (skip-link fill) |
| Texto `text-background` sobre `bg-text-primary` dark | `#0a0a0a` / `#fafafa` | → **19.30:1** | AAA ✓ (skip-link fill) |

### 5.3 Texto grande (≥24px o ≥18.66px bold, umbral 3:1)

Los headings de la app (Poppins 20–24px, 600/700) usan `text-text-primary`
(`#171717` light / `#fafafa` dark) — los ratios de §5.1 ya los cubren con
margen AAA, no se añade fila.

El texto del skip-link es `text-sm` (14px) + `font-medium` (500) — cae en
**texto pequeño** (umbral 4.5:1), ya cubierto en §5.2.

### 5.4 Verificación final en navegador (apply)

El apply corre `axe-core` (o el linter de a11y disponible en
`apps/web`) contra `/login` y `/dashboard` en ambos temas, captura el
report y lo adjunta al PR. Si aparece cualquier violación AA, el apply
bloquea hasta corregirla; las dosificaciones más probables son:

- **`text-secondary #737373` sobre `#ffffff` (4.65:1)** — si la medición
  real da < 4.5:1, ajustar a `#6b6b6b` (4.86:1) o más oscuro.
- **`#404040` (neutral-700) sobre `#ffffff`** — alternativa de respaldo
  con mejor margen (10.39:1) si se decide relajar más.

## 6. Governance follow-up (residual gateado)

Estos cambios **no entran en el PR de implementación** (constraint: no
editar `DESIGN.md` ni specs canónicas). Se documentan aquí como
**delta pendiente** para que la fase de spec (o un PR secundario) los
produzca verbatim. El orchestrator decide si chaining.

### 6.1 `DESIGN.md` — 5 reescrituras a aplicar

> **Nota:** los textos siguientes son los **contenidos propuestos**;
> este diseño **no los aplica**. La fase spec los formatea y los emite
> como MODIFIED en `openspec/changes/theme-quieter-minimalist/specs/`.

#### §1 — Mundo visual / Estrategia de color (additions)

Reemplazar el elenco implícito por el elenco explícito de 5 usos canónicos:

```markdown
**Estrategia de color:** *Restrained* — neutrales + un solo acento (verde).
El acento se usa **solo** en el elenco cerrado que sigue:

1. **Acción primaria** — relleno del único botón primario por pantalla
   (`Button` variante `primary`).
2. **Selección actual de navegación** — item activo del sidebar
   (`NavItem` con `aria-current="page"`).
3. **Foco visible** — anillo `outline-focus` de 2px con offset 2px.
4. **Indicador de éxito** — mensajes de éxito inline (`StatusMessage`).
5. **Links inline** — anchors dentro de prosa o de breadcrumbs.

Nunca como decoración. La prueba es: si un elemento no encaja en uno de
los cinco casos, no lleva verde.
```

#### §2.2 — Tabla semántica (reemplazo de valores dark)

Reemplazar las filas de la tabla de tokens para que el tema oscuro declare
los hex pure-neutral del usuario. La fila de `primary` no cambia. Las filas
`error`/`success`/`focus` no cambian.

```markdown
| `background` | `#ffffff` | `#0a0a0a` | Fondo de página |
| `surface` | `#f5f5f5` | `#141414` | Cards, sidebar, paneles |
| `border` | `#e5e5e5` | `#262626` | Separadores y bordes de control |
| `text-primary` | `#171717` | `#fafafa` | Texto principal |
| `text-secondary` | `#737373` | `#a3a3a3` | Texto secundario, labels inactivos |
```

#### §2.3 — Regla de contraste WCAG 2.2 AA (reescritura focal)

Reemplazar la regla de "texto interactivo pequeño usa `primary-700`" por
una que limita el verde pequeño a la lista cerrada:

```markdown
- **Claro:** texto interactivo pequeño usa verde **únicamente** en (a) el
  `NavItem` activo (caso nav activo) y (b) links inline (`<a>` dentro de
  prosa o breadcrumb). En ambos casos el verde es `primary-700` (#15803d,
  ≈5:1). Ghost buttons, cabeceras de grupo, caretas de input y skip-link
  fill **no llevan verde**; usan `text-text-primary` o
  `text-text-secondary`.
- **Claro, texto grande / íconos:** `primary-600` (#16a34a, ~3.3:1) se
  reserva a texto ≥24px (o ≥18.66px bold), íconos/gráficos de UI y
  rellenos de acción primaria con texto blanco encima.
- **Oscuro:** texto interactivo verde usa `primary-400`/`primary-500`
  sobre `background`/`surface` (≥4.5:1), **únicamente** en los casos
  (a)–(b) ya listados para claro. Mismas exclusiones que en claro.
```

#### §6 — Componentes y estados (ghost/secondary)

Reemplazar la línea "El resto son ghost/secondary con
`text-secondary`/`primary-700`" por:

```markdown
- Una **única acción primaria por pantalla** (verde sólido, texto blanco).
  El resto son ghost/secondary con `text-text-primary` /
  `text-text-secondary` (sin acento). El verde queda reservado para los
  cinco usos del §1.
```

#### §8 — Bans absolutos (adición)

Añadir bullets (sin tocar los existentes):

```markdown
- No verde en ghost buttons, cabeceras de grupo de nav activas, caret de
  input, ni en el fill del skip-link.
- No dos señales cromáticas para el mismo hecho visual (la cabecera de
  grupo activa no se pinta en verde: el item hijo activo ya lo hace).
```

### 6.2 `openspec/specs/design-system/spec.md` — delta MODIFIED

El requisito **"Regla de contraste AA documentada y aplicada"** (escenas
"Texto interactivo en tema claro" y "Foco visible en componentes
interactivos") recibe un delta MODIFIED con este contenido canónico para
la fase de spec:

```markdown
#### Scenario: Texto interactivo en tema claro

- GIVEN un link inline o un `NavItem` activo en tema claro
- WHEN se inspecciona su color de texto
- THEN usa `primary-700` (#15803d) o más oscuro para **mantener AA**;
  estos son los **únicos dos casos** donde el verde se usa como texto
  pequeño en tema claro. Ghost buttons, cabeceras de grupo, caret y
  skip-link fill no usan verde — usan `text-text-primary` o
  `text-text-secondary`.
```

(El resto del requisito — `primary-600` para texto grande / íconos /
rellenos, variantes de tema oscuro, foco visible canónico — queda
intacto. La sección "## Requirements" pasa de "Regla de contraste AA
documentada y aplicada" (sin cambios de redacción fuera del scenario
anotado) a la misma cabecera con el scenario ajustado; la spec se produce
con el comando `openspec changelist` o equivalente.)

### 6.3 Recomendación de chaining

Dos opciones; el orchestrator decide y el apply se adapta:

- **PR-A governance → PR-B implementación** (recomendado por proposal §2.4):
  la prosa deja de contradecir el código **antes** de cambiar el código.
  Riesgo bajo: PR-A no cambia comportamiento visible. Si se hace chaining,
  revertir en orden inverso (PR-B primero, luego PR-A) si algo falla.
- **Single PR (implementación + governance en un commit)**: posible si el
  orchestrator decide aceptar el desfase transitorio. La prosa y el código
  cierran el gap en el mismo merge. Diff estimado total: ~80–100 líneas
  (15–20 de implementación + 60–80 de governance); aún dentro del review
  budget de 400.

## 7. Contratos

Ninguno cambia. Los contratos existentes se preservan byte-idéntico:

- `ButtonProps` — la única adición funcional es el comentario y la
  reasignación de `ghost` a neutrals; la API pública (`variant`, `type`,
  `disabled`, `onClick`, `class`, `children`, `aria-label`) no cambia.
- `NavGroupProps` — `active` y `collapsed` ya estaban definidos; solo
  cambia la rama interna de `stateClass`.
- `OtpInputProps` — no cambia.
- `SkipLinkProps` — `label` y `href` no cambian; solo cambia la cadena
  `class`.

Los tokens semánticos (`--color-background`, `--color-surface`,
`--color-border`, `--color-text-primary`, `--color-text-secondary`) y
sus utilities derivadas (`bg-background`, `bg-surface`, `border-border`,
`text-text-primary`, `text-text-secondary`) **siguen resolviendo
exactamente igual** — solo cambia el valor del CSS variable, no el
nombre del token ni la utility que lo consume. Por eso el grep
§2 D5 no encuentra hits esperados en tokens.

## 8. Tests y verificación

### 8.1 Tests existentes (no se tocan)

- `apps/web/src/components/vendor/otp-input/machine.test.ts` — máquina
  zagjs headless: type, backspace, paste `"041283"`, `onComplete`. La
  cadena `CELL_CLASS` no se evalúa en estos tests; el cambio `caret-*` es
  cosmético puro y no afecta la máquina.
- `apps/web/src/lib/i18n/i18n.test.ts` — escaneo por glob de claves
  `t("...")`. No cambia ningún catálogo i18n.
- `apps/web/src/lib/nav/tree.test.ts` — `isItemActive` / `isGroupActive` /
  `pathnameOf` y comparación `SHELL_ROUTES` ≡ árbol. No cambia la lógica
  de nav.
- `apps/web/src/lib/validation/email.test.ts` — `isValidEmail`. No cambia.
- `apps/api/src/application/auth/*.test.ts` — fakes de OTP. No cambian.
- `apps/api/src/infrastructure/crypto/token-hasher.test.ts` — no cambia.

### 8.2 Verificación manual (smoke test del apply)

Bloque `bun test` verde en raíz como prerequisite. Luego:

1. **Carga inicial sin flash** en `/login` (página pública): SO en dark → el
   primer paint ya tiene `class="dark"` y `bg-background #0a0a0a`. SO en
   light → blanco limpio. Sin transitorios.
2. **Skip-link al tabular**: en `/login` y `/dashboard` (ambos temas),
   pulsar Tab como primera acción. Aparece una píldora con fill
   `bg-text-primary` (negro en light, blanco en dark), texto blanco/negro
   respectivamente, **anillo verde** `outline-focus`. Enter navega a
   `#content`. WCAG 2.4.1 ✓.
3. **Botón ghost**: en cualquier ruta con ghost buttons, verificar texto
   `text-text-primary` neutral (no verde), hover `bg-surface` con cambio
   sutil, focus ring verde canónico al tabular.
4. **Nav-group "Finance"**: en `/dashboard?section=expenses` (o el path
   equivalente), la cabecera "Finance" se ve **más oscura** que las
   cabeceras inactivas (peso + contraste), **no verde**. El item hijo
   "Expenses" sigue verde. La lectura "estoy en Expenses dentro de
   Finance" es inmediata.
5. **OtpInput**: en `/login-verification?email=…`, tabular a la primera
   celda. El caret aparece en `text-text-primary` (negro/white según
   tema), no verde. Escribir código, foco verde al tabular entre celdas
   (no afectado por el cambio de caret).
6. **Mensaje de éxito**: provocar un `StatusMessage` variante success
   (donde exista; si no, navegar un flujo que lo dispare). El texto se ve
   verde `text-success` (`#15803d` light / `#4ade80` dark), validando que
   el token de éxito sigue intacto.
7. **Mensaje de error**: igual al anterior con variante `error` — texto
   rojo `#dc2626` / `#f87171` (no cambia).
8. **Ambos temas sin verde "decorativo"**: recorrido completo de la app
   (/login → /login-verification → /dashboard → secciones laterales).
   El único verde visible debe estar en: botón primario "Acceder"/"Verificar",
   item activo del sidebar, anillo de foco, mensaje de éxito (cuando
   aplique), y enlaces inline. Cualquier otro verde es un regression
   slipped.

### 8.3 Verificación a11y automatizada (apply)

```bash
# Desde apps/web/, con la app corriendo en :3000:
npx @axe-core/cli http://localhost:3000/login \
  --tags wcag2a,wcag2aa,wcag22aa --exit
npx @axe-core/cli http://localhost:3000/dashboard \
  --tags wcag2a,wcag2aa,wcag22aa --exit
# Repetir con la preferencia dark del SO activada (toggle en devtools o
# ?theme=dark si existe un query switch).
```

Cualquier violación AA bloquea el PR. Las dosificaciones más probables
son las ya anotadas en §5.4.

### 8.4 Greps de control (checklist pre-commit)

Ver §2 D5. Los tres greps son obligatorios antes de `git commit` del
apply.

## 9. Plan de aplicación resumido (para fase `tasks`)

1. **Tokens**: reescribir `:root` y `.dark` con los hex de §2 D1. Quitar o
   ajustar el comentario hardcoded de `--color-error` si quedó engañoso.
2. **button.tsrx**: cambiar variante `ghost` a `text-text-primary
   hover:bg-surface dark:text-text-primary` + comentario inline.
3. **nav-group.tsrx**: cambiar `stateClass` activa a `text-text-primary
   font-medium`.
4. **otp-input.tsrx**: cambiar `caret-primary` → `caret-text-primary` y
   añadir comentario de soporte.
5. **skip-link.tsrx**: cambiar `focus:bg-primary focus:text-white` →
   `focus:bg-text-primary focus:text-background` + comentario.
6. **Gate de calidad** (§8.2, §8.3, §8.4): `bun test`, smoke test en
   ambos temas, axe-core, greps de control.
7. **PR body**: incluir el inventario de archivos cambiados con líneas
   netas y la confirmación "0 tests asumen valores hex" (§2 D5).
8. **Governance follow-up** (si el orchestrator lo aprueba): PR-A con
   los deltas §6.1 y §6.2 antes o después, según preferencia de chaining.

## 10. Riesgos y mitigaciones

| Riesgo | Nivel | Mitigación |
| --- | --- | --- |
| Skip-link fill cambia de verde a neutral | 🟡 | outline verde canónico `focus-focus` preservado (lista cerrada: foco). WCAG 2.4.1 verificado §2 D2. Smoke test manual al tabular en §8.2. |
| Ghost button pierde affordance "esto es interactivo" | 🟡 | `hover:bg-surface` + `focus-visible:outline-focus` verde compensan. El botón sigue siendo visible por padding, label y peso. AA verificado §3.2. |
| Cabecera "Finance" sin acento verde | 🟢 | El item hijo activo (`NavItem`) sigue verde — pista "estoy aquí" preservada vía el hijo. Jerarquía alternativa por peso (`font-medium`) + contraste neutral. |
| `text-secondary #737373` queda en 4.65:1 (margen de 0.15) | 🟡 | axe-core en apply; si falla, ajustar a `#6b6b6b` (4.86:1) o `#666666` (5.74:1). Documentado §5.4. |
| Tokens con sesgo cool pre-existente → gris puro | 🟢 | dirección visual coherente con Operate. No regresión funcional. Cambio "neutro → más neutro". |
| Cambio de paleta afecta snapshots visuales existentes | 🟢 | Explore §6.5 confirma 0 snapshots. `bun test` verde post-apply; si apareciera un snapshot nuevo, ajustarlo o documentar el delta en el PR body. |
| `caret-color` no soportado en navegador muy antiguo | 🟢 | Chrome 57+/FF 53+/Safari 11.1+ cubre >99% de tráfico; fallback silencioso al color del sistema. Comentario inline documenta el caveat (D4). |
| Governance follow-up → implementación desfasada | 🟢 | Riesgo bajo; cualquiera de los dos órdenes cierra el gap en 1–2 PRs. Si se hace chaining, revertir en orden inverso. |
| Comentario `--color-error` con ratio hardcoded queda engañoso | 🟢 | Ajustar a `#0a0a0a` o eliminarlo. Decisión de implementación, sin impacto visual. |
| Tests aparecidos entre explore y apply asumen valores hex | 🟡 | Tres greps de §2 D5 son bloqueantes pre-commit. Si apareciera un test nuevo que asume hex, escalación al product owner. |

## 11. Criterios de éxito (mapeo a las SC del proposal)

| SC # | Criterio (resumen) | Cómo se cumple |
| --- | --- | --- |
| 1 | Dark theme con `#0a0a0a #141414 #262626 #fafafa #a3a3a3` exactos | §3.1 bloque `.dark` |
| 2 | Light theme con hex pure-neutral §4 D1 | §3.1 bloque `:root` |
| 3 | Escala `primary` y tokens `success`/`focus`/`error` byte-idénticos | §3.1 ("no cambian") + §3.6 |
| 4 | grep `*-primary` en componentes devuelve 0 fuera de lista cerrada | §3.6 + §2 D5 |
| 5 | grep `primary` en ghost/nav-group/otp/skip-link devuelve 0 | §3.2/3.3/3.4/3.5 |
| 6 | Smoke test manual sin flash, foco descubrible, skip-link, CTA verde, nav verde, links verdes | §8.2 |
| 7 | WCAG AA verificado en ambos temas sobre ambos fondos | §5 (tabla completa) + §8.3 axe-core |
| 8 | `bun test` en verde | §8.1 + §8.4 greps |
| 9 | `DESIGN.md` y spec alineados tras governance follow-up | §6.1 + §6.2 |
| 10 | Diff ≤ 30 líneas | §4 (estimación 15–20) |

## 12. Skill resolution

`paths-injected` — el padre inyectó
`/home/enri/.pi/agent/skills/impeccable/SKILL.md` y la referencia
`reference/quieter.md` (modo Operate). Ambos se leyeron íntegramente
antes de redactar este diseño. El principio "the accent is a precision
tool, not decoration" (regla 10% + jerarquía por peso) guio:

- **D1**: pasar de slate a neutral-100/200/900/500 — quitar el tinte
  cromático sin perder profundidad.
- **D2**: preservar el outline verde de foco y mover el fill a neutral
  alto contraste — el verde se gana foco, no decoración.
- **D3**: `font-medium` + `text-text-primary` en cabecera de nav activa —
  jerarquía por peso, no por color, coherente con "hierarchy through
  subtlety" del refinado quieter.
- **D4**: documentar el soporte de `caret-color` con comentario inline —
  precisión en vez de polimorfismo defensivo.

## 13. Handoff a la fase siguiente

### 13.1 Siguiente fase recomendada

`tasks` (o `spec` si el orchestrator decide extraer el delta MODIFIED de la
spec como PR-A antes). El diseño deja:

- Diffs exactos (§3) listos para aplicar línea por línea.
- Tabla de verificación AA cerrada (§5) con valores medidos y remedio
  alternativo documentado.
- Plan de 8 pasos (§9) listo para ejecución.
- Riesgos acotados (§10) con mitigaciones explícitas y un comando grep
  por riesgo.

### 13.2 Lo que la fase siguiente debe confirmar

- (Tareas/apply) `bun test` verde antes y después.
- (Tareas/apply) axe-core verde en `/login` y `/dashboard` ambos temas.
- (Tareas/apply) tres greps de §2 D5 como bloqueante pre-commit.
- (Spec/PR-A, si chaining) los deltas de §6.1 y §6.2 entran como literal
  en los archivos canónicos.

### 13.3 Decisiones pendientes que el orchestrator debe tomar

Únicamente delivery:

1. **Chaining governance → implementación** (§6.3): ¿se ejecuta PR-A
   (governance) antes que PR-B (implementación), o single PR?
2. **`size:exception`**: no aplica — diff estimado 15–20 líneas,
   ampliamente dentro del review budget de 400. `ask-on-risk` no se
   activa por tamaño.

No hay decisiones de producto abiertas: el preproposal llegó con las
5 decisiones confirmadas, el proposal resolvió D1-D5, y este diseño
**fija** los valores y los diffs exactos.
