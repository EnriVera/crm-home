# Explore — theme-quieter-minimalist

> Fase explore (read-only) del change SDD `theme-quieter-minimalist`.
> Intención de producto: bajar la intensidad visual del CRM-HOME para que la
> app se sienta minimalista y predominantemente neutral. Verde reservado a una
> **lista cerrada de usos**: (1) botón CTA primario, (2) estado activo de nav,
> (3) anillo de foco, (4) indicadores de éxito, (5) links inline. Todo lo demás
> debe ser neutral puro (grises / blancos / negros) tanto en claro como en
> oscuro. Tema oscuro **sin tintes verdes** — bg `#0a0a0a`, surface `#141414`,
> border `#262626`, text-primary `#fafafa`, text-secondary `#a3a3a3`. Tema claro
> también neutro puro donde sea posible.
> Modo (per impeccable skill): **Operate**. La herramienta debe desaparecer
> dentro de la tarea; menos color, menos motion, cards más planas. El acento es
> una herramienta de precisión, no decoración.

## 1. Estado actual del sistema visual

### 1.1 Lo que la auditoría encuentra hoy

- **Escala primaria** `primary-50…900` declarada en `apps/web/src/styles/tokens.css`
  (líneas 16–25) — fuente del acento. Se mantiene tal cual (origen del acento),
  pero los tokens semánticos que la exponen deben recortarse drásticamente.
- **Tema oscuro actual** está **tintado de verde**: los neutrales (`background
  #0b120c`, `surface #111a12`, `border #243324`, `text-secondary #9fb3a4`)
  tienen G > R, G ≥ B → dominante verde, no neutros. Es la fractura principal
  entre `DESIGN.md` §1 ("neutrales + un solo acento verde") y la
  implementación.
- **Componentes consumen verde fuera de la lista cerrada**: ghost button
  (`text-primary-700/400`), cabeceras de grupo de nav activas
  (`text-primary-700/400`), careta de OTP (`caret-primary`). Son tres usos
  puntuales pero violan la regla del producto.
- **`DESIGN.md` §6 contradice el recorte**: hoy dice "el resto son ghost/
  secondary con `text-secondary`/`primary-700`" — bajo la nueva regla, los
  ghost NO son CTA primario y por tanto NO deben llevar verde.
- **`DESIGN.md` §2.3 (contraste WCAG) asume texto interactivo pequeño en
  `primary-700`/`primary-400` general** — la regla nueva solo lo permite en
  links (cerrado), no en ghost buttons. La política de contraste debe
  reescribirse: verde solo permitido en (a) rellenos de CTA con texto blanco
  encima, (b) links inline, (c) estado activo de nav (que ya exige
  `primary-700`/`primary-400` por contraste), (d) foco, (e) éxito.

### 1.2 Inventario de archivos tocados (verificado en disco)

- `apps/web/src/styles/tokens.css` — única fuente de verdad visual; hay que
  reescribir `:root` y `.dark`, mantener la escala primaria intacta.
- `apps/web/src/components/atoms/button.tsrx` — variante `ghost` usa verde;
  la variante `primary` es el caso válido.
- `apps/web/src/components/atoms/skip-link.tsrx` — el fill on focus usa
  `bg-primary` (borderline: el skip-link es CTA-like por a11y; evaluar).
- `apps/web/src/components/molecules/nav-item.tsrx` — uso correcto
  (estado activo de nav).
- `apps/web/src/components/molecules/nav-group.tsrx` — la cabecera del grupo
  se pinta verde cuando hay hijo activo; debatable.
- `apps/web/src/components/vendor/otp-input/otp-input.tsrx` — `caret-primary`
  fuera de la lista cerrada.
- `apps/web/src/components/pages/login-verification-page.tsrx` — link a
  `/login` usa verde (válido: links inline).
- `apps/web/src/routes/index.tsrx` — link fallback a `/login` usa verde
  (válido: link inline).
- `DESIGN.md` §1, §2.2, §2.3, §6, §8 — varias afirmaciones textuales
  entran en conflicto con la regla nueva; necesita reescritura.

