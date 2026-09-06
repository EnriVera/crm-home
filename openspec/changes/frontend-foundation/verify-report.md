```yaml
schema: gentle-ai.verify-result/v1
evidence_revision: sha256:abe11ff75183c76fd33b55a18bd878fe047b07659b8562c2144a1abbe2aabcf3
verdict: pass
blockers: 0
critical_findings: 0
requirements: 26/26
scenarios: 46/46
test_command: bun test
test_exit_code: 0
test_output_hash: sha256:2b55333ff00919351f2d5a5889d3071e2e6290beebb01b59309406b7a8424e55
build_command: cd apps/web && bun run build
build_exit_code: 0
build_output_hash: sha256:41252dde1e1fd04a3085e86a869abeedc09c259092f7f86a9db9dfc0067486fc
```

# Verify Report — frontend-foundation

- **Change:** `frontend-foundation` · Proyecto CRM-HOME · Rama `develop` @ `e26052b`
- **Veredicto global:** **PASS**
- La implementación está **completa y verificada**: 26/26 requisitos y 46/46 escenarios con evidencia. El único blocker del verify inicial (CRITICAL-1, artefacto `apply-progress` faltante) fue **remediado** y su remediación verificada en un re-verify acotado (ver sección "Re-verify remediación CRITICAL-1"). El change queda **listo para archive**.

## Blockers

- **Ninguno.**
- **CRITICAL-1 (STRICT TDD) — REMEDIADO ✅.** El verify inicial bloqueó por ausencia de `openspec/changes/frontend-foundation/apply-progress.md` con la tabla `TDD Cycle Evidence`. El artefacto ahora existe y su contenido fue verificado contra la realidad del repo (7 archivos de test, cabeceras RED, `bun test` 43 pass / 0 fail, 4 commits). Detalle en la sección "Re-verify remediación CRITICAL-1".

## Re-verify remediación CRITICAL-1 (acotado, posterior al verify inicial)

Verificación de consistencia del artefacto `apply-progress.md` contra el codebase. HEAD sin cambios (`e26052b`); no se re-verificaron los 26 requisitos ni se levantaron dev servers (la evidencia funcional del verify inicial sigue vigente).

| Chequeo | Resultado |
| --- | --- |
| `apply-progress.md` existe con tabla `TDD Cycle Evidence` (7 filas) | ✅ |
| Los 7 archivos de test de la tabla existen | ✅ `core.test.ts`, `tree.test.ts`, `redirect.test.ts`, `email.test.ts`, `otp-machine.test.ts`, `machine.test.ts` (otp-input), `i18n.test.ts` |
| Cabeceras RED | ✅ 6/7 con mención RED explícita; ver WARNING-5 para `i18n.test.ts` |
| `bun test` (raíz) | ✅ exit 0 — **43 pass / 0 fail / 189 expect() / 8 archivos** (idéntico a lo declarado en apply-progress) |
| Los 4 commits de la tabla existen en `develop` | ✅ `4d5d843`, `129955e`, `7ed441d`, `e26052b` (git log) |
| HEAD | ✅ `e26052b` — sin cambios desde el verify inicial |
| Código de implementación | ✅ No modificado en este re-verify (solo artefactos documentales) |

`evidence_revision` recomputado como sha256 de `proposal.md + design.md + tasks.md + apply-progress.md + specs/*/spec.md`. `test_output_hash` recomputado sobre el output exacto del `bun test` de este re-verify. `build_output_hash` se conserva del verify inicial (HEAD idéntico; build no re-ejecutado por instrucción del orquestador).

## Cobertura por spec (con evidencia)

### design-system (7/7 requisitos, 12/12 escenarios) — PASS

