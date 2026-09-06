# Tasks — stack-alignment

> Change SDD: `stack-alignment` (CRM-HOME) · Fase: tasks
> Fuentes: `design.md` (D-SA1…D-SA8, orden de 8 commits §6, plan de tests §7),
> `specs/{vendor-bindings,web-auth-ui,web-shell,design-system,web,api}/spec.md`,
> `proposal.md`, `openspec/config.yaml`.
> STRICT TDD activo (sin excepción en este change): RED → GREEN → TRIANGULATE →
> REFACTOR por swap. Runner: `bun test`. Commits: Conventional Commits (husky +
> commitlint), un binding/swap por commit, lockfile commitado por commit.
> Instalación manual: `bun add <pkg>@<versión-exacta>` (octane 0.2.3 sin CLI).

## Review Workload Forecast

| Field | Value |
| ------- | ------- |
| Estimated changed lines | 1.400–2.200 (4 swaps de wrappers + FSM xstate + shell sidebar + 3 wrappers nuevos + 2 smoke tests + ~12 deps pineadas + docs PRD/config + 17 tests re-apuntados + 5-6 tests nuevos) |
| 400-line budget risk | High |
| Chained PRs recommended | Yes |
| Suggested split | PR 1 (commits 1-2: deps fundacionales + icons) → PR 2 (commits 3-4: otp-input zag + FSM xstate) → PR 3 (commits 5-6: sidebar resizable + wrappers toast/hooks) → PR 4 (commits 7-8: gate i18n + docs) |
| Delivery strategy | ask-on-risk |
| Chain strategy | pending |

Decision needed before apply: Yes
Chained PRs recommended: Yes
Chain strategy: pending
400-line budget risk: High

> **Precondición obligatoria (design §8, ask-on-risk):** antes del commit 1,
> elevar al usuario la estrategia de tamaño: `size:exception` con los 8 commits
> atómicos, o split en sub-changes / PRs encadenados según el forecast. Este
> change NO implementa nada hasta esa decisión.

## Verificación transversal por commit (repetir en cada uno)

Aplica a los commits 1-7 (el 8 es docs; solo verifica greps documentales):

- `bun test` verde en workspace raíz.
- Typecheck verde en `apps/web` y `apps/api`.
- Dev server HTTP 200 en las rutas tocadas por ese commit (commit 1: ninguna;
  commits 2 y 5: `/dashboard` + resto del shell; commits 3 y 4:
  `/login`, `/login-verification?email=a%40b.c`; commit 7: todas).
- SSR sin mismatch de hidratación en esas rutas.
- Grep de confinamiento: imports de `@octanejs/*`, `@zag-js/*`, `phosphor-icons`,
  `react-resizable-panels`, `sonner`, `xstate` solo bajo
  `apps/web/src/components/vendor/`; `effect`/`xstate` en api solo bajo
  `src/infrastructure/` o `src/http/`.
- Peer ranges del binding verificados contra `octane@0.2.3` y `vite@8`.
- Commit Conventional Commits + lockfile actualizado, commitado y revertible
  en aislamiento.

## Commit 1 — `chore(deps): pin effect + xstate + @octanejs/xstate en api y web con smoke tests` (D-SA7)

- [x] Verificar peer ranges de `effect`, `xstate` y `@octanejs/xstate@0.0.10` contra `octane@0.2.3` y `vite@8` (anotar evidencia en el cuerpo del commit). <!-- sdd-owner: implementation -->
- [x] RED: crear `apps/api/src/infrastructure/effect.smoke.test.ts` con 1 caso (`Effect.runSync(Effect.succeed(1)) === 1`) y `apps/api/src/infrastructure/xstate.smoke.test.ts` con 1 caso (`createActor(createMachine({ initial: "idle", states: { idle: {} } })).start().value === "idle"`); ejecutar `bun test` y confirmar fallo por módulo no resoluble. <!-- sdd-owner: implementation -->
- [x] GREEN: `bun add` pineado exacto en `apps/api` (`effect`, `xstate`, `@octanejs/xstate@0.0.10`) y en `apps/web` (`effect`, `xstate`, `@octanejs/xstate@0.0.10`); ejecutar `bun test` hasta verde. <!-- sdd-owner: implementation -->
- [x] Documentar en el cuerpo del commit el diferimiento del wiring efectivo de effect en api al primer change consumidor de adapters (motivo D-SA7: sin adapter real sería lógica decorativa; la spec `api` lo admite como requisito condicional). <!-- sdd-owner: implementation -->
- [x] Verificación de commit: suite verde, typecheck verde en ambos paquetes, grep de confinamiento (los únicos imports de `effect`/`xstate` del repo viven bajo `src/infrastructure/` y `components/vendor/`-equivalente), lockfile commitado. <!-- sdd-owner: implementation -->

