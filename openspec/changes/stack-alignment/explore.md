# Explore — stack-alignment

> Change SDD: `stack-alignment` (CRM-HOME) · Fase: explore
> Repo verificado en `develop` (HEAD 5b85673): `apps/web/package.json`,
> `apps/api/package.json`, `package.json` raíz, `apps/web/src/components/vendor/**`,
> `apps/web/src/components/organisms/sidebar-nav/`, `apps/web/src/lib/{otp,theme,nav,i18n}/`,
> `node_modules/octane/package.json` (0.2.3), `node_modules/@octanejs/vite-plugin/package.json` (0.1.52),
> `docs/PRD-v2.md` §9/§10, `openspec/config.yaml`,
> `openspec/changes/frontend-foundation/design.md` (D1, D4, D7, D8, D9).
> Tests actuales contados: **43** (2 api + 41 web), todos TS puro sin DOM.

## 1. Brecha real de deps vs PRD §10

### apps/web (hoy: 4 deps + 6 devDeps)

| PRD §10 declara | Estado real | Brecha |
| --- | --- | --- |
| octanejs (tsrx) | `octane@0.2.3` + `@octanejs/vite-plugin@0.1.52` | ✔ |
| vite / bun / tailwindcss / @fontsource/poppins | instalados (vite 8.2.2, tailwind 4.3.3, poppins 5.3.0) | ✔ |
| i18next | `i18next@26.4.2` directo (sin binding `@octanejs/i18next`); integración Octane hand-rolled (`vendor/i18n/provider.tsrx`) | 🟡 parcial |
| zagjs | NO instalado — D1 cayó al fallback hand-rolled (zag v1 eliminó el runtime vanilla `createService`) | ✗ |
| input-otp | NO instalado — `vendor/otp-input` es máquina propia (`machine.ts`) + `normalize-props.ts` | ✗ |
| phosphor-icons | NO instalado — paths SVG vendored de `@phosphor-icons/core@2.1.1` como assets estáticos (D4) | ✗ |
| resizable-panels | NO instalado — sidebar de ancho fijo 260/64 px con toggle persistido (D8, "sin resize") | ✗ |
| effect, xstate | NO instalados en web | ✗ |
| tanstack (store, db, router, query, router-ssr-query, form, virtual, table) | NO instalados; sin consumidor aún | ✗ (diferible) |
| "tanstack charts" | **producto inexistente**; el binding real es `@octanejs/recharts` (gráfico de torta del schedule) | ✗ + error de docs |
| nuqs, lexical, colorful, usehooks-ts, react-error-boundary, day-picker, spring, dnd-kit, sonner | NO instalados; sin consumidor aún | ✗ (diferible) |

### apps/api (hoy: nitro, h3, orpc, kysely, pg, OTel completo)

| PRD §10 declara | Estado real | Brecha |
| --- | --- | --- |
| nitro, h3, orpc, kysely, PostgreSQL, bun, OpenTelemetry OTLP | instalados | ✔ |
| effect | NO instalado | ✗ |
| xstate | NO instalado | ✗ |
| shiki | NO instalado; sin consumidor claro en backend hoy | ✗ (diferible) |
| Makefile | no verificado en este explore | pendiente |

## 2. Wrappers hand-rolled actuales y su swap a bindings

Los 43 tests son la red de seguridad; los swaps mantienen el contrato público de cada wrapper.

### 2.1 `vendor/i18n` → `@octanejs/i18next`