| Req | Resultado | Evidencia |
| --- | --- | --- |
| R1 Tokens 3 capas, archivo único | ✅ | `apps/web/src/styles/tokens.css`: capa 1 `@theme` (primary-50…900 + Poppins), capa 2 `:root`/`.dark` con 9 variables semánticas + `color-scheme` por bloque, capa 3 `@theme inline` con las 9 utilities. `grep -rEn "#[0-9a-fA-F]{3,6}" apps/web/src/components/` → 0 coincidencias; grep de familias tipográficas literales → 0. |
| R2 Variante dark por clase | ✅ | `tokens.css` línea final: `@custom-variant dark (&:where(.dark, .dark *));` — responde a clase, no a media query. |
| R3 Tokens estado/foco con AA | ✅ | `--color-error`/`--color-success`/`--color-focus` por tema con valores exactos de la spec (claro `#dc2626`/`#15803d`/`#15803d`; oscuro `#f87171`/`#4ade80`/`#4ade80`). Cálculo propio: `#15803d` sobre `#ffffff` ≈ 5.0:1 (≥4.5); los oscuros sobre `#0b120c` superan 7:1. |
| R4 Regla contraste aplicada | ✅ | `nav-item.tsrx`/`nav-group.tsrx`: activo `text-primary-700 dark:text-primary-400`, inactivo `text-text-secondary`; `button.tsrx` ghost igual; primary = `bg-primary text-white`. Foco canónico `focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus` en todos los interactivos (skip-link, button, nav-item, theme-toggle, collapse, otp cells, footer links). Sin `outline-none` sin reemplazo. |
| R5 Resolución de tema sin backend | ✅ | `lib/theme/`: `core.ts` (puro: `resolveTheme`, `isPublicPath`, `PUBLIC_PATHS`, `STORAGE_KEY="crm-theme"`), `source.ts` (puerto `ThemePreferenceSource` + `LocalStorageThemeSource` + `SystemThemeSource`), `store.ts`, `use-theme.ts` (único import de octane en lib/theme, vía `useSyncExternalStore`). `__auth.tsrx` compone con `systemThemeStore` (sigue al SO). Swap de fuente = cambiar el store en el punto de composición. Tests: `core.test.ts` 6 tests verdes. |
| R6 Anti-FOUC | ✅ | `apps/web/index.html`: `<script>` bloqueante como **primer hijo de `<head>`**, antes del `<link rel="stylesheet">`, con regex de rutas públicas, comentario cruzado "SI CAMBIAS UNA, CAMBIA LA OTRA" a `lib/theme/core.ts` y nota de deuda CSP nonce. |
| R7 Componentes base solo tokens | ✅ | atoms: `button` (primary/ghost), `text-input`, `status-message` (`text-error`/`text-success` + `role=alert/status`), `skip-link`; molecules: `form-field` (aria-invalid/aria-describedby), `nav-item`, `nav-group`, `theme-toggle`. Grep de hex/font literales en `src/components/` → 0. |

### web-shell (7/7 requisitos, 13/13 escenarios) — PASS

| Req | Resultado | Evidencia |
| --- | --- | --- |
| R1 Layout shell + skip-link + MPA | ✅ | `routes/__app-shell.tsrx`: `SkipLink` primer elemento → `<div class="flex min-h-dvh">` con `SidebarNav` + `<main id="content">`. Nav por `<a href>` nativos (ver `nav-item.tsrx`). Dev: `curl /dashboard` contiene `id="content"`. |
| R2 Árbol §7 canónico | ✅ | `lib/nav/tree.ts`: orden exacto Dashboard→Tareas→Schedule→Clients→Finance(grupo con 3 hijos)→Config, labels `nav.*`. `lib/nav/routes.ts` exporta `SHELL_ROUTES` (8 rutas); consistencia árbol≡rutas testeada en `tree.test.ts` (verde). |
| R3 Estado activo por URL | ✅ | `lib/nav/active.ts` puro (`pathnameOf`/`isItemActive`/`isGroupActive`); layout consume `props.url`. Sin `window.location` (grep: solo comentarios). Dev: `curl /incomes` → SSR emite `aria-current="page"` en Income. |
| R4 Colapso persistido | ✅ | `sidebar-nav.tsrx`: `w-65` (260px) ↔ `w-16` (64px), toggle `<button>` nativo al pie con `aria-expanded`/`aria-label`/`title`, persistencia `localStorage["crm-sidebar"]`, labels accesibles en colapsado vía `title`+`aria-label` (nav-item). SSR renderiza expandido (snapshot estable) y aplica preferencia tras montar. |
| R5 Íconos wrapper cerrado | ✅ | `vendor/icons/paths.ts`: union cerrada `IconName` con los 12 nombres exactos de D4; README con provenance (phosphor `@phosphor-icons/core@2.1.1`, MIT). `package.json` sin dependencia de íconos; grep de imports de íconos fuera del wrapper → 0. |
| R6 A11y nav (WCAG 2.2 AA) | ✅ | `<nav aria-label={t("nav.ariaLabel")}>` con `<ul>/<li>`; solo `<a>`/`<button>` nativos (cero handlers de teclado custom); contraste activo `primary-700` claro / `primary-400` oscuro; foco visible con token en todos los items. |
| R7 Placeholders + shellRoute | ✅ | 8 entries `routes/{dashboard,tasks,schedules,clients,incomes,expenses,transfers,config}.tsrx` con `PlaceholderPage` (título + `shell.placeholder`), sin guards. `octane.config.ts`: helper `shellRoute(path, entry)` fija el layout — punto único para el futuro `before` guard. Dev: `/expenses`, `/config`, `/tasks` → 200. |

