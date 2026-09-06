# Proposal — stack-alignment

> Change SDD: `stack-alignment` (CRM-HOME)
> Estado: proposal · Artifact store: openspec · Execution: auto
> Delivery: `ask-on-risk` (default de sesión) — **este change excede con casi
> total seguridad review_budget 400 → ver §5 y §8**
> Fuentes vinculantes: `docs/PRD-v2.md` (§8.1, §9, §10), `openspec/config.yaml`,
> `explore.md` (hallazgos verificados contra el código real), `bindings-status.md`
> oficial CI-checked (aportado por el orquestador — cierra la limitación §3 del
> explore), `zagjs.com/llms-full.txt` (pin-input v1.43.3),
> `octanejs.dev/docs/bindings`.
> Handoff pre-proposal **confirmado** (sin rondas de preguntas): el usuario pidió
> explícitamente esta alineación y aportó las fuentes; el orquestador fijó el
> criterio "adoptar ahora lo fundacional/con uso inmediato, diferir lo de
> features futuras documentándolo".

## 1. Intent (intención)

Alinear la implementación real con el stack declarado en PRD §10 adoptando los
**bindings first-party `@octanejs/*`** allí donde ya existe consumidor inmediato
o valor fundacional, en tres líneas de trabajo:

1. **Instalar bindings con uso inmediato/fundacional** en `apps/web` y
   `apps/api`, con pin exacto de versiones (repo sin `^`, lockfile commitado).
2. **Rehacer los wrappers hand-rolled sobre bindings reales** manteniendo sus
   contratos públicos: `vendor/otp-input` → `@octanejs/zag` (pin-input) o
   `@octanejs/input-otp` (decisión de design), `vendor/icons` →
   `@octanejs/phosphor-icons`, `vendor/i18n` → `@octanejs/i18next`, sidebar →
   `@octanejs/resizable-panels`; y migrar la FSM hand-rolled de
   `lib/otp/otp-machine.ts` a `@octanejs/xstate` (consumidor natural, cierra la
   deuda de "instalar sin consumidor").
3. **Corregir la documentación** que hoy induce a error: PRD §9/§10 y
   `openspec/config.yaml` (nombres `@octanejs/*`, "tanstack charts" inexistente
   → recharts, tanstack router / router-ssr-query / nuqs no aplican al router
   MPA propio + `URLSearchParams`, diferidos registrados explícitamente).

La **red de seguridad son los 43 tests existentes** (2 api + 41 web): los swaps
no cambian contratos públicos de los wrappers y todo swap sigue `strict_tdd`.

## 2. Alcance

### 2.1 Instalar AHORA — consumidor inmediato

| Paquete (versión pineada) | App | Consumidor inmediato |
| --- | --- | --- |
| `@octanejs/zag@0.0.18` + `@zag-js/pin-input` **o** `@octanejs/input-otp@0.0.19` | web | swap `vendor/otp-input` (§2.3) — **design decide** cuál |
| `@octanejs/xstate@0.0.10` + `xstate` | web y api | FSM de `lib/otp/otp-machine.ts` (web); base fundacional api |
| `@octanejs/phosphor-icons@0.0.32` | web | swap `vendor/icons` (§2.4) |
| `@octanejs/resizable-panels@0.0.10` | web | sidebar resizable §9 (§2.5) |
| `effect` | api y web | fundacional §10: adapters (Telemetry, repositorios) |

Evidencia bindings-status (CI-checked): todos los anteriores en estado
**Completo**; `@octanejs/xstate` soporta SSR (`getServerSnapshot`);
`@octanejs/zag` expone `useMachine`, `normalizeProps`, `Portal`, `mergeProps`;
`@octanejs/input-otp` soporta controlled/uncontrolled y mobile-autofill.
Zag pin-input v1.43.3 cubre las reglas PRD §8.1: `otp: true` (autocomplete
one-time-code), `onValueComplete`, `pattern`, paste de código SMS,
auto-avance/retroceso, 6 dígitos con ceros a la izquierda.

### 2.2 Instalar AHORA — stack base declarado sin consumidor propio aún