Resto de la app (`__app-shell.tsrx`, `__auth.tsrx`, `theme-toggle.tsrx`,
`form-field.tsrx`, `sidebar-nav.tsrx`, `login-page.tsrx`, `placeholder-page.tsrx`)
**ya consume solo neutrales** y no necesita cambios. Esto es importante: la
cirugía está acotada a un número muy pequeño de archivos.

## 2. Auditoría del verde en `apps/web/src/` (per-file counts)

Conteos por archivo (clases `bg-primary|text-primary|border-primary|
ring-primary|outline-primary|from-primary|to-primary|via-primary|
divide-primary|placeholder-primary|accent-primary|decoration-primary|
shadow-primary|bg-success|text-success|border-success` + referencias
directas a `primary-50…900`):

| Archivo | Ocurrencias | Detalle (clase → sitio) | Cumple lista cerrada? |
| --- | --- | --- | --- |
| `styles/tokens.css` | 11 (escala) + 6 (semánticos) | `--color-primary-{50..900}` (definición de escala), `--color-primary`, `--color-success`, `--color-focus` en `:root`/`.dark` | n/a (definiciones; `.dark` verde-tintado → **violación**) |
| `styles/main.css` | 0 (verde) / 1 (`text-text-primary` neutral) | n/a | ✓ |
| `routes/__app-shell.tsrx` | 0 | n/a (solo `bg-border`, `bg-text-secondary` para separator) | ✓ |
| `routes/__auth.tsrx` | 0 | n/a (solo neutral) | ✓ |
| `routes/index.tsrx` | 2 (línea 16) | `text-primary-700 dark:text-primary-400` en anchor fallback `/login` | ✓ link inline |
| `components/atoms/button.tsrx` | 2 (líneas 17, 19) | `primary: "bg-primary text-white hover:bg-primary-700 dark:hover:bg-primary-400"`; `ghost: "bg-transparent text-primary-700 hover:bg-surface dark:text-primary-400"` | parcial: primary ✓; **ghost ✗** (no es CTA, no es link, no es nav, no es foco, no es éxito) |
| `components/atoms/skip-link.tsrx` | 1 (línea 15) | `focus:bg-primary focus:text-white` cuando recibe foco | borderline: skip-link es a11y-CTA pero no es "primary CTA button" del producto — **recomendar mover a neutro** (`bg-text-primary text-background` o focus ring solo) |
| `components/atoms/text-input.tsrx` | 0 (verde) | n/a | ✓ |
| `components/atoms/status-message.tsrx` | 1 (línea 11) | `success: "text-success"` | ✓ indicador de éxito |
| `components/atoms/app-title.tsrx` | 0 | n/a | ✓ |
| `components/molecules/form-field.tsrx` | 0 | n/a | ✓ |
| `components/molecules/nav-item.tsrx` | 2 (líneas 20, 21) | activo: `text-primary-700 dark:text-primary-400`; inactivo: `text-text-secondary` | ✓ nav activo |
| `components/molecules/nav-group.tsrx` | 1 (línea 21) | cabecera activa: `text-primary-700 dark:text-primary-400` | ✗ la cabecera NO es un item activo del nav; es label decorativo que duplica el estado |
| `components/molecules/theme-toggle.tsrx` | 0 | n/a (solo neutral) | ✓ |
| `components/organisms/sidebar-nav/sidebar-nav.tsrx` | 0 | n/a | ✓ |
| `components/organisms/login-form/login-form.tsrx` | 0 | n/a | ✓ |
| `components/organisms/otp-form/otp-form.tsrx` | 0 | n/a | ✓ |
| `components/pages/login-page.tsrx` | 0 | n/a | ✓ |
| `components/pages/login-verification-page.tsrx` | 2 (línea 17) | `BACK_LINK_CLASS = "self-start ... text-primary-700 ... dark:text-primary-400"` (link a `/login`) | ✓ link inline |
| `components/pages/placeholder-page.tsrx` | 0 | n/a | ✓ |
| `components/vendor/otp-input/otp-input.tsrx` | 1 (línea 20) | `caret-primary` en celda OTP | ✗ la careta del input no está en la lista cerrada |