### web-auth-ui (6/6 requisitos, 13/13 escenarios) — PASS

| Req | Resultado | Evidencia |
| --- | --- | --- |
| R1 Layout público + footer legal | ✅ | `routes/__auth.tsrx`: centrado + footer con anchors reales a `/terms`, `/privacy`, `/cookies` (labels i18n); NO se crearon páginas legales (no hay entries ni rutas). Compone `systemThemeStore` — sin toggle de tema. |
| R2 /login con validación client-side | ✅ | `login-page.tsrx` card `max-w-sm`; `login-form.tsrx`: `FormField` email (`type="email"`, `autocomplete="email"`), un único `Button` primary, error inline con `aria-invalid`/`aria-describedby` (vía FormField), navegación a `/login-verification?email=<encodeURIComponent>` solo si `isValidEmail()` (TS puro, `email.test.ts` verde). Sin nuqs. |
| R3 Wrapper otp-input contrato estable | ✅ | `vendor/otp-input/otp-input.tsrx` expone exactamente `OtpInputProps` de D1. **Fallback hand-rolled aplicado conforme a la cláusula explícita de D1**: zagjs v1 eliminó el runtime vanilla de servicio; decisión documentada en `vendor/otp-input/README.md` (deps instaladas/pineadas 1.43.3 y luego retiradas; pin en historia de git). Grep `@zag-js` en `src/` → solo menciones en comentarios/README del propio wrapper; ninguna dependencia zagjs en `package.json`. Máquina testeable headless: `machine.test.ts` (verde). |
| R4 Ceros a la izquierda + teclado numérico | ✅ | Celdas: `type="text"`, `inputmode="numeric"`, `pattern="[0-9]*"`, `autocomplete="one-time-code"` — grep confirma ausencia de `type="number"`. Test: paste `"041283"` → `["0","4","1","2","8","3"]` y `onComplete("041283")` (verde). Auto-avance y backspace que retrocede implementados y testeados. |
| R5 Máquina OTP tras puerto OtpVerifier | ✅ | `lib/otp/otp-machine.ts`: estados `idle→ready→submitting→error | expired | success`,`OTP_MAX_ATTEMPTS=5`/`OTP_EXPIRES_MINUTES=10`/`OTP_CODE_LENGTH=6` como DATOS exportados, puerto `OtpVerifier`,`FakeOtpVerifier` (invalid tras 600ms). `otp-form.tsrx` compone con `FakeOtpVerifier`y muestra intentos como datos (`{state.attemptsRemaining}/{state.maxAttempts}`) con`StatusMessage` (tokens). Tests: intento 5→4, bloqueo sin llamar al verifier, expired, reset, transiciones inválidas — verdes. |
| R6 /login-verification con contexto email | ✅ | `login-verification-page.tsrx`: lee `?email=` de `props.url` con `URLSearchParams`; ausente → `auth.otp.missingEmail` + link a `/login`; presente → subtítulo con el email. Link "volver", reenvío como `<button disabled>` fake. Dev: `curl "/login-verification?email=ana%40example.com"` → HTML contiene `ana@example.com`. |

### web delta (6/6 requisitos, 8/8 escenarios) — PASS