| Paquete | Motivo |
| --- | --- |
| `@octanejs/i18next@0.1.47` | Reemplaza la integración propia (~35 líneas: provider + hook sobre i18next real). Contrato a preservar: `I18nProvider`, `useT()`, `t()`, `createI18n(options)`, `subscribeLanguageChange()` (5 tests). **Condición**: el binding debe permitir crear la instancia en `lib/i18n/config.ts` para SSR + hidratación; si su API es rígida, se mantiene el wrapper actual y se documenta como "variante equivalente §9". |
| `@octanejs/sonner@0.1.47` | Declarado §10; wrapper `Toast` mínimo bajo `vendor/` para el primer flujo que lo necesite (instalar ya evita re-alinear después). |
| `@octanejs/react-error-boundary@0.1.33` | Declarado §10. **Pendiente de plan**: si Octane 0.2.3 expone ErrorBoundary nativo, se documenta y NO se instala (divergencia conocida del binding: component-stack vacío). |
| `@octanejs/usehooks-ts@0.0.34` | **PARCIAL** (bindings-status): solo cohorte host-safe (`useBoolean`, `useCounter`, `useToggle`, `useMap`, `useStep`, `useDebounceCallback/Value`, `useInterval`, `useTimeout`, `useIsMounted`, `useUnmount`); storage/media/DOM-observer **ausentes**. Se instala y se documenta la limitación en la spec y en config.yaml para no prometer hooks inexistentes. |

### 2.3 Swap `vendor/otp-input` → binding (decisión de design)

- **Hoy**: fallback D1 documentado — `machine.ts` (FSM propia: typeDigit/
  backspace/paste/reset, 8 tests headless) + `normalize-props.ts` +
  `otp-input.tsrx`.
- **Opción preferida: `@octanejs/zag` + `@zag-js/pin-input`**. Es el stack
  declarado (`stack.frontend.components: zagjs`) y resuelve D1 como se diseñó
  originalmente: `@octanejs/zag` provee `useMachine`/`normalizeProps` para
  Octane, eliminando la causa raíz del fallback (zag v1 sin runtime vanilla).
- **Alternativa: `@octanejs/input-otp`** si zag pin-input diverge del contrato
  en la práctica. Ambos bindings figuran como Completos en bindings-status.
- **Contrato público a preservar** (`OtpInputProps`, estable hacia auth):
  `length`, `disabled`, `invalid`, `onComplete` (string con ceros preservados),
  `aria-label`. Comportamiento: auto-avance, backspace que retrocede, paste
  distribuido (`"041283"`), `inputmode="numeric"`, nunca `type="number"`.
- **Tests**: los 8 tests de `machine.test.ts` se re-apuntan a la máquina del
  binding si es headless-testeable (ideal, patrón D10); si no, se reescriben
  como tests de comportamiento del wrapper — decisión de plan, nunca se borran
  sin reemplazo.
- Riesgo: **medio** (mayor superficie de los cuatro swaps).

### 2.4 Swap `vendor/icons` → `@octanejs/phosphor-icons`

- **Hoy**: `<Icon name size aria-label class>` con `ICON_PATHS` vendored de
  `@phosphor-icons/core@2.1.1` (union cerrada `IconName` de 12 íconos, D4).
- **Swap**: el cuerpo de `Icon` delega en el componente del binding; props
  públicas idénticas; `IconName` se mantiene como union cerrada mapeada a
  exports del binding (1.512 íconos, 6 pesos, `IconContext`).
- Verificar en implementación: tree-shaking (el set completo no debe inflar el
  bundle) y render SSR (SVG puro, esperado OK).
- Riesgo: **bajo** — el swap más limpio.

### 2.5 Sidebar → `@octanejs/resizable-panels`

- **Hoy** (D8): ancho fijo 260↔64 px con toggle persistido en
  `localStorage["crm-sidebar"]`, SSR renderiza expandido (snapshot estable).
  Cumple colapso pero NO el "resizable" de PRD §9.
- **Swap**: `__app-shell.tsrx` envuelve sidebar + `<main>` en `Group`/`Panel`/
  `Separator` del binding (colapso programático soportado, persistencia y ARIA
  incluidos según bindings-status). `SidebarNavProps { url }` no cambia.