## Commit 2 — `refactor(icons): swap vendor/icons a @octanejs/phosphor-icons` (D-SA8)

- [x] `bun add @octanejs/phosphor-icons@0.0.32` en `apps/web` con pin exacto; verificar peer ranges. <!-- sdd-owner: implementation -->
- [x] RED: re-apuntar/verificar los tests existentes del wrapper icons contra el contrato público (`Icon`/`IconProps`, union cerrada `IconName` de 12 íconos) de modo que fallen contra la implementación nueva aún ausente (mapa nombre→componente binding en `paths.ts`). <!-- sdd-owner: implementation -->
- [x] GREEN: reescribir `apps/web/src/components/vendor/icons/paths.ts` como mapa `IconName` → export del binding y `icon.tsrx` para delegar en el componente phosphor con `size`, `weight="regular"`, `fill="currentColor"` y el mismo manejo de `role`/`aria-hidden`; eliminar `ICON_PATHS` vendored; suite verde. <!-- sdd-owner: implementation -->
- [x] TRIANGULATE/REFACTOR: confirmar que el tipado rechaza íconos fuera de la union `IconName` en compilación y que ningún consumidor (shell, atoms, páginas) requirió cambios de contrato. <!-- sdd-owner: implementation -->
- [x] Registrar evidencia de tree-shaking (build de `apps/web`: solo los 12 íconos de `IconName` en el bundle) y de SSR del SVG sin mismatch en una pantalla del shell; adjuntarla en el cuerpo del commit/PR (spec design-system). <!-- sdd-owner: implementation -->
- [x] Actualizar `apps/web/src/components/vendor/icons/README.md` con addendum de provenance (D4 superseded by D-SA8). <!-- sdd-owner: implementation -->
- [x] Verificación de commit: verificación transversal completa con `/dashboard` y resto del shell a 200 sin mismatch. <!-- sdd-owner: implementation -->

## Commit 3 — `refactor(otp-input): swap vendor/otp-input a @octanejs/zag pin-input` (D-SA1)