| Req | Resultado | Evidencia |
| --- | --- | --- |
| Redirect `/` → `/login` | ✅ | `lib/nav/redirect.ts`: middleware puro que responde `new Response(null,{status:302,headers:{Location:"/login"}})` sin llamar a `next`; `redirect.test.ts` verde (302 + Location + nunca llama next). Entry fallback `routes/index.tsrx` con anchor. Dev: `curl /` → 302, `Location: /login`. |
| Tabla de rutas con helpers | ✅ | `octane.config.ts`: `shellRoute`/`authRoute`, tabla generada desde `SHELL_ROUTES.map(...)` — sin layouts duplicados; `/login` y `/login-verification` con layout auth. |
| Script anti-FOUC en index.html | ✅ | Ver design-system R6: primer hijo de `<head>`, precede al `<link rel="stylesheet">`, deuda CSP nonce documentada en comentario. |
| Catálogo i18n + escaneo glob | ✅ | `es.json`: secciones `nav.*` (10 claves), `theme.*`, `shell.*` (5), `auth.footer/login/otp`; 0 claves `smoke.*`. `i18n.test.ts` usa `Glob("**/*.{ts,tsrx}")` sobre `src/`, con piso de sanidad del escaneo, verificación de `labelKey` dinámicas del árbol, y auto-verificación (clave borrada detectada). Verde. |
| MODIFIED: Ruta inicial / router por tabla | ✅ | `/` ya no monta smoke page; tabla plana `RenderRoute` con layout por ruta; dev confirma `/`→302, `/login`→200 (layout auth), rutas shell→200 (layout shell). |
| MODIFIED: Tokens semánticos | ✅ | `tokens.css` cumple la spec design-system completa (ver arriba); única fuente de tokens. |

## Auditoría por path (regla §9 de wrappers)

- `@zag-js/*`: **0 imports reales** en el codebase (fallback D1 documentado); las únicas menciones son comentarios/README dentro de `components/vendor/otp-input/`.
- Íconos: 0 imports de paquetes de íconos fuera de `components/vendor/icons/`; SVGs solo en `paths.ts` del wrapper.
- i18next: importado únicamente en `components/vendor/i18n/core.ts`.
- Hex/tipografías literales en `src/components/`: 0 coincidencias.

## WCAG 2.2 AA (lo mecánicamente chequeable) — PASS