- A resolver en design/plan: persistencia del ancho (booleano → porcentaje +
  flag de colapso), snapshot SSR/hidratación estable, y teclado del
  drag-handle (WCAG 2.1.1).
- Riesgo: **medio** (SSR + persistencia + a11y).

### 2.6 FSM de `lib/otp` → `@octanejs/xstate`

- `lib/otp/otp-machine.ts` (D9: `idle→ready→submitting→error|expired|success`,
  intentos/expiración como datos, puerto `OtpVerifier`, 9 tests) migra a xstate
  vía el binding. El puerto `OtpVerifier` y las constantes (`OTP_MAX_ATTEMPTS`,
  etc.) se preservan; los 9 tests se adaptan a la API de xstate manteniendo
  los mismos casos.
- Da consumidor real a xstate en web; en api queda como base fundacional.

### 2.7 Correcciones documentales

1. **PRD §10 y config.yaml**: "tanstack charts" no existe → `@octanejs/recharts`
   (diferido al change de schedule).
2. **PRD §10 y config.yaml**: tanstack `router` / `router-ssr-query` y `nuqs`
   **no aplican** — router MPA propio de Octane + `URLSearchParams` estándar
   (D2/D3/D5/D9). Se corrige la doc, no se instala nada.
3. **PRD §9 tabla de wrappers**: `OtpInput` pasa a encapsular zag pin-input
   (o input-otp según design); `Charts` → recharts; anotar que los wrappers
   encapsulan bindings `@octanejs/*`.
4. **config.yaml `stack.frontend`**: reescribir con nombres `@octanejs/*` y
   sección explícita de **diferidos con su change consumidor** (§2.8) para que
   el próximo change no vuelva a encontrar la brecha.
5. **`frontend-foundation/design.md` D1/D4/D8**: registro histórico intacto; las
   specs activas de `frontend-foundation` (change no archivado) que citen esas
   decisiones se **addendan**, no se reescriben.

### 2.8 Diferir al change de su feature (documentado, no olvidado)

| Paquete | Change consumidor |
| --- | --- |
| `@octanejs/lexical` | descripciones de tareas (tasks) |
| `@octanejs/dnd-kit` | kanban de BaseView (tasks) |
| `@octanejs/day-picker` | schedule |
| `@octanejs/recharts` | gráfico de torta de schedule — anotar en su spec: **SSR no testeado** (text measurement 0×0); Brush/Treemap no soportados |
| `@octanejs/colorful` | colores de categorías (config) |
| `@octanejs/tanstack-{store,db,query,form,table,virtual}` | data layer de módulos (BaseView) |
| `@octanejs/spring` | primera animación real |
| `@octanejs/testing-library` | primer test de componentes con DOM (hoy todo TS puro, D10) |
| `shiki` (api) | sin consumidor claro en §10 backend |

### 2.9 Instalación mecánica

- `octane@0.2.3` **NO incluye CLI**: `octane add`/`doctor` no aplican.
  Instalación manual con `bun add @octanejs/<pkg>@<versión-exacta>`, un binding
  por commit, verificando peerRanges contra `octane@0.2.3` y `vite@8`.

## 3. Capabilities

| Capability | Tipo | Contenido del delta |
| --- | --- | --- |
| `vendor-bindings` | **nueva** | Registro canónico de bindings `@octanejs/*` adoptados: paquete, versión pineada, puerta upstream, estado (completo/parcial), wrapper `vendor/*` que lo encapsula, limitaciones conocidas (usehooks-ts cohorte parcial; error-boundary component-stack vacío; recharts SSR pendiente) y lista de diferidos con su change consumidor. Regla reforzada: ningún import de librería de terceros fuera de `components/vendor/` (web) o adapters (api). |
| `web-auth-ui` | **modificada** | `OtpInput` pasa a implementarse sobre `@octanejs/zag` pin-input o `@octanejs/input-otp` (decisión design) con contrato público idéntico; la FSM de verificación OTP migra a `@octanejs/xstate` preservando puerto `OtpVerifier` y constantes. |
| `web-shell` | **modificada** | Sidebar pasa de ancho fijo con toggle a paneles resizables (`@octanejs/resizable-panels`) manteniendo colapso programático, persistencia local y snapshot SSR estable; drag-handle operable por teclado (WCAG 2.1.1). |
| `design-system` | **modificada** | `Icon` delega en `@octanejs/phosphor-icons` con la misma unión cerrada `IconName`; se documenta tree-shaking y SSR del binding. |
| `web` | **modificada** | `vendor/i18n` sobre `@octanejs/i18next` (condicionado a su API; fallback documentado); deps nuevas pineadas en `apps/web/package.json` (zag/input-otp, xstate, phosphor-icons, resizable-panels, i18next, sonner, react-error-boundary si aplica, usehooks-ts, effect); wrappers `Toast`/error-boundary bajo `vendor/`. |
| `api` | **modificada** | `effect` + `@octanejs/xstate`/`xstate` instalados pineados como base fundacional §10 (consumo real llega con adapters de Telemetry/repositorios en changes posteriores; en este change se instala y se deja documentado). |