- [x] `bun add @octanejs/zag@0.0.18` + `bun add @zag-js/pin-input@<versión-exacta>` en `apps/web`; verificar peer ranges; lockfile commitado. <!-- sdd-owner: implementation -->
- [x] RED: re-enfocar los 8 tests existentes de `apps/web/src/components/vendor/otp-input/machine.test.ts` → nuevo `pin-input-props.test.ts` contra `toPinInputProps` (aún inexistente), cubriendo los mismos comportamientos a nivel de contrato: default length 6, rechazo de no-numéricos vía `pattern: "[0-9]*"`/`type: "numeric"`, `onComplete` → `onValueComplete(details.valueAsString)` con ceros a la izquierda preservados, disabled inerte, invalid → data-attribute; confirmar fallo. <!-- sdd-owner: implementation -->
- [x] GREEN: crear `pin-input-props.ts` (TS puro: mapeo `OtpInputProps` → props de la máquina zag, `otp: true`, nunca `type="number"`); reescribir `otp-input.tsrx` con `useMachine(pinInput.machine)` + `connect(service, normalizeProps)` de `@octanejs/zag`; migrar styling a data-attributes (`data-invalid`, `data-complete`, `data-disabled`) con los mismos tokens; eliminar `machine.ts` y `normalize-props.ts`; `index.ts` exporta `OtpInput` + `OtpInputProps` sin cambios; suite verde. <!-- sdd-owner: implementation -->
- [x] TRIANGULATE/REFACTOR: verificar comportamiento §8.1 en `/login-verification`: 6 dígitos con ceros, paste distribuido (`"041283"`), auto-avance/retroceso, `inputmode="numeric"`, `autocomplete="one-time-code"`; `OtpInputProps` idéntica hacia los consumidores. <!-- sdd-owner: implementation -->
- [x] Si el service de `@octanejs/zag` diverge del runtime de Octane en la práctica: ejecutar la cadena de fallback D-SA1 (`@octanejs/input-otp@0.0.19`; último fallback: máquina hand-rolled actual) manteniendo contrato y tests equivalentes, y documentar el desenlace en el commit. <!-- sdd-owner: implementation -->
- [x] Actualizar `apps/web/src/components/vendor/otp-input/README.md` con addendum de provenance (D1 superseded by D-SA1) y la justificación del re-enfoque de los 8 tests (cobertura residual = contrato; lógica de máquina cubierta por la suite CI de zag upstream). <!-- sdd-owner: implementation -->
- [x] Verificación de commit: verificación transversal completa con `/login` y `/login-verification?email=a%40b.c` a 200 sin mismatch. <!-- sdd-owner: implementation -->

## Commit 4 — `refactor(otp): migrar FSM lib/otp a xstate preservando puerto OtpVerifier` (D-SA4)

- [x] RED: re-apuntar los 9 tests de `apps/web/src/lib/otp/otp-machine.test.ts` a la API de actor xstate (`createActor`, `send`, `snapshot.context`) manteniendo los mismos casos: idle→ready por completitud, submit solo desde ready con intentos, invalid consume intento (5→4), bloqueo a 0 intentos sin llamar al verifier, expired desde el verifier, success, reset restaura intentos, código como string con ceros; confirmar fallo contra la implementación nueva ausente. <!-- sdd-owner: implementation -->
- [x] GREEN: migrar `apps/web/src/lib/otp/otp-machine.ts` a xstate v5 (`setup().createMachine()` + `fromPromise` para el puerto `OtpVerifier`; context `{ code, attemptsRemaining }` como DATOS, nunca strings); preservar idénticos `OTP_MAX_ATTEMPTS`, `OTP_EXPIRES_MINUTES`, `OTP_CODE_LENGTH`, `Verdict`, `OtpVerifier`, `FakeOtpVerifier` y la fachada pública `createOtpMachine(options): OtpMachine` (`getState`/`setCode`/`submit`/`reset` como adapter actor→interfaz); suite verde. <!-- sdd-owner: implementation -->
- [x] TRIANGULATE/REFACTOR: verificar que `/login-verification` funciona sin cambios de consumidor (fachada intacta) y que el change de auth podrá inyectar el verifier real por el puerto sin tocar UI ni máquina. <!-- sdd-owner: implementation -->
- [x] Verificación de commit: verificación transversal completa con `/login-verification?email=a%40b.c` a 200 sin mismatch; imports de `xstate` confinados a `lib/otp` (adapter de dominio) según design D-SA4. <!-- sdd-owner: implementation -->

## Commit 5 — `feat(shell): sidebar resizable con @octanejs/resizable-panels` (D-SA6)

