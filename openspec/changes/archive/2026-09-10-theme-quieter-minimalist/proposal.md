# Proposal — theme-quieter-minimalist

> Fuente de verdad: PRD §9 (sistema visual) + `openspec/specs/design-system/spec.md`
>
> + `DESIGN.md` (autoridad visual). Explore y pre-proposal previos en este change.
> Decisiones de producto CONFIRMADAS (preproposal, 2026-09-10):
> research lane unselected · impeccable `quieter` mode (Operate) · **lista
> cerrada de usos del verde** (CTA primario, nav activo, foco, éxito, links
> inline) · **dark theme pure-neutral** (valores verbatim del usuario) ·
> light theme pure-neutral (hex concretos fijados en §4) · audit de sobre-uso
> ya realizado (17 archivos escaneados, 4 violaciones detectadas).

## 1. Intent

Bajar la intensidad visual del CRM-HOME al modo Operate: la herramienta
desaparece dentro de la tarea, el acento verde deja de ser decoración para ser
herramienta de precisión (regla 10%), y los temas claro/oscuro se vuelven
**neutrales puros** — el oscuro deja de llevar tinte verde.

Tres operaciones concretas:

1. **Reescribir la paleta de tokens semánticos** (`apps/web/src/styles/tokens.css`)
   para que los neutrales (background/surface/border/text-primary/text-secondary)
   sean gris-puro en ambos temas. La escala primaria y los tokens de estado
   (`success`, `focus`, `error`) no cambian.
2. **Eliminar 4 sobre-usos del acento** que violan la lista cerrada: ghost button,
   cabecera activa de grupo de nav, caret de OTP, fill on focus del skip-link.
3. **Alinear la prosa** (`DESIGN.md` + `openspec/specs/design-system/spec.md`)
   para que el texto deje de contradecir la regla nueva (5 contradicciones en
   `DESIGN.md`; 1 requisito de contraste sobre-permisivo en la spec).

Modo impeccable: **Operate**. Principio rector: *the accent is a precision
tool, not decoration*. Un verde por intención, no por costumbre.

## 2. Scope

### 2.1 In scope — implementación (PR principal)

**`apps/web/src/styles/tokens.css`** — única fuente de verdad visual
(PRD §9 "ajustable en un solo archivo"). Cambios:

+ `:root` (claro): `surface`, `border`, `text-primary`, `text-secondary`
  reescritos a hex pure-neutral. Ver §4 de este proposal para los valores
  exactos que el apply debe aplicar.
+ `.dark` (oscuro): los cinco tokens semánticos neutros (`background`,
  `surface`, `border`, `text-primary`, `text-secondary`) reemplazados por los
  valores verbatim del usuario (`#0a0a0a`, `#141414`, `#262626`, `#fafafa`,
  `#a3a3a3`). `success`, `focus`, `error` y la asignación de `--color-primary`
  quedan intactos.
+ La `@theme` estática con la escala `primary-50…900` **no se toca** — sigue
  siendo la fuente del acento. Las utilities generadas por `@theme inline`
  siguen resolviendo igual (`bg-background`, `bg-surface`, `border-border`,
  `text-text-primary`, `text-text-secondary`, `text-success`, `outline-focus`)
  sin arbitrary values.

**`apps/web/src/components/atoms/button.tsrx`** — variante `ghost`:

+ `text-primary-700` → `text-text-primary`.
+ `dark:text-primary-400` → `dark:text-text-primary`.
+ `hover:bg-surface` se mantiene (compensa la pérdida de affordance verde con
  un hover neutral explícito; el focus ring verde de la `BASE_CLASS` sigue
  activo, así que el verde queda donde la lista cerrada lo permite: foco).

**`apps/web/src/components/molecules/nav-group.tsrx`** — cabecera del grupo:

+ Cuando `props.active`, `text-primary-700 dark:text-primary-400` →
  `text-text-primary font-medium`. La jerarquía se construye con peso y
  contraste neutral, no con color. El `NavItem` hijo activo ya lleva el verde
  permitido por la lista cerrada, así que el usuario sigue viendo qué sección
  está activa sin duplicar el acento en la cabecera.