## 4. Áreas afectadas

| Área | Cambio |
| --- | --- |
| `apps/web/package.json` | +9-10 deps `@octanejs/*` pineadas + `effect` |
| `apps/api/package.json` | +`effect`, +`xstate`/`@octanejs/xstate` pineadas |
| `apps/web/src/components/vendor/otp-input/` | swap a binding (§2.3) |
| `apps/web/src/components/vendor/icons/` | swap a phosphor-icons (§2.4) |
| `apps/web/src/components/vendor/i18n/` | swap a i18next binding (condicionado, §2.2) |
| `apps/web/src/components/vendor/` | nuevos wrappers `toast/`, `error-boundary/` (mínimos) |
| `apps/web/src/routes/__app-shell.tsrx` | paneles resizables (§2.5) |
| `apps/web/src/lib/otp/otp-machine.ts` | migración a xstate (§2.6) |
| `apps/web/src/lib/i18n/` | adaptación a la instancia del binding |
| Tests web (41) | re-apunte de 8 OTP-input + 9 OTP-FSM + 5 i18n; resto sin tocar |
| `docs/PRD-v2.md` §9/§10 | correcciones §2.7 |
| `openspec/config.yaml` | stack.frontend con `@octanejs/*` + diferidos; correcciones §2.7 |
| Specs activas de `frontend-foundation` | addendum de D1/D4/D8 |

## 5. Riesgos y mitigaciones

| Riesgo | Nivel | Mitigación |
| --- | --- | --- |
| Madurez beta de bindings (versiones 0.x) | 🟡 | Pin exacto, lockfile commitado, un binding por commit; bindings-status CI-checked como fuente de verdad de cobertura |
| `@octanejs/zag` no resuelve D1 en la práctica (service/SSR diverge) | 🟡 | Fallback `@octanejs/input-otp` (Completo, mobile-autofill); último fallback: mantener máquina propia testeada (estado actual) — la cadena de fallback está acotada |
| SSR/hidratación: cualquier binding que toque DOM en render rompe el shell (D3/D8) | 🟡 | Criterio de aceptación por swap: SSR limpio + sin mismatch; xstate SSR confirmado (`getServerSnapshot`); recharts SSR no testeado → por eso queda diferido |
| Tree-shaking de phosphor-icons (1.512 íconos) | 🟢 | Verificación de bundle en implementación; `IconName` cerrada acota el set |
| Re-apunte de 22 tests (OTP×2 + i18n) depende de internas | 🟢 | Contratos públicos estables; tests de comportamiento se re-apuntan, no se borran; strict_tdd por swap |
| **`@octanejs/usehooks-ts` parcial**: hooks storage/media/DOM ausentes | 🟡 | Documentado en `vendor-bindings` y config.yaml; nadie importa hooks inexistentes |
| Compatibilidad de bindings con `octane@0.2.3` / `vite@8` | 🟡 | Chequeo de peerRanges al instalar cada paquete |
| **Tamaño vs review_budget 400** (4 swaps + FSM + docs + ~10 deps) | 🟡 | Estimación honesta: excede el budget → con `ask-on-risk` se **consultará al usuario antes de implementar**: `size:exception` con commits atómicos (deps → otp-input → icons → i18n → sidebar → FSM → docs) o split en sub-changes. Esta proposal no decide: se eleva. |

## 6. Rollback

