# apply-progress — theme-quieter-minimalist

> Change SDD: `theme-quieter-minimalist` · Fase: apply (sdd-apply).
> Artifact store: `openspec` · Branch: `develop` · Test runner: `bun test`.
> Attempt token (parent-owned): `sha256:8676cc83122cdc1449e0502ce2021baf036f61bd2a9008832dd30a773c7a2980`.
> Strict TDD mode (RED → GREEN → TRIANGULATE → REFACTOR por slice).
> Persisted task checkboxes actualizados en `tasks.md` (10/12 marcados
> `[x]`; 2 quedan `[ ]` por gates downstream fuera del alcance del agente:
> smoke test interactivo y apertura de PR — el parent decide el delivery).
> Este archivo **se queda uncommitted** durante el attempt; el parent lo
> confirma con `sdd-attempt settle`.

## TDD Cycle Evidence

| Slice | Phase | Test command | Result | Notes |
| --- | --- | --- | --- | --- |
| A | RED | `bun test apps/web/src/styles/tokens.test.ts` (primer run con tokens.css intacto) | 25 fail / 12 pass | Tests detectan hex viejos (`#f6f8f7`, `#e2e8f0`, `#0f172a`, `#52606d`, `#0b120c`, etc.) y ratios WCAG incorrectos para hex nuevos |
| A | GREEN | `bun test apps/web/src/styles/tokens.test.ts` (post-edit de tokens.css) | 0 fail / 39 pass | Bugfix menor durante el GREEN: el helper `block()` usaba `indexOf(":root")` y capturaba `@theme {...}` porque la doc menciona `:root` antes. Ajustado a `indexOf(":root {")`. |
| A | TRIANGULATE | misma suite, asserts WCAG añadidos | 0 fail / 39 pass | Triangula typos de hex: cualquier swap accidental rompe el ratio. Ajustes a los ratios esperados para reflejar la fórmula WCAG 2.x canónica (design §5.1 arrastraba redondeos imprecisos en algunas filas; ver "Desviaciones" abajo). |
| A | REFACTOR | misma suite | 0 fail / 39 pass | Comentarios inline de cada token alineados con design §3.1 (neutral-100/200/900/500 + "user-verbatim, sin tinte verde" en dark; ratio AA en text-secondary). |
| B | RED | `bun test apps/web/src/components/__class-fixtures.test.ts` (sin editar componentes) | 16 fail / 10 pass | Tests detectan `text-primary-700`, `dark:text-primary-400`, `caret-primary`, `focus:bg-primary`, `focus:text-white` en los archivos `.tsrx` afectados. 4 passes de out-of-scope (nav-item activo, status-message success, login-verification back link, routes/index fallback) y 6 passes de utility canónica preservada (primary variant button, text-text-secondary inactiva, focus-visible:outline-focus). |
| B | GREEN | misma suite (post-edit de 4 componentes) | 0 fail / 26 pass | Diffs aplicados verbatim de design §3.2–§3.5. |
| B | TRIANGULATE | misma suite + asserts de orden (skip-link fill ordering) | 0 fail / 26 pass | Asserción anti-swap: `bg-text-primary` aparece ANTES de `text-background` en la cadena de clases del skip-link (un swap daría white-on-white o near-zero contrast). |
| B | REFACTOR | misma suite | 0 fail / 26 pass | Comentario único de WHY sobre cada cambio de clase en los 4 componentes. No se borra ni se comprime código existente. |
| C | greps | 3 greps de design §2 D5 (ver "Greps de control" abajo) | OK | 0 hits en paths prohibidos; únicos hits son `nav-item.tsrx`, `login-verification-page.tsrx`, `button.tsrx primary row`, todos en la lista cerrada permitida. 0 hits en `apps/api/src` o `packages/`. |
| C | full suite | `bun test` desde repo root | 230 pass / 16 skip / 0 fail (37 archivos) | Los 65 tests añadidos por este change (39 tokens + 26 class-fixtures) entran en verde junto con la suite preexistente (16 skipped son integración con Mailpit / DB que requieren servicios externos). |

## Files changed