- [x] `bun add @octanejs/resizable-panels@0.0.10` en `apps/web` con pin exacto; verificar peer ranges. <!-- sdd-owner: implementation -->
- [x] RED: crear `apps/web/src/lib/nav/sidebar-layout.test.ts` (3-4 casos) contra `sidebar-layout.ts` inexistente: constantes coherentes (`collapsedSize < minSize < defaultSize < maxSize`), `isCollapsedSize(size)`, clamp de límites; confirmar fallo. <!-- sdd-owner: implementation -->
- [x] GREEN: crear `apps/web/src/lib/nav/sidebar-layout.ts` (constantes y funciones puras; valores iniciales `defaultSize ≈ 20`, `minSize ≈ 15`, `maxSize ≈ 30`, `collapsedSize ≈ 5` en %) y el wrapper mínimo `apps/web/src/components/vendor/resizable/index.ts` (re-exports tipados `Group`, `Panel`, `Separator`, `type PanelHandle`); suite verde. <!-- sdd-owner: implementation -->
- [x] GREEN (wiring): reescribir `apps/web/src/routes/__app-shell.tsrx` con `<Group direction="horizontal" autoSaveId="crm-sidebar-layout">` + `Panel` collapsible con ref imperativo + `Separator` + `Panel` para `<main id="content">`; crear `SidebarCollapseContext` en el shell; adaptar `apps/web/src/components/organisms/sidebar-nav/sidebar-nav.tsrx` para derivar `collapsed` del contexto y que el toggle llame `panelRef.collapse()/expand()`; eliminar el storage propio `"crm-sidebar"`; `SidebarNavProps { url }` intacto. <!-- sdd-owner: implementation -->
- [x] TRIANGULATE/REFACTOR: ajuste fino de porcentajes con verificación visual de paridad; comportamiento colapsado conservado (solo ícono + `title`/`aria-label`); verificar WCAG 2.1.1 (toggle `<button>` con Enter/Espacio, separador con rol `separator` + flechas + ARIA del binding, cero handlers de teclado custom). <!-- sdd-owner: implementation -->
- [x] Documentar en la spec/commit la evolución del formato de storage: `"crm-sidebar"` (booleano) abandonada → `"crm-sidebar-layout"` (gestionada por el binding); sin migración de datos (preferencia cosmética). <!-- sdd-owner: implementation -->
- [x] Verificación de commit: verificación transversal completa con `/dashboard` y resto del shell a 200; SSR/hidratación siempre con `defaultSize` (sin lectura de storage en render → sin mismatch; ajuste visual post-mount aceptado como patrón D8). <!-- sdd-owner: implementation -->

## Commit 6 — `feat(vendor): wrappers toast (@octanejs/sonner) y hooks (@octanejs/usehooks-ts parcial)` (D-SA5)

- [x] `bun add @octanejs/sonner@0.1.47` y `bun add @octanejs/usehooks-ts@0.0.34` en `apps/web` con pins exactos; verificar peer ranges. <!-- sdd-owner: implementation -->
- [x] Crear `apps/web/src/components/vendor/toast/` con `index.ts` (exporta `Toaster` de `toaster.tsrx` y `toast(message, { variant?: "info" | "success" | "error" })`) y README; sin tests propios (mapeo declarativo sin lógica propia); sin consumidor en este change. <!-- sdd-owner: implementation -->
- [x] Crear `apps/web/src/components/vendor/hooks/index.ts` con re-export explícito SOLO de la cohorte host-safe (`useBoolean`, `useCounter`, `useToggle`, `useMap`, `useStep`, `useDebounceCallback`, `useDebounceValue`, `useInterval`, `useTimeout`, `useIsMounted`, `useUnmount`) y README documentando los hooks AUSENTES (storage/media/DOM-observer) y la regla "cuando se necesite uno ausente se decide su variante en el change consumidor". <!-- sdd-owner: implementation -->
- [x] Verificación de commit: verificación transversal completa (grep: `@octanejs/sonner`/`sonner` solo bajo `vendor/toast/`, `@octanejs/usehooks-ts` solo bajo `vendor/hooks/`); suite y typecheck verdes. <!-- sdd-owner: implementation -->

## Commit 7 — `chore(i18n): evaluar @octanejs/i18next (gate D-SA3)` (D-SA3)

