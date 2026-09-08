```yaml
schema: gentle-ai.verify-result/v1
evidence_revision: sha256:601ff4d025b0c464d637d59f67ef2f226f4d627b063bf8febb2f75e9735034f2
verdict: pass_with_warnings
blockers: 0
critical_findings: 0
requirements: 16/16
scenarios: 37/37
test_command: bun test
test_exit_code: 0
test_output_hash: sha256:c76932a23be471324962c921a3d865f0748becd46015954e73311353a038089c
build_command: bunx turbo run typecheck --force
build_exit_code: 0
build_output_hash: sha256:f3870e5693c06378d3759aaee2c733aa7a3c1c33a6f26e43dbab6cc2dd009e3d
```

# Verify Report — stack-alignment

## Veredicto global: PASS CON WARNINGS (0 blockers, 0 critical)

Change `stack-alignment` verificado contra las 6 specs (16 requisitos, 37
escenarios), HEAD `d287992` (develop). STRICT TDD activo; runner `bun test`.
Sin servidores dev levantados en esta fase (evidencia de dev/SSR del
orquestador, fresca y al mismo HEAD; ver §Evidencia dev/SSR).

## Resultado por spec y requisito

### 1. vendor-bindings (7 requisitos, 12 escenarios)

| Requisito | Resultado | Evidencia |
| --- | --- | --- |
| Instalación pineada de bindings | PASS | `apps/web/package.json`: `@octanejs/zag@0.0.18`, `@zag-js/pin-input@1.42.0`, `@octanejs/xstate@0.0.10`, `xstate@5.32.6`, `@octanejs/phosphor-icons@0.0.32`, `@octanejs/resizable-panels@0.0.10`, `effect@3.22.1` — todos exactos, sin `^`/`~`. `apps/api`: `@octanejs/xstate@0.0.10`, `effect@3.22.1`, `xstate@5.32.6`. `bun.lock` trackeado en git. |
| Un binding por commit | PASS | Historial: `bd89f19` (deps), `09de734` (icons), `8563e33` (zag), `a48b8cd` (xstate FSM), `8221f42` (resizable), `f536ae5` (sonner+usehooks-ts), `ff8f08a` (gate i18n), `d287992` (docs) + `3eae971` style fix (desviación documentada en apply-progress). |
| Stack base con limitaciones documentadas | PASS con nota | `@octanejs/sonner@0.1.47` y `@octanejs/usehooks-ts@0.0.34` pineados; cohorte parcial host-safe enumerada en `vendor/hooks/index.ts`, README y `openspec/config.yaml`. **Nota:** la spec pedía instalar `@octanejs/i18next@0.1.47` — el gate D-SA3 (previsto en la propia spec `web` como condicional) lo resolvió rama B (NO adoptar): instalado, inspeccionado y desinstalado; ausente de package.json (verificado por grep). Decisión registrada en README del wrapper + config.yaml. |
| Decisión error-boundary registrada | PASS | `@octanejs/react-error-boundary` NO instalado (grep ausente); ErrorBoundary nativa de Octane 0.2.3 documentada en config.yaml (`no_aplican`, con divergencia component-stack vacío) y PRD §9 línea 309. |
| Regla de wrapper reforzada y auditable | PASS con nota | Grep ejecutado: imports de `@octanejs/*`/`@zag-js/*`/`phosphor-icons`/`react-resizable-panels`/`sonner` solo bajo `components/vendor/`. Residuales interpretados: `lib/nav/redirect.ts` import de TIPO `Middleware` de `@octanejs/vite-plugin` (tooling del framework, no binding de UI — no viola); `xstate` en `lib/otp/otp-machine.ts`+test — adapter de dominio autorizado por design D-SA4 (ver Finding W2). |
| Base fundacional api (requisito condicional) | PASS | Cableado efectivo DIFERIDO documentado (cuerpo de `bd89f19` + apply-progress); instalación pineada + 2 smoke tests en `src/infrastructure/` (`effect.smoke.test.ts`, `xstate.smoke.test.ts`) verdes. Cumple la rama condicional del requisito. |
| Diferidos con change consumidor | PASS | `openspec/config.yaml` sección `diferidos`: lexical→tasks, dnd-kit→tasks(kanban), day-picker→schedule, recharts→schedule (nota "SSR no testeado; Brush/Treemap no soportados"), colorful→config, tanstack-*→data layer, spring→primera animación, testing-library→primer test DOM, shiki→sin consumidor. |
| Correcciones documentales | PASS | Grep: "tanstack charts" = 0 matches en PRD/config; `nuqs`/`router-ssr-query` solo como NO aplicables (PRD:318, config `no_aplican`); PRD §9 tabla de wrappers con bindings `@octanejs/*` (líneas 306-313); `@octanejs/recharts` diferido (PRD:191,313,366); addenda en specs `frontend-foundation` (D1→D-SA1, D4→D-SA8, D8→D-SA6, verificadas en git diff). |
| Criterios globales | PASS | `bun test` 54 pass / 0 fail / 12 archivos (≥43 previos, re-apuntados + nuevos); typecheck 4/4 (`bunx turbo run typecheck --force`, exit 0); contratos públicos intactos (ver specs individuales); dev/SSR: evidencia del orquestador al mismo HEAD (ver abajo). |