- Skip-link primer focalizable → `#content` (verificado en markup SSR).
- `aria-current="page"` en item activo, emitido en SSR (verificado con curl a `/incomes`).
- Foco visible canónico `focus-visible:outline-2 outline-offset-2 outline-focus` presente en todos los elementos interactivos inspeccionados; sin `outline: none` huérfano.
- Contraste: texto interactivo pequeño en claro usa `primary-700` (#15803d ≈5.0:1 sobre blanco, calculado); oscuro usa `primary-400`; tokens de estado ≥4.5:1 en ambos temas.

## Commits Conventional Commits — PASS (4/4)

```
e26052b feat(web): login y verificación OTP (UI)
7ed441d feat(web): app shell con sidebar, rutas placeholder y redirect de /
129955e feat(web): componentes base y wrappers vendor/icons y vendor/otp-input
4d5d843 feat(web): tokens semánticos completos, variante dark por clase y anti-FOUC
```

Los 4 matchean el formato Conventional Commits y corresponden 1:1 con los Commits 1–4 de tasks.md. Re-confirmados en `git log` durante el re-verify.

## STRICT TDD — cumplimiento

- **Evidencia RED/GREEN en código: COMPLETA.** 7 grupos de tests para la lógica TS pura exigida: `lib/theme/core.test.ts`, `lib/nav/tree.test.ts`, `lib/nav/redirect.test.ts`, `lib/validation/email.test.ts`, `lib/otp/otp-machine.test.ts`, `components/vendor/otp-input/machine.test.ts`, `lib/i18n/i18n.test.ts`.
- **Artefacto consolidador: COMPLETO.** `apply-progress.md` existe con la tabla `TDD Cycle Evidence` (7 filas: unidad, archivo, RED, GREEN, TRIANGULATE/REFACTOR), registro de los 4 commits y estado final de tests. **CRITICAL-1 del verify inicial: REMEDIADO.**
- **Tests GREEN confirmados (re-verify):** `bun test` (raíz) → 43 pass / 0 fail / 189 assertions / 8 archivos (exit 0) — idéntico a lo declarado en apply-progress.
- **Calidad de aserciones: OK.** Sin tautologías, ghost loops ni aserciones smoke-only: los tests verifican estados, valores y transiciones concretas (slots exactos, contadores 5→4, no-llamada al verifier, status 302 + header, existencia real de claves en el catálogo con auto-verificación).

## Review Workload / PR boundary

- Forecast: ~1400–2000 líneas, `Chained PRs recommended: Yes`, `Delivery strategy: ask-on-risk`, `Chain strategy: pending`.
- La decisión se elevó al usuario en la proposal (§riesgos) y el delivery efectivo fue **4 commits atómicos alineados al split sugerido** (Commit 1 = design-system; Commits 2–3 = web-shell; Commit 4 = web-auth-ui) — equivalente a la opción `size:exception` con review por commit (aprobada por el orquestador para este change).
- **Sin scope creep:** no se implementó nada fuera de las 47 tareas (sin páginas legales, sin guards de auth, sin resize de sidebar). El re-verify no modificó código de implementación.
- **WARNING-1 (registro):** `Chain strategy` quedó en `pending` en tasks.md; la decisión tomada (4 commits atómicos) no se consolidó en el forecast. No afecta al código.

## Findings menores (no bloqueantes)

- **WARNING-2:** tasks.md Commit 2 tarea 1 ("Instalar y pinear `@zag-js/pin-input`/`@zag-js/core`… lockfile commitado") está marcada `[x]`, pero el estado final retiró las dependencias (fallback D1). El README del wrapper lo documenta correctamente; el checkbox describe un estado intermedio, no el final.
- **WARNING-3:** `openspec/config.yaml` declara `stack.frontend.components: zagjs`; tras el fallback hand-rolled ya no hay runtime zagjs en uso. Actualizar el config o reinstalar zagjs cuando exista adapter vanilla (decisión del change de auth).
- **WARNING-4:** `DESIGN.md` (raíz), `.impeccable/surface-briefs/` y `openspec/changes/frontend-foundation/` están **untracked** en git — los artefactos documentales exigidos por la tarea del Commit 4 existen pero no están commitados en `develop`.
- **WARNING-5 (nuevo, del re-verify):** la fila 7 de la tabla `TDD Cycle Evidence` declara "Cabecera RED" para `i18n.test.ts`, pero su cabecera documenta el enfoque D10 sin mención explícita a RED (los otros 6 archivos sí la tienen). Discrepancia documental menor: el archivo existió desde el batch RED y su auto-verificación ("el chequeo muerde") está correctamente descrita en la misma fila. No afecta al cumplimiento TDD.

## Detector impeccable

- No se encontró resultado registrado del apply; se ejecutó UNA vez: `impeccable detect --json apps/web/src` → `[]` (0 detecciones). PASS. (Registrado también en apply-progress.md.)

## Comandos de verificación ejecutados

| Comando | Exit | Resultado |
| --- | --- | --- |
| `bun test` (raíz) — re-ejecutado en el re-verify | 0 | 43 pass / 0 fail / 189 expects / 8 archivos |
| `cd apps/web && bun run build` — verify inicial (HEAD idéntico) | 0 | vite build OK (114 módulos, server build completo) |
| `cd apps/web && bun run typecheck` (tsrx-tsc --noEmit) — verify inicial | 0 | sin errores |
| `bun run dev` + curl a `/`, `/login`, `/login-verification`, `/dashboard`, `/tasks`, `/expenses`, `/config` — verify inicial | — | `/`→302 Location:/login; resto→200; SSR de `/incomes` emite `aria-current="page"`; `/dashboard` contiene `id="content"`; `/login-verification?email=…` muestra el email. Dev server terminado tras la verificación. |
| greps de auditoría §9 (zag-js, íconos, hex, fuentes, smoke) — verify inicial | — | 0 violaciones |
| `impeccable detect --json apps/web/src` — verify inicial | 0 | `[]` |
| `git log --oneline` (re-verify) | 0 | 4 commits del change presentes; HEAD `e26052b` sin cambios |
| grep cabeceras RED en los 7 test files (re-verify) | — | 6/7 con RED explícito (ver WARNING-5) |

## Task checkbox status

`grep -c '^\s*- \[ \]' tasks.md` → **0**. Las 47 tareas están marcadas; no quedan checkboxes de implementación sin marcar. La completitud declarada fue verificada contra el código salvo la salvedad de WARNING-2.

## Structured status / actionContext

El orquestador proveyó contexto estructurado suficiente en ambas pasadas (change activo `frontend-foundation`, rama `develop` @ e26052b, runtime bun, STRICT TDD activo, `artifact_store: openspec`, `size:exception` aprobada). En el verify inicial el artefacto `apply-progress` no existía en ningún backend; en el re-verify el artefacto existe en `openspec/changes/frontend-foundation/apply-progress.md` y su consistencia fue verificada.

## Recomendación

1. ~~Regenerar `apply-progress.md` con la tabla `TDD Cycle Evidence`~~ — **HECHO y verificado** (re-verify de remediación).
2. Commitar `DESIGN.md`, `.impeccable/` y los artefactos del change (WARNING-4), y consolidar `Chain strategy` (WARNING-1) y el stack zagjs (WARNING-3).
3. **El change queda listo para archive.**