| Archivo | Líneas netas | Naturaleza |
| --- | --- | --- |
| `apps/web/src/styles/tokens.css` | +11 / −11 (5 vars light + 5 vars dark + 1 comentario de error) | Reescritura semántica de paleta. Sin cambios en `@theme`, `@theme inline`, `@custom-variant`. |
| `apps/web/src/styles/tokens.test.ts` | +239 / 0 (nuevo) | 39 tests: substring (file-text) + WCAG 2.x relative luminance. Cubre light + dark + escala primary byte-idéntica + hygiene (sin hex viejos). |
| `apps/web/src/components/atoms/button.tsrx` | +4 / −2 | ghost variant reescrita + comentario WHY. primary variant intacta. |
| `apps/web/src/components/molecules/nav-group.tsrx` | +5 / −2 | stateClass activa reescrita + comentario WHY. inactiva intacta. |
| `apps/web/src/components/vendor/otp-input/otp-input.tsrx` | +5 / −1 | `caret-primary` → `caret-text-primary` + comentario de soporte. |
| `apps/web/src/components/atoms/skip-link.tsrx` | +4 / −1 | focus fill reescrito + comentario WHY. outline verde intacto. |
| `apps/web/src/components/__class-fixtures.test.ts` | +221 / 0 (nuevo) | 26 tests: substring (file-text) + asserts de orden (anti-swap skip-link) + asserts de out-of-scope preservados. |
| `DESIGN.md` | +39 / −16 | 5 reescrituras verbatim del design §6.1 (governance follow-up ejecutado dentro del attempt por override del parent; ver "Desviaciones"). |
| `openspec/specs/design-system/spec.md` | +162 / −10 | Bloque MODIFIED del requisito "Regla de contraste AA documentada y aplicada" aplicado verbatim: elenco cerrado de 5 usos + 9 scenarios adicionales. |

**Total implementación:** ~16 líneas netas en código de producto (`tokens.css` 11 + componentes ~5). Bien dentro del review budget de 400.
**Total governance:** ~190 líneas netas (DESIGN.md 39 + spec 162). Dentro del mismo budget.

## Commits landed (develop branch)

```
35dca83 docs(spec): apply design-system MODIFIED delta for closed-list rules
452532a docs(design): align DESIGN.md with quieter minimalism closed-list rules
2f2e36e feat(components): remove green accent from 4 closed-list violations
0a7202e feat(styles): rewrite tokens to pure-neutral palette with WCAG assertions
0349b65 docs(openspec): archivar change transactional-email y sincronizar specs canonicas (base previa)
```

Conventional Commits (`config.git.commits.convention`), header + body
≤100 chars (husky+commitlint enforced). Cada commit combina tests con el
código que cubren (work-unit-commits).

## Greps de control (design §2 D5 / proposal §7 SC #4–5)

```bash
# 1) utility classes prohibidas en apps/web/src/components/
grep -RE 'text-primary-|bg-primary-|border-primary-|ring-primary-|caret-primary' apps/web/src/components/

# Hits (todos en la lista cerrada permitida):
# - button.tsrx primary variant: "bg-primary text-white hover:bg-primary-700 dark:hover:bg-primary-400"  (CTA fill — permitido)
# - nav-item.tsrx activo: "bg-surface font-medium text-primary-700 dark:text-primary-400"                (nav activo — permitido)
# - login-verification-page.tsrx BACK_LINK_CLASS: "text-primary-700 ... dark:text-primary-400"          (link inline — permitido)
# - __class-fixtures.test.ts: aserciones que mencionan los substrings prohibidos (esperado, son asserts)

# 2) 'primary' en los 4 componentes objetivo del cleanup
grep -R 'primary' apps/web/src/components/atoms/button.tsrx \
                    apps/web/src/components/molecules/nav-group.tsrx \
                    apps/web/src/components/vendor/otp-input/otp-input.tsrx \
                    apps/web/src/components/atoms/skip-link.tsrx

# Hits:
# - button.tsrx: literal "primary" en el nombre de la variant, en el type del prop y en el default "primary" — esperable
# - button.tsrx ghost: "text-text-primary" (NUEVO, neutro — sin acento) ✓
# - nav-group.tsrx: solo "text-text-primary" (NUEVO, neutro — sin acento) ✓
# - otp-input.tsrx: "text-text-primary" y "caret-text-primary" (NUEVO, neutro — sin acento) ✓
# - skip-link.tsrx: "focus:bg-text-primary focus:text-background" (NUEVO, neutro — sin acento) ✓

# 3) primary-700 / primary-400 en apps/api o packages/
grep -R 'primary-700\|primary-400' apps/api/src packages/

# Hits: 0 ✓ (frontend-only confirmado)
```

## Desviaciones del design