### 2. api (1 requisito, 3 escenarios)

| Requisito | Resultado | Evidencia |
| --- | --- | --- |
| Base fundacional effect/xstate instalada y confinada | PASS | Pines exactos en `apps/api/package.json` (escenario 1). Grep: `effect`/`xstate` solo en `src/infrastructure/*.smoke.test.ts`; cero en `src/domain/`/`src/application/` (escenario 2). `bun test` verde sin lógica de negocio añadida (escenario 3); diferimiento del wiring documentado (rama condicional). |

### 3. web-auth-ui (2 requisitos, 7 escenarios)

| Requisito | Resultado | Evidencia |
| --- | --- | --- |
| Wrapper vendor/otp-input con contrato estable | PASS | `otp-input.tsrx` exporta `OtpInputProps` idéntica a la spec (`length?/disabled?/invalid?/onComplete?/"aria-label"?`); implementación sobre `@octanejs/zag` (`useMachine`/`normalizeProps`) + `@zag-js/pin-input` (opción preferida D-SA1; fallback innecesario). Imports del binding solo bajo `vendor/otp-input/` (grep). Consumidor `organisms/otp-form/otp-form.tsrx` sin cambios de contrato. 8 tests de `pin-input-props.test.ts` cubren el contrato (length default 6, `pattern:"[0-9]*"`, `type:"numeric"` nunca `number`, `otp:true`, `onValueComplete`→`valueAsString` con ceros `"041283"`, disabled, invalid) — re-enfoque justificado (máquina zag no headless-testeable sin runtime Octane; cobertura de máquina = CI upstream). |
| Máquina OTP tras puerto OtpVerifier | PASS | `lib/otp/otp-machine.ts` migrada a xstate v5 (`setup().createMachine()` + `fromPromise` para el puerto); constantes `OTP_MAX_ATTEMPTS=5`, `OTP_EXPIRES_MINUTES=10`, `OTP_CODE_LENGTH=6` preservadas; `Verdict`, `OtpVerifier`, `FakeOtpVerifier` y fachada `createOtpMachine` (getState/setCode/submit/reset) intactas; context `{code, attemptsRemaining}` como datos. 10 tests de actor + 1 de fachada verdes, mismos casos que los 9 previos (invalid consume intento 5→4; bloqueo a 0 sin llamar al verifier — `calls===5` tras sexto submit; expired; success; reset; transiciones inválidas). |

### 4. web-shell (2 requisitos, 7 escenarios)