**Totales**: 17 archivos escaneados; **5 archivos contienen verde**;
**8 ocurrencias válidas** (cta, nav activo, links inline, éxito, foco) +
**4 ocurrencias a corregir** (ghost button, nav-group header, caret OTP,
skip-link fill) + 1 borderline (skip-link).

## 3. Sobre-uso identificado (violaciones de la lista cerrada)

1. **`button.tsrx` — variante `ghost` usa verde.**
   La regla dice que el verde vive en CTA primario, nav activo, foco, éxito y
   links. Un ghost button no encaja en ninguna: es una acción secundaria (no
   CTA primaria) y no es un link. **Cambio**: `text-text-primary` /
   `text-text-secondary` con `hover:bg-surface`. Mantener accesibilidad AA
   simplemente (no necesita verde para tener contraste).

2. **`nav-group.tsrx` — cabecera de grupo activa usa verde.**
   La cabecera de un grupo (p. ej. "Finance") es label no clicable; su
   función es estructural. Pintarla verde cuando un hijo está activo es
   duplicar el "estado activo de nav" — pero el item activo ya se pinta
   solo. **Cambio**: dejar la cabecera como `text-text-secondary` (igual que
   inactiva), o usar `text-text-primary font-medium` (jerarquía tipográfica
   sin color). La jerarquía se construye con peso/espacio, no con color.

3. **`otp-input.tsrx` — `caret-primary`.**
   El color del cursor del input no es CTA, nav, foco, éxito ni link.
   **Cambio**: `caret-text-primary` (neutral). Es un detalle que el ojo casual
   no nota pero que rompe la regla.

4. **`skip-link.tsrx` — `focus:bg-primary focus:text-white` (borderline).**
   El skip-link es un patrón de accesibilidad WCAG 2.4.1 — debe ser visible
   al recibir foco. La regla del producto reserva el verde para CTA primario;
   el skip-link no es un CTA del producto. **Recomendación**: usar
   `focus:bg-text-primary focus:text-background` (neutral alto contraste) o,
   más conservador, simplemente un anillo de foco + fondo `bg-surface`. Mantiene
   WCAG sin comerse el acento.

5. **`DESIGN.md` §6 — "ghost/secondary con `text-secondary`/`primary-700`"**.
   Bajo la nueva regla, el ghost button no puede llevar `primary-700`.
   **Cambio**: reescribir a "ghost/secondary con `text-text-primary`/`text-
   text-secondary`" y eliminar `primary-700` de la prosa.

## 4. Mapa de `tokens.css` con tinte verde → neutrales puros

### 4.1 Bloque `:root` (claro) — revisar

- `--color-background: #ffffff` ✓ ya neutro puro
- `--color-surface: #f6f8f7` → tiene un sutil sesgo cool (G=0xf8, B=0xf7);
  el spec del producto pide "neutral donde sea posible". Considerar
  `#f5f5f5` (gris puro) o `#f4f4f5` (zinc-100, prácticamente neutro). Cambio
  opcional pero coherente con la dirección minimalista.
- `--color-border: #e2e8f0` — slate (R=0xe2, G=0xe8, B=0xf0). El usuario pide
  "near-black border" → reescribir a `#e5e5e5` (zinc-200) o `#e4e4e7`. Ajustar
  si queremos "pure neutral" estricto.
- `--color-text-primary: #0f172a` → slate muy oscuro, no negro puro. El spec
  del producto pide "dark gray text". Considerar `#171717` (neutral-900) o
  `#0a0a0a` (más negro). El primero se siente más legible en sesiones largas.
- `--color-text-secondary: #52606d` — slate. Considerar `#737373` (neutral-500)
  o `#a3a3a3` (neutral-400) si queremos coherencia con el `text-secondary`
  oscuro `#a3a3a3`.