- **Realidad matizada**: el wrapper YA usa `i18next` real; lo hand-rolled es solo la integración con Octane (`provider.tsrx`: `useT()` vía `useSyncExternalStore` + `I18nProvider` trivial, ~35 líneas) y `core.ts` (singleton `createI18n`/`t`/`subscribeLanguageChange`).
- **Swap**: el binding reemplaza provider/hook; `core.ts` pasa a delegar en la instancia que cree el binding. Contrato a preservar: `I18nProvider`, `useT()`, `t()`, `createI18n(options)`, `subscribeLanguageChange()` (lo consumen `lib/i18n/config.ts`, todos los componentes y `i18n.test.ts` — 5 tests).
- **Implicación**: bajo esfuerzo, bajo beneficio (el ahorro son ~35 líneas). Adoptar solo si el binding expone equivalente a `createInstance` + hook; si su API es rígida, mantener el wrapper actual y documentarlo como "variante equivalente §9" (el comentario D6 ya lo prevé).
- **SSR**: la instancia se crea en `lib/i18n/config.ts` importada por el layout raíz (SSR + hidratación); el binding debe permitir lo mismo.

### 2.2 `vendor/icons` → `@octanejs/phosphor-icons`

- **Hoy**: `<Icon name size aria-label class>` renderiza `<svg><path d>` con `ICON_PATHS` vendored (union cerrada `IconName` de 12 íconos, D4). Sin tests propios.
- **Swap**: el cuerpo de `Icon` delega en el componente del binding; props públicas idénticas. `IconName` se mantiene como union cerrada mapeada a exports del binding (el set sigue siendo decisión de design).
- **Implicación**: gana set completo y pesos sin vendorizar; exige verificar tree-shaking del binding (phosphor tiene ~1500 íconos) y que renderice en SSR (SVG puro, debería).
- **Riesgo**: bajo. Es el swap más limpio de los cuatro.

### 2.3 `vendor/otp-input` → `@octanejs/zag` (preferido) o `@octanejs/input-otp`

- **Hoy**: fallback D1 documentado — zag v1 eliminó el runtime vanilla, así que `machine.ts` (FSM propia: typeDigit/backspace/paste/reset, 8 tests headless) + `normalize-props.ts` (mapeo `onChange→onInput`, `inputMode→inputmode`, etc.) + `otp-input.tsrx`.
- **Swap preferido: `@octanejs/zag`**. Es el stack declarado (`stack.frontend.components: zagjs`) y resuelve D1 como se diseñó originalmente: si el binding provee el adapter Octane para máquinas zag, `pin-input` vuelve a ser la base. `@octanejs/input-otp` es la alternativa si zag no cubre pin-input o diverge.
- **Contrato a preservar** (`OtpInputProps`, estable hacia auth): `length`, `disabled`, `invalid`, `onComplete` (string con ceros preservados), `aria-label`. Comportamiento: auto-avance, backspace que retrocede, paste distribuido (`"041283"`), `inputmode="numeric"`, nunca `type="number"`.
- **Implicación tests**: los 8 tests de `machine.test.ts` se re-apuntan a la máquina del binding si es headless-testeable (ideal, patrón D10); si el binding no expone la máquina sin DOM, se reescriben como tests de comportamiento o se conserva una capa mínima propia — decisión de plan.
- **Riesgo**: medio. Es el swap con más superficie (máquina + normalizeProps + wiring de foco).

### 2.4 Sidebar colapsable → `@octanejs/resizable-panels`

- **Hoy**: D8 — ancho fijo 260↔64 px, toggle persistido en `localStorage["crm-sidebar"]`, transición CSS, SSR renderiza expandido (snapshot estable, sin mismatch). PRD §9 dice "laterales izquierdo y derecho **resizables** con resizable-panels": el diseño actual cumple colapso pero NO resize.
- **Swap**: el layout `__app-shell.tsrx` envuelve sidebar + `<main>` en los paneles del binding; el toggle de colapso se mantiene (los bindings de resizable-panels suelen soportar colapso programático). `SidebarNavProps { url }` no cambia.
- **Implicación**: alinear de verdad con §9 habilita también el panel derecho futuro. Hay que resolver: persistencia del ancho (hoy booleano; con resize sería porcentaje + flag de colapso), snapshot SSR/hidratación estable, y que el drag-handle cumpla teclado (WCAG 2.1.1 — hoy todo es `<a>`/`<button>` nativo).
- **Riesgo**: medio (SSR + persistencia + a11y del handle).