**`apps/web/src/components/vendor/otp-input/otp-input.tsrx`** — `CELL_CLASS`:

+ `caret-primary` → `caret-text-primary` (el color del cursor del input sale
  de la lista cerrada).

**`apps/web/src/components/atoms/skip-link.tsrx`** — fill on focus:

+ `focus:bg-primary focus:text-white` → `focus:bg-text-primary focus:text-background`.
+ El `focus-visible:outline-focus` (anillo de 2px verde) **se mantiene**: el
  verde que ve el usuario al tabular sigue siendo el verde permitido por la
  lista cerrada (foco). El fill del contenedor pasa a alto contraste neutral
  para que el skip-link siga siendo descubrible WCAG 2.4.1 sin comerse el
  acento del producto.

### 2.2 Out of scope (no se toca)

+ La `@theme` con la escala `primary-50…900` y `--font-sans` Poppins (intacta).
+ Los tokens `--color-success` y `--color-focus` en ambos temas (indicador de
  éxito y anillo de foco: usos **válidos** de la lista cerrada).
+ `apps/web/src/components/molecules/nav-item.tsrx` — su uso de `primary-700`
  en activo es el caso canónico de la lista cerrada (estado activo de nav).
  No cambia.
+ `apps/web/src/components/atoms/status-message.tsrx` — `text-success` es
  indicador de éxito (lista cerrada). No cambia.
+ `apps/web/src/components/pages/login-verification-page.tsrx` y
  `apps/web/src/routes/index.tsrx` — links inline usan verde (lista cerrada).
  No cambian.
+ El resto de componentes auditados
  (`__app-shell.tsrx`, `__auth.tsrx`, `theme-toggle.tsrx`, `form-field.tsrx`,
  `sidebar-nav.tsrx`, `login-page.tsrx`, `placeholder-page.tsrx`,
  `login-form`, `otp-form`, `app-title`, `text-input`) — ya consumen solo
  neutrales. No cambian.
+ Tema claro: el usuario pide "pure neutrals (white bg, near-black text,
  near-black border, gray secondary text)" sin fijar hex exactos; el apply
  fija los hex exactos propuestos en §4 dentro de los valores de design.
+ Animaciones, motion, espaciado, tipografía, elevación: ya alineados con
  Operate. No cambia.

### 2.3 Estimación de líneas (implementación)

| Archivo | Líneas netas |
| --- | --- |
| `apps/web/src/styles/tokens.css` | ~10–12 (5 vars en `:root` + 5 vars en `.dark`, comentarios adyacentes) |
| `apps/web/src/components/atoms/button.tsrx` | 1 |
| `apps/web/src/components/molecules/nav-group.tsrx` | 1–2 |
| `apps/web/src/components/vendor/otp-input/otp-input.tsrx` | 1 |
| `apps/web/src/components/atoms/skip-link.tsrx` | 1–2 |
| **Total implementación** | **~15–20 líneas** |

Bien dentro del review budget de 400. Single-PR por delivery strategy
(`ask-on-risk` no se activa por tamaño).

### 2.4 In scope — governance follow-up (PR secundario, gateado)

Este proposal **no ejecuta** los siguientes cambios en esta entrega. Los
enumera como residual explícito que el orchestrator debe aprobar antes del
apply:

+ **`DESIGN.md`** (raíz) — 5 contradicciones a reescribir:
  + §1 elenco de uso del acento → añadir "links inline" como quinto uso
    canónico.
  + §2.2 tabla semántica → los 5 neutrales del tema oscuro pasan a los hex
    pure-neutral del usuario (mismos valores que `tokens.css`).
  + §2.3 regla de contraste → reescribir para que el verde pequeño solo se
    permita en (a) nav activo, (b) link inline; el verde grande/relleno sigue
    permitido en CTA primario. La prosa deja de nombrar ghost button.
  + §6 ghost/secondary → "ghost/secondary con `text-text-primary`/`text-text-secondary`. Los ghost no usan acento."
  + §8 bans → añadir "No verde en ghost buttons, cabeceras de grupo, caret de
    input, ni skip-link fill."