- `--color-error: #dc2626` — rojo, fuera del scope verde.
- `--color-success: #15803d` — verde semántico, MANTENER (indicador de éxito).
- `--color-focus: #15803d` — verde semántico de foco, MANTENER.

**Cambios obligatorios en `:root`**: border, text-primary, text-secondary.
**Cambios opcionales**: surface (si se quiere coherencia "pure neutral"
estricta con el oscuro).

### 4.2 Bloque `.dark` (oscuro) — REESCRIBIR casi entero

El spec da valores exactos; los actuales son verde-tintados y rompen la regla:

| Token | Actual (verde-tintado) | Nuevo (pure neutral) | Notas |
| --- | --- | --- | --- |
| `--color-background` | `#0b120c` | `#0a0a0a` | spec usuario |
| `--color-surface` | `#111a12` | `#141414` | spec usuario |
| `--color-border` | `#243324` | `#262626` | spec usuario |
| `--color-text-primary` | `#f1f5f9` | `#fafafa` | spec usuario |
| `--color-text-secondary` | `#9fb3a4` | `#a3a3a3` | spec usuario |
| `--color-error` | `#f87171` | mantener o `#fca5a5` | fuera de scope verde; AA a revisar sobre `#0a0a0a` |
| `--color-success` | `#4ade80` | mantener | sigue siendo verde semántico (lista cerrada lo permite) |
| `--color-focus` | `#4ade80` | mantener | sigue siendo verde semántico (lista cerrada lo permite) |

**Cambios obligatorios en `.dark`**: los 5 neutros listados (background,
surface, border, text-primary, text-secondary) — son los que el usuario fija
explícitamente.

### 4.3 Bloque `@theme` (escala primaria) — MANTENER

La escala `primary-50…900` es la fuente del acento; los tokens semánticos
(`primary`, `success`, `focus`) la siguen consumiendo. Bajo la regla nueva:

- `primary` se usa solo en el botón CTA primario (relleno) y en `caret-primary`
  (que se va a eliminar). Si tras la limpieza `primary` queda solo en el CTA,
  **escalar la escala primaria puede simplificarse**: bastarían 3 valores
  (`primary`/`primary-hover-light`/`primary-hover-dark`). Decisión de design
  con implicaciones de mantenimiento; default sugerido: mantener escala
  completa porque también alimenta `success` y `focus` en ambos temas.

### 4.4 `@theme inline` — sin cambios estructurales

Solo refleja variables; los nuevos valores caen automáticamente.

## 5. Conflictos `DESIGN.md` ↔ directiva del producto

`DESIGN.md` está fijado como "mundo visual fijado por el usuario"; **no es un
menú** — pero varias de sus afirmaciones textuales ahora contradicen la
directiva nueva. No es un "replace" del mundo visual, es un **refinamiento
dentro del mismo mundo** (Operate, neutrals + verde), así que se preserva la
estructura y se corrigen solo las afirmaciones que entren en colisión.

### 5.1 Afirmaciones que se contradicen y deben reescribirse

- **§1, tesis**: "El verde aparece solo donde hay algo que hacer o algo que
  confirmar." → **alineada**. No tocar.
- **§1, estrategia de color**: "neutrales + un solo acento (verde). El acento
  se usa para: acción primaria, selección actual (nav activo, foco) e
  indicadores de estado de éxito. Nunca como decoración." → **casi alineada**
  pero falta "links inline" en el elenco. **Cambio menor**: añadir "links
  inline" como quinto uso permitido (consistente con la regla nueva). Reescribir
  el elenco completo para que cite los cinco usos canónicos.
- **§2.2 (tabla)**: tokens `background/surface/border/text-primary/text-
  secondary` para `.dark` son verde-tintados → **contradicen** "neutrales".
  Cambiar los valores a la paleta pure-neutral del usuario. La tabla debe
  re-renderizarse.