| Requisito | Resultado | Evidencia |
| --- | --- | --- |
| Sidebar redimensionable con colapso y persistencia | PASS | `routes/__app-shell.tsrx`: `Group`/`Panel collapsible`/`Separator` importados SOLO desde el wrapper `components/vendor/resizable/` (re-exports tipados); `useDefaultLayout({ id: "crm-sidebar-layout" })` para persistencia (evolución documentada de `"crm-sidebar"` — clave vieja solo en comentarios); `SidebarCollapseContext`; `sidebar-nav.tsrx` deriva `collapsed` del contexto y toggle `<button type="button">` nativo llama `panelRef.collapse()/expand()` (WCAG 2.1.1, cero handlers de teclado custom; ARIA del binding). Límites en `lib/nav/sidebar-layout.ts`: collapsed 5 < min 15 < default 20 < max 30 (%) con `isCollapsedSize`/`clampSidebarSize` — 5 tests verdes. SSR snapshot estable: `defaultSize` único en SSR/hidratación, layout persistido post-mount (patrón D8, documentado en JSDoc del wrapper). Escenarios de drag/teclado/persistencia entre páginas verificados por estructura de código + evidencia dev del orquestador. |
| Íconos vía wrapper vendor/icons con set cerrado | PASS | `paths.ts` = mapa `IconName`→componente phosphor (12 íconos exactos de la union); `ICON_PATHS` vendored eliminado (test lo garantiza); tipado `Record<IconName, PhosphorIcon>` rechaza nombres fuera de la union en compilación; imports solo bajo `vendor/icons/` (grep); contrato `Icon`/`IconName` intacto (ningún consumidor tocado, verificado en cuerpo de `09de734`). |

### 5. web (3 requisitos, 6 escenarios)

| Requisito | Resultado | Evidencia |
| --- | --- | --- |
| Dependencias de bindings pineadas en apps/web | PASS | Todos los bindings adoptados con versión exacta (lista en §1); `@octanejs/react-error-boundary` condicional → no instalado (nativo documentado); `@octanejs/i18next` gate rama B → no adoptado, documentado. |
| Wrappers mínimos toast y error-boundary | PASS | `vendor/toast/` (`index.ts` + `toaster.tsrx`): `toast(message, {variant?: "info"\|"success"\|"error"})` + `Toaster`; `@octanejs/sonner` solo bajo `vendor/toast/` (grep). Sin wrapper error-boundary (decisión nativa documentada). |
| i18next con español por defecto (MODIFIED) | PASS | Wrapper `vendor/i18n/` con contrato intacto: `I18nProvider`, `useT()`, `t()`, `createI18n()`, `subscribeLanguageChange()` (grep de `index.ts`); 6 tests de `lib/i18n/i18n.test.ts` verdes (idioma `es`, catálogo sin claves ausentes, 9 labelKeys); integración propia sobre `i18next@26.4.2` mantenida como variante equivalente §9 — decisión del swap documentada (README + config.yaml con gate de re-evaluación). |

### 6. design-system (1 requisito, 2 escenarios)

| Requisito | Resultado | Evidencia |
| --- | --- | --- |
| Verificación de bundle y SSR de bindings visuales | PASS | Evidencia registrada en cuerpo de `09de734`: tree-shaking — solo los 12 íconos de la union en el chunk del shell, ausentes GearSix/MoonStars/HouseLine/CalendarCheck (grep del bundle); SSR — 11 `<svg>` server-side en `/dashboard` (viewBox 0 0 256 256, aria-hidden) sin mismatch. Styling por tokens (`border-border`, `text-text-primary`, etc. en `otp-input.tsrx`; sin valores hardcodeados que compitan con tokens.css). |

## Task completion

`grep '^\s*- \[ \]' openspec/changes/stack-alignment/tasks.md` → **0 matches.
44/44 tareas marcadas.** Sin blockers de completitud; archive no bloqueado por
checkboxes.

## Strict TDD compliance (ACTIVO — testing.strict_tdd: true)

- **Tabla TDD Cycle Evidence en apply-progress.md: EXISTE** — cubre commits 7-8
  (ambos legítimamente N/A: gate documental y commit de docs, consistente con
  tasks.md "el 8 es docs; solo verifica greps documentales").
- **Cross-reference tests:** los 12 archivos de test reportados existen y la
  suite corre verde (54 pass / 0 fail / 222 expect calls, re-ejecutado en esta
  fase, exit 0).