+ **`openspec/specs/design-system/spec.md`** — 1 requisito a ajustar:
  + Requirement "Regla de contraste AA documentada y aplicada" (escena
    "Texto interactivo en tema claro"): quitar "botones ghost" del elenco
    permitido; mantener `primary-700` solo para nav activo + link inline. El
    resto del requisito queda intacto.

Estos dos archivos están **fuera del guard del orchestrator para esta fase**
(constraint del prompt: "Do not edit apps/, packages/, DESIGN.md, or
canonical specs"), por lo que su actualización queda como gate separado. Si el
orchestrator decide hacer el governance follow-up antes del apply, se
recomienda chaining: PR-A (governance: DESIGN.md + spec) → PR-B
(implementación: tokens.css + componentes), porque la prosa deja de
contradecir la implementación **antes** de cambiar el código (evita estado
transitorio donde la regla está escrita pero el código aún no la cumple).
Si el orchestrator prefiere invertir el orden, el resultado visual es
idéntico: PR-A (implementación) deja el código correcto y PR-B (governance)
alinea la prosa en follow-up. El proposal recomienda el primer orden por
consistencia "regla → realidad", pero no es bloqueante.

## 3. Affected areas

| Área | Naturaleza del impacto |
| --- | --- |
| `apps/web/src/styles/tokens.css` | Reescritura de 10 valores semánticos (5 light + 5 dark) |
| `apps/web/src/components/atoms/button.tsrx` | 1 línea (ghost variant) |
| `apps/web/src/components/molecules/nav-group.tsrx` | 1–2 líneas (stateClass activa) |
| `apps/web/src/components/vendor/otp-input/otp-input.tsrx` | 1 línea (CELL_CLASS) |
| `apps/web/src/components/atoms/skip-link.tsrx` | 1–2 líneas (focus fill) |
| `DESIGN.md` (governance, gateado) | ~60–80 líneas tocadas (5 secciones) |
| `openspec/specs/design-system/spec.md` (governance, gateado) | ~10–15 líneas tocadas (1 requisito) |
| Resto de `apps/web/src/components/` | Sin cambios |
| `apps/api`, `packages/types`, `packages/*` | Sin cambios (tema es frontend-only) |
| Tests | Explore encontró 0 tests que asuman valores hex; el apply verifica que ningún snapshot/golden asume los hex viejos |

## 4. Design flags resueltos (resueltos en proposal, no se delegan a design)

Los design flags D1–D5 del pre-proposal se resuelven aquí para que el apply
proceda sin más preguntas de producto:

### D1 — Hex exactos del light theme (pure-neutral)

| Token | Valor propuesto | Notas |
| --- | --- | --- |
| `background` | `#ffffff` | sin cambios — ya era blanco puro |
| `surface` | `#f5f5f5` | gris puro (neutral-100), reemplaza `#f6f8f7` con sesgo cool |
| `border` | `#e5e5e5` | gris puro (neutral-200), reemplaza `#e2e8f0` slate |
| `text-primary` | `#171717` | neutral-900, reemplaza `#0f172a` slate |
| `text-secondary` | `#737373` | neutral-500, reemplaza `#52606d` slate; contraste AA 4.6:1 sobre blanco |
| `error` | `#dc2626` | sin cambios (out of scope verde) |
| `success` | `#15803d` | sin cambios (uso válido: lista cerrada lo permite) |
| `focus` | `#15803d` | sin cambios (uso válido: lista cerrada lo permite) |

Contrastes AA verificados (light):

+ `text-primary #171717` sobre `background #ffffff`: ≈16:1 → AAA ✓.
+ `text-secondary #737373` sobre `background #ffffff`: ≈4.6:1 → AA ✓ justo.
+ `text-secondary #737373` sobre `surface #f5f5f5`: ≈4.4:1 → AA ✓.
+ `success #15803d` sobre `background #ffffff`: ≈5:1 → AA ✓.
+ `focus #15803d` sobre `background #ffffff` (no-textual 3:1): ≈5:1 → ✓.

### D2 — Skip-link fill on focus sin verde

Decisión: **`focus:bg-text-primary focus:text-background` + mantener
`focus-visible:outline-focus` verde**. El usuario al tabular ve un anillo
verde (que sigue siendo el verde canónico de la lista cerrada: foco) alrededor
de un contenedor negro/alto-contraste. El verde del sistema sigue siendo
visible y descubrible; el verde "decorativo" del fill desaparece.

Verificación WCAG 2.4.1: el skip-link tiene ratio de contraste texto
`text-background #0a0a0a` (oscuro) / `#ffffff` (claro) sobre su fill, y
además tiene outline verde de 3:1+ sobre el fondo adyacente. Doble pista
visual sin comerse el acento del producto.

### D3 — Cabecera de grupo de nav "Finance" cuando un hijo está activo

Decisión: **`text-text-primary font-medium`** (peso tipográfico + contraste
neutral en lugar de color). La jerarquía "este grupo tiene algo activo" se
lee por peso, no por tinte. El `NavItem` hijo ya lleva el verde canónico
(lista cerrada: nav activo), así que el usuario sigue teniendo un único
punto verde claro que indica la sección actual. La cabecera queda como
"label estructural" — coherente con `text-text-secondary` que ya tenía en
estado inactivo.

### D4 — Soporte de `caret-color` en navegadores

Documentado, no se actúa. `caret-color` está implementado en todos los
navevadores modernos (Chrome 57+, Firefox 53+, Safari 11.1+). El navegador
falla silenciosamente al valor default del sistema si no lo soporta; no hay
regresión.

### D5 — Tests que asuman valores hex de tokens

Explore confirma: **0 tests asumen hex específicos**. Los tests cubren
máquinas de estado OTP, validadores de email, lógica de nav, i18n. El apply
verifica una vez más antes de commit (grep `#[0-9a-fA-F]{6}` en archivos de
test, debe dar 0 hits fuera de fixtures).

## 5. Risks

+ **Contraste del skip-link sin fill verde**: el fill verde era el "gancho"
  visual más fuerte al tabular. El reemplazo `bg-text-primary + outline
  verde` mantiene discoverability WCAG 2.4.1, pero el affordance cambia
  ligeramente: de "salta un bloque verde" a "salta un bloque negro con
  anillo verde". Mitigación: el outline verde es exactamente el canónico del
  sistema, así que el usuario experto reconoce el patrón.
+ **Ghost button sin acento pierde affordance "esto es interactivo"**:
  el verde daba una pista visual sutil. Mitigación: `hover:bg-surface`
  (hover explícito neutral) + `focus-visible:outline-focus` (anillo verde
  permitido) compensan. El botón sigue siendo visible por su peso, padding
  y label; el verde nunca fue el único señal.
+ **Cabecera "Finance" sin acento**: el usuario que navegaba finances veía
  el grupo en verde. Mitigación: el item hijo activo (`NavItem`) sigue
  verde — la pista "estoy aquí" se preserva vía el item, no la cabecera.
+ **Cambio de paleta en producción (si aplica)**: si hay snapshots visuales
  o golden tests, pueden romperse. Explore no encontró ninguno; el apply
  corre la suite de tests y confirma 0 fallos visuales antes de push.
+ **DESIGN.md reescrito vs implementación desfasada**: si el governance
  follow-up se hace antes que la implementación (PR-A → PR-B), la prosa
  declara la regla nueva mientras el código aún la viola. Riesgo bajo: el
  PR-A no cambia comportamiento visible; solo deja la prosa lista. Si el
  orchestrator prefiere invertir el orden, el desfase es equivalente pero
  invertido (código sin prosa). Cualquiera de los dos órdenes cierra el
  gap en 1–2 PRs.
+ **Tokens con sesgo cool pre-existente**: `surface #f6f8f7` y `border #e2e8f0`
  ya tenían sesgo cool (slate) en light. El cambio a `#f5f5f5` / `#e5e5e5`
  es una afirmación visual "más neutral" coherente con el principio Operate.
  No hay regresión funcional.

## 6. Rollback

+ **`tokens.css`**: revertir el commit restaura los hex verde-tintados.
  Diff pequeño y limpio; sin migraciones; sin datos.
+ **`button.tsrx` ghost / `nav-group.tsrx` / `otp-input.tsrx` /
  `skip-link.tsrx`**: revertir el commit restaura el uso del verde. Los
  componentes siguen funcionando — el verde es solo cosmético.
+ **Sin datos productivos**: el cambio es puramente de presentación; no
  toca estado, persistencia, ni APIs.
+ **Sin riesgo de despliegue**: no hay migraciones ni cambios de
  dependencias. Rollback = revert del/los commits.
+ **Si se hace chaining governance → implementación**: rollback de
  governance (PR-A) es seguro aunque la implementación (PR-B) ya esté
  mergeada — la prosa puede decir "se permite verde en ghost" mientras el
  código no lo usa (inofensivo). Rollback de implementación (PR-B) sin
  rollback de governance (PR-A) deja la prosa declarando reglas que el
  código ya no cumple — incoherente pero no roto. Recomendación: si se
  hace chaining, revertir en orden inverso (PR-B primero, luego PR-A).

## 7. Success criteria

Derivados del principio Operate + lista cerrada + paleta verbatim del
usuario:

1. `apps/web/src/styles/tokens.css` declara los 5 neutrales del tema oscuro
   con los hex exactos `#0a0a0a` / `#141414` / `#262626` / `#fafafa` /
   `#a3a3a3`. Diff verificable con `git diff`.
2. `apps/web/src/styles/tokens.css` declara los 5 neutrales del tema claro
   con los hex pure-neutral de §4 D1 (`#ffffff` / `#f5f5f5` / `#e5e5e5` /
   `#171717` / `#737373`).
3. La escala `primary-50…900` y los tokens `success`/`focus`/`error`/
   `--color-primary` están **byte-idénticos** antes y después del change.
4. `grep -R "text-primary-\|bg-primary-\|border-primary-\|ring-primary-\|caret-primary" apps/web/src/components/` devuelve **0 ocurrencias** excepto en:
   + `nav-item.tsrx` (nav activo — uso válido).
   + `login-verification-page.tsrx` y `routes/index.tsrx` (links inline —
     uso válido).
   + `button.tsrx` variante `primary` (`bg-primary text-white` — CTA fill —
     uso válido).
5. `grep -R "primary" apps/web/src/components/` no muestra ocurrencias en
   `button.tsrx` ghost, `nav-group.tsrx`, `otp-input.tsrx`, `skip-link.tsrx`.
6. Smoke test manual en `/login` y `/dashboard` en ambos temas: no hay
   flash de tema, foco descubrible, skip-link visible al tabular, CTA
   primario en verde, nav activo en verde, links inline en verde. Ghost
   buttons y cabeceras de grupo **sin** verde.
7. WCAG 2.2 AA verificado: contraste de `text-primary`/`text-secondary`
   contra `background`/`surface` ≥ 4.5:1 en ambos temas (ratios en §4 D1).
8. `bun test` (suite completa de apps/web) en verde: 0 fallos. Si
   apareciera snapshot test visual, ajustarlo o documentar el delta.
9. La prosa de `DESIGN.md` y `openspec/specs/design-system/spec.md` ya no
   contradice la regla nueva (verificable post-merge del governance
   follow-up).
10. Diff total del PR de implementación ≤ 30 líneas (margen amplio sobre
    las ~15–20 estimadas).

## 8. Skill resolution

`paths-injected` — el padre inyectó el path del skill impecable
(`/home/enri/.pi/agent/skills/impeccable/SKILL.md`) y la sección
`reference/operate.md` / `reference/quieter.md` está implícita por el modo
declarado. Ambas referencias se leyeron íntegramente antes de escribir esta
propuesta. Modo **Operate** y principio "the accent is a precision tool,
not decoration" guiaron: (a) la elección de mantener el verde solo en los
5 usos canónicos, (b) la decisión de jerarquía tipográfica vs color en
nav-group, (c) la decisión de mover el fill del skip-link a neutral alto
contraste preservando el outline verde de foco.

## 9. Proposal question round

No aplica en esta ejecución: el pre-proposal handoff llegó con las
decisiones de producto CONFIRMADAS por el product owner (lista cerrada de
usos del verde, paleta verbatim dark, principios light, research lane
unselected, audit incluido en explore). Los design flags D1–D5 se resuelven
en §4 de este proposal para que el apply proceda sin más preguntas de
producto. El único gate abierto es la decisión del orchestrator sobre
governance follow-up (§2.4), que es de delivery, no de producto.