- **§2.3 (contraste WCAG)**: la regla de "texto interactivo pequeño usa
  `primary-700` o más oscuro" es **demasiado permisiva** bajo la nueva regla.
  Hoy se aplica a ghost button, link, nav activo; tras la limpieza, solo
  links inline y nav activo la consumen. **Cambio**: reescribir la política
  de contraste diciendo: verde pequeño permitido solo en (a) nav activo,
  (b) link inline; verde grande/relleno solo en CTA primario con texto blanco
  encima. La política deja de hablar de "ghost button verde" porque no existe.
- **§6 (componentes)**: "El resto son ghost/secondary con `text-secondary`/
  `primary-700`" → **contradicen** la lista cerrada. Reescribir: "El resto
  son ghost/secondary con `text-text-primary`/`text-text-secondary`. Los ghost
  no usan acento."
- **§6 (íconos)**: "ícono + label en el nav expandido" → sin cambios.
- **§8 (bans)**: añadir "No verde en ghost buttons, cabeceras de grupo, caret
  de input, ni skip-link fill" como bans absolutos explícitos.

### 5.2 Afirmaciones que NO se tocan

- §1 tesis (quietud, una acción primaria por pantalla).
- §2.1 escala primaria.
- §3 tipografía (Poppins).
- §4 espaciado, forma, elevación.
- §5 temas (clase `.dark`, FOUC, etc.).
- §6 motion (150–250ms).
- §7 motion — sin cambios.
- §8 bans que no están en colisión.

## 6. Restricciones y consideraciones

### 6.1 Contraste (WCAG 2.2 AA)

Al mover el texto secundario a `#a3a3a3` sobre `#0a0a0a` (oscuro) y a un
gris equivalente sobre `#ffffff` (claro), hay que revalidar AA:

- Oscuro `text-secondary #a3a3a3` sobre `#0a0a0a`: ratio aprox 7.5:1 → AA ✓.
- Oscuro `text-primary #fafafa` sobre `#0a0a0a`: ratio aprox 19:1 → AAA ✓.
- Claro `text-secondary` (propuesto `#737373`) sobre `#ffffff`: ratio aprox
  4.6:1 → AA ✓ justo.
- Claro `text-primary` (propuesto `#171717`) sobre `#ffffff`: ratio aprox
  16:1 → AAA ✓.
- Verde `success #4ade80` sobre `#0a0a0a`: ratio aprox 9:1 → AA ✓.
- Verde `success #15803d` sobre `#ffffff`: ratio aprox 5:1 → AA ✓.

El verde de foco `#4ade80` sobre `#0a0a0a` y `#15803d` sobre `#ffffff` debe
cumplir AA como anillo no-textual (3:1 contra el fondo del adyacente).
`#15803d` sobre `#ffffff` ≈ 5:1 → ✓. `#4ade80` sobre `#0a0a0a` ≈ 9:1 → ✓.

### 6.2 Consistencia cross-theme

El cambio es paralelo en ambos temas: pasar de "verde-tinted neutrals" a
"pure neutrals" preserva el carácter del producto. No hay trade-off de
"verse mejor en un tema y peor en el otro".

### 6.3 Tokens existentes a reusar

Tailwind v4 con `@theme inline` ya genera utilities a partir de los nombres
de variable. Tras renombrar valores, las utilities existentes
(`bg-background`, `bg-surface`, `border-border`, `text-text-primary`,
`text-text-secondary`, `text-success`, `outline-focus`) siguen funcionando
sin tocar componentes, salvo las 4 violaciones de la §3.

### 6.4 Componentes que NO requieren cambios

- `__app-shell.tsrx`: solo usa `bg-background`, `bg-border`, `bg-text-secondary`
  en el separator — todo neutro. Sin cambios.
- `__auth.tsrx`: solo neutral. Sin cambios.
- `theme-toggle.tsrx`, `form-field.tsrx`, `sidebar-nav.tsrx`, `login-page.tsrx`,
  `placeholder-page.tsrx`, `login-form`, `otp-form`, `app-title`,
  `text-input`, `status-message` (excepto el caso de éxito que ya estaba en
  la lista cerrada), `nav-item` (su uso activo ya es válido), login-verification
  link y routes/index link (links inline, válidos).