- Swaps **internos a wrappers** con contratos públicos estables: rollback =
  `git revert` por commit atómico (cada swap es un commit independiente y
  revertible sin afectar a los demás).
- Deps nuevas: se desinstalan con el mismo revert; lockfile commitado por
  commit mantiene el árbol reproducible.
- Correcciones de docs (PRD, config.yaml) son aditivas/correctoras: revert
  trivial.
- Sin migraciones, datos ni despliegues involucrados.
- El estado actual de cada wrapper hand-rolled queda como fallback funcional
  conocido (especialmente otp-input: 8 tests verdes hoy).

## 7. Criterios de éxito

1. `bun test` verde en workspace raíz (43 tests existentes adaptados, no
   borrados + tests nuevos que la lógica pura requiera por strict_tdd).
2. Ningún import de librería de terceros fuera de `components/vendor/` (web) ni
   de adapters (api) — regla verificable por grep.
3. Los 4 wrappers mantienen contrato público idéntico tras el swap
   (`OtpInputProps`, `Icon`, `I18nProvider`/`useT()`/`t()`, `SidebarNavProps`).
4. OTP: 6 dígitos con ceros a la izquierda, paste distribuido, auto-avance/
   retroceso, `inputmode="numeric"` — comportamiento §8.1 intacto con binding.
5. Sidebar resizable con colapso funcional, persistencia local, snapshot SSR
   estable (sin mismatch de hidratación) y drag-handle operable por teclado.
6. `lib/otp` corre sobre xstate con puerto `OtpVerifier` y constantes
   preservados; mismos casos de test verdes.
7. PRD §9/§10 y `openspec/config.yaml` sin referencias a productos inexistentes
   ("tanstack charts") ni no aplicables (tanstack router, nuqs); diferidos
   registrados con su change consumidor.
8. Todas las versiones nuevas pineadas exactas y lockfile commitado.
9. Estrategia de tamaño acordada con el usuario (exception o split) antes del
   primer commit de implementación.

## 8. Fuera de alcance (non-goals)

- **Instalar los ~26 paquetes declarados "porque el PRD los lista"**: criterio
  confirmado = consumidor inmediato o fundacional; el resto queda documentado
  como diferido (§2.8).
- **Features futuras** que consumirán los diferidos: editor lexical, kanban
  dnd-kit, schedule (day-picker/recharts), colores de categorías, data layer
  tanstack, animaciones spring.
- **Lógica de negocio nueva**: este change no añade funcionalidad de producto;
  alinea la base técnica (el sidebar gana resize porque §9 lo declara, no como
  feature nueva).
- **Reescritura de `frontend-foundation`**: sus specs activas se addendan, no
  se reescriben; design.md queda como registro histórico.
- **CLI de Octane** (`octane add`/`doctor`): no existe en `octane@0.2.3`; si se
  adopta el paquete CLI como devDep será decisión de plan, no de esta proposal.
- **Cambios de API pública de wrappers**: cualquier cambio de contrato hacia
  los consumidores (auth, shell) queda fuera — los swaps son internos.

## 9. Preguntas abiertas heredadas (resueltas por esta proposal salvo indicación)

1. ¿`@octanejs/zag` cubre pin-input creable en Octane? → **Sí** (bindings-status:
   Completo con `useMachine`/`normalizeProps`; pin-input v1.43.3 cubre §8.1).
   Queda como decisión de design zag vs input-otp.
2. ¿CLI de Octane como devDep o instalación manual? → Instalación manual
   confirmada por evidencia (octane 0.2.3 sin bin); CLI como devDep es decisión
   de plan.
3. ¿Octane 0.2.3 tiene ErrorBoundary nativo? → **Pendiente de plan** (verificar
   en `octane/dist/index.d.ts`); decide si react-error-boundary se instala o se
   documenta.
4. ¿La FSM de `lib/otp` migra ahora? → **Sí**, incluida en §2.6.
5. ¿Sonner ahora o diferido? → **Ahora** como stack base con wrapper mínimo
   (§2.2), sin flujo consumidor propio en este change.
6. Tamaño: exception con commits atómicos vs split → **se eleva al usuario**
   (ask-on-risk) antes de implementar.