- **Evidencia RED→GREEN commits 1-6:** presente en los cuerpos de commit
  (verificado: `bd89f19` "Smoke tests RED→GREEN", `09de734` "RED paths.test.ts
  (3 casos… fallaban por export ausente) → GREEN 48 pass", `8563e33` "RED
  pin-input-props.test.ts (8 casos… fallaban por módulo ausente) → GREEN 48
  pass", `a48b8cd` "RED→GREEN→TRIANGULATE: 49 tests", `8221f42` RED→GREEN;
  `f536ae5` mapeo declarativo sin lógica propia → sin tests propios, justificado
  en tasks) y en los checkboxes RED/GREEN de tasks.md. La tabla del artifact no
  consolida commits 1-6 → **Finding W1** (documentación, no sustantivo).
- **Auditoría de calidad de aserciones:** SIN tautologías, ghost loops ni
  smoke-only en la lógica de negocio. `otp-machine.test.ts` aserta estados,
  context y contadores de llamada reales (el loop de 5 submits aserta
  `calls===5` tras un sexto submit — loop real con aserción externa).
  `pin-input-props.test.ts` aserta valores del mapeo y ejecuta el callback con
  ceros preservados. Notas menores (no findings): `paths.test.ts` incluye un
  check `typeof === "function"` por entrada (contract test aceptable para un
  mapa declarativo, complementado con set exacto de claves y eliminación de
  `ICON_PATHS`); `sidebar-layout.test.ts` pinea la constante
  `SIDEBAR_LAYOUT_ID` (regression guard de la clave de persistencia).
- **Sin excepción TDD invocada** en este change (correcto: no está en
  `testing.tdd_exceptions`).

## Review workload / PR boundary

Forecast: 1.400–2.200 líneas, riesgo High, chained PRs recomendados (split 4
PRs), `Delivery strategy: ask-on-risk`, `Chain strategy: pending`. Resolución:
`size:exception` **explícitamente aceptada por el usuario** (registrada en
apply-progress) y entrega como 8 commits atómicos revertibles + 1 fix de
formato (`3eae971`, desviación documentada). Sin scope creep: cada commit
mapea 1:1 al design §6. Conforme.

## Evidencia dev/SSR (no re-ejecutada en esta fase)

Presupuesto de tiempo ajustado: el orquestador aportó evidencia fresca al mismo
HEAD `d287992` (sin cambios desde entonces, verificado con `git log`/`status`):
dev server HTTP 200 en `/login`, `/login-verification?email=a%40b.c`,
`/dashboard`; HTML SSR completo (4.2K/7.6K/15K bytes) sin mismatch en log;
proceso vite matado. Los escenarios de hidratación/SSR se apoyan además en la
estructura del código (snapshot estable por `defaultSize` único + patrón D8
post-mount; `id` estable "otp-input" en pin-input). No se levantaron dev
servers en esta fase → nada que matar.

## Findings

- **W1 (WARNING — documentación TDD):** la tabla `TDD Cycle Evidence` de
  apply-progress.md solo consolida commits 7-8. La evidencia RED→GREEN de los
  commits 1-6 existe y fue verificada (cuerpos de commit + checkboxes de
  tasks.md + tests reales verdes), pero el artifact no la consolida. Recomendado
  antes de archive: extender la tabla con las filas de commits 1-6.
- **W2 (WARNING — tensión spec/design, resuelta por design):** el escenario
  "Imports confinados verificables por grep" de `vendor-bindings` dice literal
  "todas las coincidencias bajo `src/components/vendor/`", pero `xstate` se
  importa en `lib/otp/` (adapter de dominio autorizado explícitamente por
  design D-SA4 y requerido por la spec `web-auth-ui`). Resolución coherente y
  documentada en código; la redacción de la spec queda menos precisa que el
  design. Sin acción requerida.
- **Observación (no finding):** `import type { Middleware } from
  "@octanejs/vite-plugin"` en `lib/nav/redirect.ts` es tooling del framework
  (type-only), no binding de UI — no viola la regla §9.
- **Observación (no finding):** `openspec/config.yaml` y las addenda de specs
  `frontend-foundation` están modificadas en working tree sin commitear, por la
  política del repo de no commitear `openspec/` en commits incrementales
  (declarado en cuerpo de `d287992`). Estado intencional.

## Blockers

Ninguno.