### 2.5 Hallazgo extra: segunda máquina hand-rolled candidata a xstate

`lib/otp/otp-machine.ts` (D9: `idle→ready→submitting→error|expired|success`, intentos/expiración como datos, puerto `OtpVerifier`) es una FSM propia con 9 tests. Es el **consumidor inmediato natural de `@octanejs/xstate`** (o xstate puro): rehacerla sobre xstate da uso real al paquete fundacional en vez de instalarlo sin consumidor. El puerto `OtpVerifier` y las constantes (`OTP_MAX_ATTEMPTS`, etc.) se preservan.

## 3. Bindings-status.md — estado de la consulta

**Limitación honesta**: este entorno no tiene herramienta de fetch web y no hay copia local de `bindings-status.md` en el repo. La tabla fue verificada por el orquestador (existe, está en beta). **Pendiente explícito para specify/plan** — consultar y registrar por paquete (cobertura de API, divergencias conocidas, soporte SSR):

1. `@octanejs/zag` — ¿cubre `pin-input`? ¿cómo se crea el service en Octane (el problema exacto que forzó el fallback D1)?
2. `@octanejs/input-otp` — alternativa al anterior; ¿máquina headless testeable?
3. `@octanejs/xstate` (+`xstate-store`) — API para la FSM de `lib/otp`.
4. `@octanejs/phosphor-icons` — tree-shaking, SSR, nombres de export.
5. `@octanejs/i18next` — ¿expone createInstance/hook o provider rígido?
6. `@octanejs/resizable-panels` — SSR, colapso programático, persistencia, a11y de teclado del handle.
7. `@octanejs/sonner`, `@octanejs/usehooks-ts`, `@octanejs/react-error-boundary` — madurez y SSR (si se adoptan ahora).
8. effect — TS puro, sin binding; verificar solo versión compatible con bun.

## 4. Instalar ahora vs diferir (criterio: uso inmediato o fundacional)

### Instalar AHORA (tienen consumidor en este change)

| Paquete | Consumidor inmediato |
| --- | --- |
| `@octanejs/zag` o `@octanejs/input-otp` | swap `vendor/otp-input` (§2.3) |
| `@octanejs/phosphor-icons` | swap `vendor/icons` (§2.2) |
| `@octanejs/i18next` | swap `vendor/i18n` (§2.1, condicionado a su API) |
| `@octanejs/resizable-panels` | sidebar resizable §9 (§2.4) |
| `@octanejs/xstate` (web) | FSM de `lib/otp/otp-machine.ts` (§2.5) |
| `xstate` + `effect` (api, TS puro) | stack fundacional §10 backend; effect lo usarán los adapters (Telemetry, repositorios) |

### Diferir al change de su feature (documentar en proposal + config.yaml)

| Paquete | Change que lo consume |
| --- | --- |
| `@octanejs/lexical` | descripciones de tareas (tasks) |
| `@octanejs/dnd-kit` | kanban de BaseView (tasks) |
| `@octanejs/day-picker` | schedule |
| `@octanejs/recharts` | gráfico de torta de schedule |
| `@octanejs/colorful` | colores de categorías (config) |
| `@octanejs/tanstack-{store,db,query,form,table,virtual}` | data layer de módulos (BaseView) |
| `@octanejs/sonner` | primer flujo con toasts (auth o tasks) |
| `@octanejs/spring` | primera animación real |
| `@octanejs/usehooks-ts` | cuando un hook concreto se necesite (peso muerto hoy) |
| `@octanejs/react-error-boundary` | evaluar: si Octane 0.2.3 expone ErrorBoundary nativo, el binding es innecesario (verificar en `octane/dist/index.d.ts` durante plan) |
| `@octanejs/testing-library` | cuando se testeen componentes con DOM (hoy todo es TS puro, patrón D10) |
| `shiki` (api) | sin consumidor claro en §10 backend; diferir hasta tenerlo |