### 6.5 Tests

No hay tests que asuman valores hex específicos de los tokens (los tests son
de máquinas de estado OTP, validadores de email, lógica de nav, i18n). No se
prevén regresiones por el cambio de valores.

## 7. Plan tentativo (para `specify`/`plan`, no para `implement` aquí)

1. **tokens.css**: reescribir `:root` y `.dark` con la paleta pure-neutral del
   usuario; mantener escala primaria y tokens semánticos `success`/`focus`/
   `error`.
2. **button.tsrx**: cambiar `ghost` a `text-text-primary hover:bg-surface
   dark:text-text-primary`.
3. **nav-group.tsrx**: cambiar cabecera activa a `text-text-primary font-medium`
   (o dejar `text-text-secondary` consistente).
4. **otp-input.tsrx**: cambiar `caret-primary` → `caret-text-primary`.
5. **skip-link.tsrx** (decisión design): probablemente cambiar `focus:bg-primary`
   a `focus:bg-text-primary focus:text-background`, manteniendo WCAG visible.
6. **DESIGN.md**: aplicar reescrituras §1, §2.2, §2.3, §6, §8 listadas arriba.
7. **Verificación visual**: smoke test en login + shell en ambos temas.

Tamaño estimado: ~80–120 líneas cambiadas (tokens.css ≈ 15, button.tsrx ≈ 1,
nav-group.tsrx ≈ 1, otp-input.tsrx ≈ 1, skip-link.tsrx ≈ 1, DESIGN.md ≈
60–80). Bien dentro del review budget (400). Probablemente single-PR.

## 8. Riesgos

- **Skip-link**: cambiar el fill on focus de verde a negro puede debilitar
  perceptibilidad en algunos usuarios. Validar manualmente que el ring +
  fondo negro sigue siendo AA-visible y descubrible al primer tab.
- **Ghost buttons sin verde**: el verde daba un affordance "esto es
  interactivo" en el diseño actual. Al pasar a `text-text-primary` perdemos
  ese matiz. Mitigación: asegurar hover (`bg-surface`) y focus ring (verde,
  permitido) compensan el affordance.
- **Cabecera de grupo "Finance" sin acento**: hoy el usuario ve un grupo
  verde cuando navega finances; tras el cambio, no. Mitigación: el item
  hijo activo sigue verde — la jerarquía visual se preserva vía el item
  hijo, no la cabecera.
- **DESIGN.md reescrito ≠ reemplazos del mundo**: el mundo visual no cambia,
  solo el texto. Riesgo bajo de que el cambio se lea como "más de lo mismo".
- **Caret color**: algunos navegadores ignoran `caret-color`; no romper
  nada si se queda en default. Riesgo negligible.

## 9. Skill resolution

`paths-injected` — el padre inyectó paths para
`/home/enri/.pi/agent/skills/impeccable/SKILL.md` y su reference
`reference/quieter.md`. Ambas se leyeron íntegramente antes del trabajo.
El modo Operate y el principio "the accent is a precision tool, not
decoration" guiaron el inventario y la priorización de la auditoría.

## 10. Resumen ejecutivo

La superficie a tocar es **pequeña y precisa** (5 archivos `.tsrx/.css` +
`DESIGN.md`), totalmente alineada con el principio Operate: bajar la
intensidad sin cambiar el carácter. El núcleo del cambio está en `tokens.css`
(pasar dark de verde-tintado a pure-neutral), la poda de 4 sobre-usos del
acento (ghost button, nav-group header, caret, skip-link fill) y la
actualización de la prosa de `DESIGN.md` para que el documento deje de
contradecir la implementación. La escala primaria se mantiene porque sigue
siendo la fuente del acento en los cinco usos canónicos. No hay regresiones
previstas en tests (no hay tests que asuman valores hex). Cambio realizable
como single-PR bien dentro del review budget de 400 líneas.