1. **Ratios WCAG §5.1 del design imprecisos.** La tabla `design.md` §5.1
   documentaba ratios WCAG con redondeos a 0.05–0.1 que difieren del
   cómputo canónico en varias filas (p. ej. `#a3a3a3` sobre `#0a0a0a`
   documentado 7.47, cómputo canónico 7.85; `#171717` sobre `#ffffff`
   documentado 16.10, cómputo canónico 17.93). Los veredictos
   AA / AAA no cambian. La suite de tests `tokens.test.ts` TRIANGULATE
   usa los valores canónicos (redondeados a 0.1) y documenta la
   discrepancia en un comentario al inicio del bloque. Acción sugerida:
   corregir `design.md` §5.1 con los ratios canónicos antes del PR.
2. **Governance follow-up ejecutado dentro del attempt.** El
   `tasks.md` declaraba `DESIGN.md` y `openspec/specs/design-system/spec.md`
   como out-of-scope del apply. El parent overrideó esa restricción y
   pidió ejecutar ambas ediciones como parte del apply. Las dos
   ediciones se aplicaron verbatim de design §6.1 y §6.2 (con el bloque
   MODIFIED completo, 11 scenarios). Resultado: la prosa y el código
   cierran el gap en el mismo PR, no en PR-A separado.
3. **Manual smoke test (tasks.md #10) NO ejecutado en este attempt.**
   El ambiente no permite interacción con browser; las verificaciones
   WCAG automatizadas (tokens.test.ts) y los asserts de substring
   (__class-fixtures.test.ts) cubren la mayor parte de la matriz de
   smoke del design §8.2 (skip-link fill, NavGroup hierarchy, OTP caret,
   ghost button render, focus ring). El smoke visual lo ejecuta el
   parent / usuario al revisar el PR.
4. **PR (tasks.md #12) NO abierto en este attempt.** El parent explícitamente
   lo prohíbe ("Do NOT open a PR (parent handles delivery, user opens the
   PR themselves)"). El inventario de archivos, la evidencia AA, los
   greps y la nota sobre governance ya ejecutado van en el cuerpo del
   PR que el usuario abre manualmente.

## Smoke test matrix (design §8.2) — referencia para verificación visual

Para que el reviewer complete la matriz al revisar el PR:

| Ruta | Tema | (1) skip-link | (2) NavGroup hierarchy | (3) no-FOUC | (4) OTP caret | (5) ghost button |
| --- | --- | --- | --- | --- | --- | --- |
| `/login` | claro | neutral fill `#171717` + outline verde `#15803d` | (no nav en login) | sin flash | n/a (no OTP) | n/a (login-page no usa ghost) |
| `/login` | oscuro | neutral fill `#fafafa` + outline verde `#4ade80` | n/a | sin flash | n/a | n/a |
| `/login-verification` | claro | neutral fill + outline verde | n/a | sin flash | caret `#171717` (no verde) | n/a |
| `/login-verification` | oscuro | neutral fill + outline verde | n/a | sin flash | caret `#fafafa` (no verde) | n/a |
| `/dashboard` | claro | neutral fill + outline verde | "Finance" header bold neutral + child "Expenses" verde | sin flash | n/a | ghost neutral + focus ring verde |
| `/dashboard` | oscuro | neutral fill + outline verde | "Finance" header bold neutral + child "Expenses" verde | sin flash | n/a | ghost neutral + focus ring verde |

(El shell autenticado tiene ghost buttons en formularios; la verificación
visual en `/dashboard` cubre el caso. El resto de las rutas privadas
sigue el mismo patrón.)

## Next recommended phase

`sdd-verify`. El apply deja el código en develop con bun test verde, los
tests de regresión nuevos en su lugar, los greps de control OK, y la
prosa (DESIGN.md + spec canónica) alineada con la implementación. La
matriz de smoke queda pendiente de verificación visual del reviewer en
el PR que el usuario abre manualmente.

## skill_resolution

`paths-injected` — el padre inyectó los paths de
`gentle-ai-work-unit-commits` y `impeccable` (Operate + quieter) antes
del trabajo; ambos se leyeron íntegros y guiaron:

- TDD: RED primero (tests fallan), luego GREEN (código pasa), luego
  TRIANGULATE (asserts adicionales WCAG + out-of-scope), luego REFACTOR
  (comentarios concisos sin tocar código funcional).
- Work-unit-commits: cada commit combina tests con el código que
  cubren; las dos governance edits son work units separados pero
  contiguos en develop.
- Operate + quieter: el principio "the accent is a precision tool, not
  decoration" guio el elenco cerrado de los 5 usos del verde y la
  decisión de jerarquía por peso (font-medium en NavGroup) en lugar de
  tinte cromático.

No se descubrió skill adicional en runtime; los paths inyectados
cubrieron el trabajo.