### Correcciones de docs detectadas (parte del objetivo del change)

1. **PRD §10 y config.yaml: "tanstack charts" no existe** → reemplazar por recharts.
2. **PRD §10 y config.yaml: tanstack `router`/`router-ssr-query` probablemente no aplican** — la app usa el router MPA de Octane (`RenderRoute` de app-core, D2/D3/D5). Decidir: corregir docs (recomendado) o justificar convivencia.
3. **nuqs**: D9 ya decidió `URLSearchParams` estándar en MPA; nuqs es React. Corregir docs en vez de instalar.
4. **PRD §9 tabla de wrappers**: `OtpInput` encapsula "input-otp" → actualizar a zag pin-input si se adopta `@octanejs/zag`; `Charts` → recharts; anotar que los wrappers encapsulan bindings `@octanejs/*`.
5. **config.yaml `stack.frontend`**: reflejar diferidos (§4) para que el próximo change no vuelva a encontrar la brecha.
6. **`frontend-foundation/design.md` D1/D4/D8**: quedan como registro histórico; las specs activas de `frontend-foundation` (no archivado) que citen esas decisiones deben addendarse, no reescribirse.

## 5. Riesgos

| Riesgo | Nivel | Mitigación |
| --- | --- | --- |
| Madurez beta de bindings (tabla bindings-status en beta, versiones 0.x) | 🟡 | Pin exacto de versiones (el repo ya pinea sin `^`), lockfile commitado, un binding por commit |
| `@octanejs/zag` no resuelve el problema original de D1 (service vanilla ausente en zag v1) | 🟡 | Verificar en bindings-status antes de decidir; fallback `@octanejs/input-otp`; último fallback: mantener máquina propia (estado actual, ya testeado) |
| `octane add` / `octane doctor` / `octane analyze` no están en el repo: `octane@0.2.3` no trae bin (verificado en su package.json) | 🟡 | El CLI es paquete aparte; instalarlo como devDep o hacer `bun add @octanejs/<pkg>` manual. Verificar en plan qué más hace `octane add` (¿registra en config?) |
| Compatibilidad de versiones de bindings con `octane@0.2.3` y `vite@8` | 🟡 | Chequear peerRanges al instalar; `octane doctor` (exit 3) tras cada instalación si el CLI está disponible |
| SSR: cualquier binding que toque DOM en render rompe el shell (SSR + hidratación con snapshots estables, D3/D8) | 🟡 | Criterio de aceptación: SSR limpio + sin mismatch de hidratación por cada swap; columna SSR de bindings-status |
| Re-apunte de tests: los 8 tests de máquina OTP y 5 de i18n dependen de la implementación interna | 🟢 | Contratos públicos estables; tests de comportamiento se re-apuntan, no se borran; strict_tdd en cada swap |
| Exceder `review_budget: 400` (4 swaps + docs) | 🟡 | `ask-on-risk`: elevar al usuario antes de implementar; commits atómicos por wrapper |
| Alcance creeping: instalar los 26 paquetes declarados "porque el PRD los lista" | 🟢 | Criterio §4: solo consumidor inmediato o fundacional; el resto se documenta como diferido |

## 6. Preguntas abiertas para specify/plan

1. ¿`@octanejs/zag` cubre pin-input con service creable en Octane? (decide §2.3)
2. ¿El CLI de Octane se instala como devDep del repo o instalación manual con `bun add`?
3. ¿Octane 0.2.3 tiene ErrorBoundary nativo? (decide si `@octanejs/react-error-boundary` entra ahora)
4. ¿La FSM de `lib/otp` migra a xstate en este change o se difiere? (recomendado: ahora, da consumidor real a xstate)
5. ¿Se adopta `@octanejs/sonner` ahora con wrapper `Toast` mínimo o se difiere? (recomendado: diferir — auth usa `StatusMessage` inline)
6. Tamaño: ¿exception con commits atómicos por wrapper o split en sub-changes?
