# Apply Progress — stack-alignment

> Change SDD: `stack-alignment` (CRM-HOME) · Fase: apply (COMPLETA — 8/8 commits)
> Backend de artefactos: openspec. STRICT TDD activo (sin excepción en este change).
> Entrega: `size:exception` aceptada por el usuario — 8 commits atómicos en develop.

## Estado global

**44/44 tareas `- [x]`. Los 8 commits del design §6 están en develop.**

| Commit | Hash | Título |
| --- | --- | --- |
| 1 | `bd89f19` | chore(deps): pin effect + xstate + @octanejs/xstate en api y web con smoke tests |
| 2 | `09de734` | refactor(icons): swap vendor/icons a @octanejs/phosphor-icons |
| 3 | `8563e33` | refactor(otp-input): swap vendor/otp-input a @octanejs/zag pin-input |
| 4 | `a48b8cd` | refactor(otp): migrar FSM lib/otp a xstate preservando puerto OtpVerifier |
| 5 | `8221f42` | feat(shell): sidebar resizable con @octanejs/resizable-panels |
| 6 | `f536ae5` | feat(vendor): wrappers toast (@octanejs/sonner) y hooks (@octanejs/usehooks-ts parcial) |
| — | `3eae971` | style(shell): normalizar formato de lib/nav (fix de formato del commit 5) |
| 7 | `ff8f08a` | chore(i18n): evaluar @octanejs/i18next (gate D-SA3): no se adopta (rama B) |
| 8 | `d287992` | docs(stack-alignment): corregir PRD §9/§10 con bindings @octanejs/* y diferidos |

## Esta sesión (continuación final — commits 7 y 8)

### WIP heredado resuelto

- `apps/web/src/lib/nav/sidebar-collapse.ts` + `sidebar-layout.ts`: reformato sin
  cambio de comportamiento (dedent JSDoc + clamp multilínea) → commit `3eae971`
  como `style(shell)` (fix de formato del commit 5, NO del commit 7).
- `apps/web/src/components/vendor/i18n/README.md` (untracked): documentación del
  gate D-SA3 → commit 7 (`ff8f08a`).

### Commit 7 — gate i18n (rama B: NO se adopta)

- `@octanejs/i18next@0.1.47` fue instalado pineado, inspeccionado (port de
  react-i18next@17.0.9; expone `initReactI18next`, `I18nextProvider`,
  `setI18n`/`getI18n`, `useTranslation`, `Trans`) y desinstalado sin commit de
  dependencia. Verificado: el binding NO está en `apps/web/package.json`.
- Decisión documentada en el README del wrapper: integración propia sobre
  `i18next@26.4.2` mantenida como variante equivalente §9 (funciona en SSR +
  hidratación, 5 tests intactos, swap de valor nulo hoy, riesgo asimétrico de
  hidratación). Criterio de re-evaluación registrado en `openspec/config.yaml`
  (gate abierto: cuando un change necesite `Trans`/ICU/pluralización).
- Contrato público intacto: `I18nProvider`, `useT()`, `t()`, `createI18n(options)`,
  `subscribeLanguageChange()`. Consumidores sin cambios.

### Commit 8 — docs (D-SA2 + correcciones)

- `docs/PRD-v2.md` (COMMITEADO en `d287992`):
  - §9 tabla de wrappers reescrita: bindings `@octanejs/*` adoptados (zag
    pin-input, phosphor-icons, resizable-panels, sonner, usehooks-ts cohorte
    PARCIAL), i18next integración propia mantenida, ErrorBoundary NATIVA de
    Octane 0.2.3 (NO react-error-boundary), diferidos con change consumidor
    (lexical/dnd-kit → tasks, day-picker/recharts → schedule, colorful → config,
    tanstack table/virtual → data layer, spring → primera animación).
  - "tanstack charts" (NO existe) → `@octanejs/recharts` (§8.4 y §9).
  - nuqs y tanstack router/router-ssr-query marcados NO aplicables (§7, §9, §10).
  - §10 stack frontend con nombres `@octanejs/*`; backend ya lista effect+xstate.
- `openspec/config.yaml` (editado, NO commiteado por política openspec/):
  `stack.frontend` reescrito con secciones `adoptados` / `no_aplican` /
  `diferidos`, cohorte parcial de usehooks-ts, error-boundary nativo D-SA2,
  gate de re-evaluación i18n.
- Addenda (NO reescritura) en specs activas de `frontend-foundation` (editadas,
  NO commiteadas): `web-auth-ui` (D1 → D-SA1), `web-shell` (D4 → D-SA8,
  D8 → D-SA6 con evolución de storage `"crm-sidebar"` → `"crm-sidebar-layout"`).

## Verificación final (cierre — batería global spec vendor-bindings)

- `bun test` workspace raíz: **54 pass / 0 fail** (12 archivos). ✅
- Typecheck `apps/web` (`tsrx-tsc`) y `apps/api` (`tsc`): **verdes**. ✅
- Dev server HTTP 200: `/login`, `/login-verification?email=a%40b.c`,
  `/dashboard` (curl; proceso vite matado, `pgrep` limpio). ✅
- SSR: HTML servido completo en las 3 rutas (4.2K/7.6K/15K bytes) sin mismatch
  reportado en log del dev server. ✅
- Grep de confinamiento: ✅
  - `@octanejs/*` UI / `@zag-js/*` / `phosphor-icons` / `sonner`: solo bajo
    `components/vendor/` (matches restantes = comentarios JSDoc + import de
    TIPO `Middleware` de `@octanejs/vite-plugin`, tooling del framework).
  - `xstate` en web: solo `lib/otp` (adapter de dominio, D-SA4).
  - `effect`/`xstate` en api: solo `src/infrastructure/`.
- Greps documentales: "tanstack charts" eliminado; "nuqs"/"router-ssr-query"
  solo como no-aplicables; cada diferido con su change consumidor. ✅
- Contratos públicos intactos: `OtpInputProps`, `Icon`/`IconName`,
  `I18nProvider`/`useT()`/`t()`, `SidebarNavProps`, fachada `createOtpMachine`. ✅

## TDD Cycle Evidence (commits 7-8 de esta sesión)

| Task | RED | GREEN | TRIANGULATE | REFACTOR |
| --- | --- | --- | --- | --- |
| Commit 7 (gate i18n) | N/A — gate documental: rama B mantiene los 5 tests de `lib/i18n/i18n.test.ts` intactos como contrato | Suite verde sin cambios de producción | Dev 200 en las 3 rutas con integración actual (SSR + hidratación) | README addendum como única entrega |
| Commit 8 (docs) | N/A — commit documental (tasks.md: "el 8 es docs; solo verifica greps documentales") | Greps documentales verdes | Verificación transversal completa post-commit | — |

## Desviaciones del design

- Se añadió un commit extra `3eae971` (`style(shell)`): reformato sin cambio de
  comportamiento de `lib/nav` (WIP heredado del intento anterior, evaluado como
  fix de formato del commit 5, no del commit 7).
- El commit 8 contiene solo `docs/PRD-v2.md`: `openspec/config.yaml` y las
  addenda de specs quedan editadas en el working tree pero SIN commitear, por
  la política explícita del repo de no commitear `openspec/` en los commits
  incrementales. El cuerpo del commit lo declara.

## Tareas restantes

Ninguna. 44/44 `- [x]`.

## Workload / PR boundary

Forecast original: 1.400–2.200 líneas, riesgo High, split sugerido en 4 PRs.
Resolución: `size:exception` aceptada por el usuario; entrega como 8 commits
atómicos + 1 fix de formato directamente en develop (revertibles en aislamiento).

## Próximo paso

`sdd-verify` (batería de verificación del change contra acceptance criteria).