- [x] Commit de evaluación: `bun add @octanejs/i18next@0.1.47` pineado en `apps/web` e inspeccionar su API (creación/inyección de instancia + hooks) contra la condición de la spec `web` (instancia creable en `lib/i18n/config.ts` para SSR + hidratación). <!-- sdd-owner: implementation -->
- [x] Rama A (adopta): convertir el commit en `refactor(i18n): swap vendor/i18n a @octanejs/i18next`; RED: adaptar los 5 tests de `apps/web/src/lib/i18n/i18n.test.ts` a la implementación nueva manteniendo los mismos casos; GREEN: delegar `components/vendor/i18n/` en el binding preservando `I18nProvider`, `useT()`, `t()`, `createI18n(options)`, `subscribeLanguageChange()`; verificar SSR + hidratación y español por defecto. <!-- sdd-owner: implementation -->
- [x] Rama B (no adopta): `git revert` del commit de evaluación; mantener la integración actual (5 tests intactos); documentar la decisión como "variante equivalente §9" y registrar la re-evaluación en `openspec/config.yaml` diferidos con el criterio de adopción ("cuando el binding exponga instancia creable en config.ts"). <!-- sdd-owner: implementation -->
- [x] Verificación de commit: verificación transversal completa en todas las rutas (`/login`, `/login-verification`, `/dashboard`); en cualquier desenlace los consumidores no cambian. <!-- sdd-owner: implementation -->

## Commit 8 — `docs: corregir PRD §9/§10 y config.yaml; addenda D1/D4/D8` (D-SA2, correcciones documentales)

- [x] Corregir `docs/PRD-v2.md` §10: "tanstack charts" → `@octanejs/recharts` (diferido a schedule); tanstack `router`/`router-ssr-query` y `nuqs` marcados como NO aplicables (router MPA propio + `URLSearchParams`); nombres `@octanejs/*` en el stack. <!-- sdd-owner: implementation -->
- [x] Corregir `docs/PRD-v2.md` §9 (tabla de wrappers): anotar que los wrappers encapsulan bindings `@octanejs/*`, que `OtpInput` encapsula zag pin-input (o el fallback ejecutado en commit 3) y que `Charts` corresponde a recharts. <!-- sdd-owner: implementation -->
- [x] Reescribir `openspec/config.yaml` `stack.frontend` con nombres `@octanejs/*` y sección de diferidos con change consumidor (lexical→tasks, dnd-kit→kanban, day-picker→schedule, recharts→schedule con nota "SSR no testeado; Brush/Treemap no soportados", colorful→categorías, tanstack-{store,db,query,form,table,virtual}→data layer, spring→primera animación, testing-library→primer test DOM, shiki→sin consumidor); registrar error-boundary nativo de Octane 0.2.3 (D-SA2: binding NO instalado, divergencia component-stack vacío documentada, patrón `RootBoundaryOptions.catch` + `ErrorBoundary`/`@try`-`@catch` nativos, wiring de raíz diferido al primer change con UI de error) y la limitación parcial de usehooks-ts (cohorte + ausentes); registrar la re-evaluación i18n si el commit 7 fue rama B. <!-- sdd-owner: implementation -->
- [x] Addendar (NO reescribir) las specs activas de `frontend-foundation` que citen D1 (otp-input), D4 (icons) y D8 (sidebar) con referencia a D-SA1/D-SA6/D-SA8; `frontend-foundation/design.md` queda como registro histórico intacto. <!-- sdd-owner: implementation -->
- [x] Verificación del commit: greps documentales — "tanstack charts" ya no existe en PRD/config; "nuqs" y "router-ssr-query" solo aparecen marcados como no aplicables; cada diferido figura con su change consumidor. <!-- sdd-owner: implementation -->

## Cierre del change (tras el commit 8)

- [x] Ejecutar la batería de criterios globales de la spec `vendor-bindings`: `bun test` verde en workspace raíz (≥ tantos tests de comportamiento OTP/i18n como antes), typecheck verde en ambos paquetes, dev server 200 en todas las rutas, SSR sin mismatch en `/login`, `/login-verification?email=a%40b.c` y `/dashboard`, grep de confinamiento global limpio, contratos públicos de wrappers idénticos (`OtpInputProps`, `Icon`/`IconName`, `I18nProvider`/`useT()`/`t()`, `SidebarNavProps`). <!-- sdd-owner: implementation -->
