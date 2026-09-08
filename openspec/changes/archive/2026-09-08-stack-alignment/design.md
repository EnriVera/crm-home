# Design — stack-alignment

> Change SDD: `stack-alignment` (CRM-HOME) · Fase: design
> Repo verificado en `develop` (HEAD 5b85673): `apps/web/src/components/vendor/**`,
> `apps/web/src/routes/__app-shell.tsrx`, `apps/web/src/components/organisms/sidebar-nav/sidebar-nav.tsrx`,
> `apps/web/src/lib/{otp,i18n}/`, `node_modules/octane/dist/index.d.ts` (0.2.3),
> `node_modules/@octanejs/app-core/types/index.d.ts` (0.2.3).
> Fuentes: proposal.md, specs/{vendor-bindings,web-auth-ui,web-shell,design-system,web,api}/spec.md,
> explore.md, bindings-status.md (CI-checked), zagjs pin-input v1.43.3 docs,
> `openspec/changes/frontend-foundation/design.md` (D1/D4/D8 — supersedidas aquí).

## 1. Resumen ejecutivo

Las cuatro decisiones abiertas quedan **cerradas**:

1. **OTP → `@octanejs/zag` + `@zag-js/pin-input`** (D-SA1): resuelve D1 como se
   diseñó originalmente y deja instalada la base zag para futuros componentes.
2. **ErrorBoundary → nativa de Octane 0.2.3** (D-SA2): **verificado en el repo**
   que `octane` exporta `ErrorBoundary`/`TsrxErrorBoundary` y app-core expone
   `RootBoundaryOptions { pending?, catch? }`. **NO se instala**
   `@octanejs/react-error-boundary`; la divergencia (component-stack vacío) queda
   registrada.
3. **i18n → mantener la integración actual** (D-SA3): el binding no está en
   `node_modules` y no es verificable en este entorno; se mantiene como
   "variante equivalente §9" con **gate de re-evaluación ejecutable en plan**
   (commit de evaluación revertible).
4. **FSM OTP → migrar a xstate** (D-SA4): `setup().createMachine()` +
   `fromPromise` para el puerto `OtpVerifier`; fachada `createOtpMachine`
   preservada (contrato público estable), 9 tests adaptados a actor xstate.

Los swaps no cambian contratos públicos (`OtpInputProps`, `Icon`/`IconName`,
`I18nProvider`/`useT()`/`t()`, `SidebarNavProps`). La red de seguridad son los
43 tests: 8 re-enfocados (OTP input), 9 adaptados (FSM), 5 intactos (i18n),
21 intactos, +2 smoke tests nuevos en api. STRICT TDD por swap (RED primero);
este change no tiene excepción.

**Elevación obligatoria** (ask-on-risk): el tamaño excede `review_budget: 400`
→ antes del primer commit de implementación se consulta al usuario:
`size:exception` con los commits atómicos de §8, o split en sub-changes.

## 2. Decisiones

### D-SA1 — OTP: `@octanejs/zag` + `@zag-js/pin-input` (NO `@octanejs/input-otp`)

**Decisión:** `vendor/otp-input` se reimplementa sobre `@octanejs/zag@0.0.18`

+ `@zag-js/pin-input` (pin exacto al instalar, lockfile commitado).

**Justificación (criterios del encargo):**

1. **Alineación PRD §9**: el PRD nombra zagjs como *primitive layer* e input-otp
   como herramienta puntual. Adoptar zag cumple las dos lecturas: el componente
   OTP se resuelve y la *primitive layer* queda instalada.
2. **Superficie futura**: `@octanejs/zag` (`useMachine`, `normalizeProps`,
   `Portal`, `mergeProps` — bindings-status Completo) sirve para select, dialog,
   tabs, combobox… `@octanejs/input-otp` resuelve un único componente. El costo
   marginal de zag se amortiza en cada futuro componente.
3. **Resuelve la causa raíz de D1**: el fallback hand-rolled existió porque zag
   v1 eliminó el runtime vanilla (`createService`); `@octanejs/zag` ES el
   adapter de Octane que faltaba. Se cierra la deuda tal como D1 la previó.
4. **Cobertura §8.1** (zag pin-input v1.43.3): `otp: true`
   (`autocomplete="one-time-code"`), `onValueComplete`, `onValueChange`,
   `onValueInvalid`, `pattern`, `type: "numeric"`, paste de código SMS,
   auto-avance/retroceso, data-attributes (`data-invalid`, `data-complete`,
   `data-disabled`) para styling con tokens.
5. **SSR**: las máquinas zag son puras; el DOM se toca en `connect`, en render.
   El patrón es el mismo que ya valida el shell (snapshot estable).
6. **Costo del swap**: interno al wrapper; el contrato `OtpInputProps` no cambia.

**Cadena de fallback acotada (riesgo 🟡):** si en implementación el service de
`@octanejs/zag` diverge del runtime de Octane → `@octanejs/input-otp@0.0.19`
(bindings-status: Completo, controlled/uncontrolled, mobile-autofill); último
fallback: mantener la máquina propia actual (8 tests verdes hoy) con el mismo
contrato. Ningún paso toca a los consumidores.

**Contrato preservado** (`otp-input.tsrx`, idéntico):

```ts
interface OtpInputProps {
  length?: number;            // default 6
  disabled?: boolean;
  invalid?: boolean;
  onComplete?: (code: string) => void;  // ceros a la izquierda preservados
  "aria-label"?: string;
}
```

**Estructura interna nueva del wrapper:**

```
vendor/otp-input/
├── index.ts            // exporta OtpInput + OtpInputProps (sin cambios)
├── otp-input.tsrx      // useMachine(pinInput.machine) + connect(service, normalizeProps)
├── pin-input-props.ts  // TS puro: toPinInputProps(props: OtpInputProps) → machine props
├── pin-input-props.test.ts  // 8 tests re-enfocados (ver §9)
└── README.md           // provenance: D1 superseded by D-SA1
```

`toPinInputProps` es la única lógica propia que sobrevive: mapea el contrato
público a las props de la máquina zag (`length` → tamaño del array `value`,
`invalid`, `disabled`, `onComplete` → `onValueComplete(details.valueAsString)`,
`type: "numeric"`, `otp: true`, `pattern: "[0-9]*"`). El styling migra de clases
condicionales a data-attributes de zag (`data-invalid`, `data-complete`,
`data-disabled`) con los mismos tokens (`border-error`, `caret-primary`, etc.);
NUNCA `type="number"` (ceros a la izquierda, §8.1).

**Por qué los 8 tests se re-enfocan y no se borran (legitimidad):** la máquina
zag NO es headless-testeable en TS puro sin el runtime de Octane (la misma causa
raíz de D1: el `Service` vive en el adapter). La lógica de la máquina pasa a
estar probada por la suite CI de zag upstream; lo único que queda bajo nuestra
responsabilidad es el mapeo del contrato → las 8 pruebas se reescriben contra
`toPinInputProps` cubriendo los mismos comportamientos a nivel de contrato
(default length 6, rechazo de no-numéricos vía `pattern`/`type`, `onComplete`
con ceros preservados vía `valueAsString`, disabled inerte, invalid →
data-attribute). Cobertura equivalente, adaptada — nunca borrada sin reemplazo
(spec web-auth-ui).

### D-SA2 — ErrorBoundary: nativa de Octane 0.2.3 (NO se instala el binding)

**Evidencia (verificada en el repo, no asumida):**

+ `node_modules/octane/dist/index.d.ts` exporta `ErrorBoundary`,
  `TsrxErrorBoundary` y los bloques compilados `tryBlock`/`errorBlock`
  (`@try`/`@catch` de TSRX).
+ `node_modules/@octanejs/app-core/types/index.d.ts`:

  ```ts
  export interface RootBoundaryOptions {
    /** Component entry rendered while the root route tree is suspended. */
    pending?: RenderRouteEntry;
    /** Component entry rendered when an uncaught root render/effect error reaches the boundary. */
    catch?: RenderRouteEntry;
  }
  ```

**Decisión:** `@octanejs/react-error-boundary@0.1.33` **NO se instala**. La
boundary nativa cubre el caso declarado en §10 sin dependencia nueva. Se
documenta en la spec `vendor-bindings` y en `openspec/config.yaml`:
(a) la decisión (nativa, verificada en 0.2.3), (b) la divergencia conocida del
binding descartado (component-stack vacío), (c) el patrón de uso: boundary de
raíz vía `RootBoundaryOptions.catch` y boundaries de sección vía
`ErrorBoundary`/`@try`-`@catch` nativos.

**No se crea wrapper `vendor/error-boundary/`** (spec `web`: si existe nativo,
no debe crearse). El wiring del `catch` de raíz (entry de página de error) se
**difere al primer change que necesite UI de error** (este change no inventa
pantallas); queda registrado como pendiente en la spec.

### D-SA3 — i18n: mantener la integración actual + gate de re-evaluación

**Decisión:** se MANTIENE la integración propia (`vendor/i18n/core.ts` +
`provider.tsrx`, ~35 líneas sobre `i18next@26.4.2` real) como **"variante
equivalente §9"** (el comentario D6 ya la prevé). Los 5 tests de i18n quedan
intactos.

**Justificación (criterios del encargo):**

1. **No verificable**: `@octanejs/i18next` no está en `node_modules` (solo
   `app-core` y `vite-plugin`) y este entorno no tiene fetch para el README de
   npm. La condición de la spec `web` —"el binding DEBE permitir crear la
   instancia en `lib/i18n/config.ts` para SSR + hidratación"— no puede
   demostrarse con evidencia hoy. Ante no-verificabilidad, mantener es la única
   decisión honesta.
2. **Valor real del swap bajo**: el ahorro son ~35 líneas sobre una integración
   que YA usa i18next real y funciona en SSR + hidratación con 5 tests verdes.
3. **Riesgo asimétrico**: si la API del binding resulta rígida (provider sin
   instancia inyectable), el swap rompe SSR/hidratación — el riesgo más caro del
   repo (D3/D8).

**Gate de re-evaluación (ejecutable en plan, revertible):** un commit de
evaluación instala `@octanejs/i18next@0.1.47` pineado e inspecciona su API. Si
expone creación/inyección de instancia + hook compatibles → se ejecuta el swap
en el mismo change (la spec ya lo habilita) preservando
`I18nProvider`/`useT()`/`t()`/`createI18n()`/`subscribeLanguageChange()`. Si no
→ el commit se revierte (rollback trivial), la decisión queda documentada como
variante equivalente §9 y la re-evaluación se registra en `config.yaml`
diferidos con el criterio de adopción ("cuando el binding exponga instancia
creable en config.ts"). En cualquier desenlace, los consumidores no cambian.

### D-SA4 — FSM OTP: migrar a xstate vía `@octanejs/xstate` (fachada preservada)

**Decisión:** `lib/otp/otp-machine.ts` migra a **xstate v5** (`xstate` +
`@octanejs/xstate@0.0.10`, pin exacto). El PRD declara xstate en el stack y la
máquina OTP es su consumidor natural en web; además deja la base para la máquina
del timer de schedule (gran candidata futura).

**Diseño de la migración:**

```ts
// lib/otp/otp-machine.ts (después)
import { setup, fromPromise, createActor } from "xstate"; // confinado: lib/otp es el "adapter" de dominio

export const OTP_MAX_ATTEMPTS = 5;        // preservadas (fuente única §8.1)
export const OTP_EXPIRES_MINUTES = 10;
export const OTP_CODE_LENGTH = 6;
export type Verdict = "valid" | "invalid" | "expired";
export interface OtpVerifier { verify(code: string): Promise<Verdict>; }  // puerto preservado

// Máquina xstate: estados idle → ready → submitting → error | expired | success
// context: { code, attemptsRemaining }  (intentos/expiración como DATOS, nunca strings)
// verifier inyectado como actor fromPromise (input: code) — el change de auth
// inyecta el verifier real sin tocar UI ni máquina.
export function createOtpMachineDef(options: OtpMachineOptions) { /* setup().createMachine(...) */ }

// Fachada ESTABLE (contrato público intacto hacia /login-verification):
export function createOtpMachine(options: OtpMachineOptions): OtpMachine {
  // actor = createActor(createOtpMachineDef(options)).start()
  // getState() lee actor.getSnapshot(); setCode/submit/reset envían eventos.
}
```

**Por qué la fachada se preserva (cambio de contrato evitado, justificado):**
`createOtpMachine`/`OtpMachine` (`getState`/`setCode`/`submit`/`reset`) es el
contrato hacia la página de verificación; mantenerlo hace que el swap sea interno
y los consumidores no cambien (regla del change). La máquina de verdad es xstate;
la fachada es un adapter delgado actor→interfaz. Los 9 tests se reescriben contra
la API de actor (`createActor`, `send`, `snapshot.context`) con **los mismos
casos**: transición idle→ready por completitud, submit solo desde ready con
intentos, invalid consume intento (5→4), bloqueo a 0 intentos sin llamar al
verifier, expired desde el verifier, success, reset restaura intentos, código
como string con ceros. `FakeOtpVerifier` se preserva tal cual (inyección por el
puerto, igual que hoy).

**Constantes y puerto preservados**: `OTP_MAX_ATTEMPTS`, `OTP_EXPIRES_MINUTES`,
`OTP_CODE_LENGTH`, `Verdict`, `OtpVerifier`, `FakeOtpVerifier` — idénticos.

### D-SA5 — Wrappers nuevos mínimos (sin sobre-ingeniería)

Wrappean lo que se usa; se amplían cuando aparezca el consumidor.

**`components/vendor/toast/`** (encapsula `@octanejs/sonner@0.1.47`):

```ts
// index.ts — contrato mínimo
export { Toaster } from "./toaster.tsrx";   // montar una vez en el shell raíz cuando haya consumidor
export { toast } from "./toast";            // toast(message, { variant?: "info" | "success" | "error" })
```

Sin consumidor en este change (auth usa `StatusMessage` inline); el wrapper
existe para que el primer flujo no re-alinge. Sin tests propios (no hay lógica
propia; el mapeo variant→sonner es declarativo).

**`components/vendor/hooks/`** (encapsula `@octanejs/usehooks-ts@0.0.34`,
**PARCIAL**):

```ts
// index.ts — re-export explícito SOLO de la cohorte host-safe (bindings-status):
export {
  useBoolean, useCounter, useToggle, useMap, useStep,
  useDebounceCallback, useDebounceValue, useInterval, useTimeout,
  useIsMounted, useUnmount,
} from "@octanejs/usehooks-ts";
```

README del wrapper + spec `vendor-bindings` + `config.yaml` documentan los hooks
AUSENTES (storage/media/DOM-observer): nadie puede importarlos; cuando se
necesite uno ausente se decide su variante en el change consumidor.

**Error-boundary:** sin wrapper (D-SA2).

### D-SA6 — Sidebar: `@octanejs/resizable-panels` con persistencia y SSR estables

**Wrapper:** `components/vendor/resizable/` (regla §9 reforzada — la spec
permite importar desde el shell O un wrapper; se elige wrapper para mantener el
grep de confinamiento uniforme):

```ts
// components/vendor/resizable/index.ts — re-exports tipados mínimos
export { Group, Panel, Separator, type PanelHandle } from "@octanejs/resizable-panels";
```

**Estructura del shell (`__app-shell.tsrx`):**

```
<Group direction="horizontal" autoSaveId="crm-sidebar-layout">
  <Panel ref={sidebarPanelRef} collapsible collapsedSize={…} minSize={…} maxSize={…} defaultSize={…}
         onCollapse/onExpand → setCollapsed(state de shell)>
    <SidebarNav url={props.url} />          // contrato { url } intacto
  </Panel>
  <Separator />                              // drag-handle del binding (ARIA + teclado incluidos)
  <Panel><main id="content">{children}</main></Panel>
</Group>
```

**Respuestas a las preguntas del encargo:**

1. **¿resizable-panels tiene colapso propio?** Sí: el upstream
   (`react-resizable-panels`, que el binding encapsula — bindings-status:
   "colapso programático, persistencia y ARIA incluidos") soporta paneles
   `collapsible` con `collapsedSize` y API imperativa
   (`panelRef.collapse()/expand()/isCollapsed()`). El colapso 260↔64 px actual
   se **migra** a ese mecanismo: el toggle existente (botón al pie del nav) pasa
   a llamar `panelRef.collapse()/expand()` en vez de mutar una clase.
2. **¿Qué pasa con 260↔64 px?** El binding trabaja en **porcentajes** del
   contenedor, no en px. Decisión: expresar los límites directamente en %
   (valores iniciales: `defaultSize ≈ 20`, `minSize ≈ 15`, `maxSize ≈ 30`,
   `collapsedSize ≈ 5`; ajuste fino en implementación con verificación visual).
   Se abandona la px-exactitud **justificadamente**: con resize real, un ancho
   fijo deja de tener sentido; la paridad visual se verifica manualmente y el
   comportamiento colapsado (solo ícono + `title`/`aria-label`) se conserva.
3. **Persistencia (booleano → ¿qué?):** el binding persiste el layout completo
   (tamaños, incluido el estado colapsado como `collapsedSize`) vía
   `autoSaveId` en localStorage. **Evolución documentada del formato**: la clave
   `"crm-sidebar"` (valores `"collapsed"|"expanded"`) queda abandonada y se
   reemplaza por `"crm-sidebar-layout"` (formato gestionado por el binding);
   usuarios existentes simplemente arrancan con el default una vez — migración
   de datos innecesaria (el dato es una preferencia cosmética). Se documenta en
   la spec `web-shell` (la spec ya admite "evolución documentada del formato").
4. **SSR sin mismatch:** SSR e hidratación inicial renderizan con `defaultSize`
   (expandido, snapshot estable — mismo patrón D8); el layout persistido se
   aplica post-mount solo en cliente. No hay lectura de storage en render → no
   hay mismatch. Puede haber un ajuste visual post-hidratación (igual que hoy
   con el colapso persistido), aceptado como comportamiento del patrón D8.
5. **Teclado (WCAG 2.1.1):** el drag-handle del binding trae rol `separator` +
   flechas de teclado + ARIA incluidos (bindings-status). El toggle sigue siendo
   `<button>` nativo (Enter/Espacio gratis). Cero handlers de teclado custom.

**`SidebarNavProps { url }` no cambia.** El estado `collapsed` que hoy vive
dentro de `SidebarNav` pasa a derivarse del panel del shell; se expone a
`SidebarNav` mediante un `SidebarCollapseContext` creado en el shell (cambio
interno del organismo; el contrato público hacia el layout se mantiene).
`NavItem`/`NavGroup`/`ThemeToggle` siguen recibiendo `collapsed` como hoy.

**Lógica pura nueva testeable (STRICT TDD):** `lib/nav/sidebar-layout.ts` —
constantes de layout (sizes, collapsed) y funciones puras de mapeo
(`isCollapsedSize(size)`, clamp de límites) con 3-4 tests RED primero. El resto
es wiring declarativo del binding (sin lógica propia → sin tests inventados).

### D-SA7 — api: effect + xstate instalados, smoke tests, wiring real diferido

**Decisión:** `apps/api` instala pineados `effect`, `xstate` y
`@octanejs/xstate@0.0.10`. **No se inventan adapters ni composition root nuevo
en este change.** El "punto de cableado mínimo" de la spec se satisface con
**smoke tests de import** (demuestran que los paquetes funcionan dentro del
workspace y dejan el andamiaje verificado) + documentación del diferimiento del
wiring efectivo al primer change consumidor de adapters (Telemetry,
repositorios) — la spec `api` contempla explícitamente esta vía condicional
("si design documenta diferir el cableado efectivo… la instalación pineada y el
motivo DEBEN quedar registrados").

**Justificación:** effect en el composition root sin un adapter real sería
lógica decorativa (la spec prohíbe "inventar lógica de negocio"); xstate en api
no tiene consumidor hasta la máquina del timer de schedule. Los smoke tests son
la demostración mínima honesta.

**Tests nuevos (RED primero):**

+ `apps/api/src/infrastructure/effect.smoke.test.ts`:
  `Effect.runSync(Effect.succeed(1)) === 1`.
+ `apps/api/src/infrastructure/xstate.smoke.test.ts`:
  `createActor(createMachine({ initial: "idle", states: { idle: {} } })).start().value === "idle"`.

Ubicados bajo `src/infrastructure/` → cumplen de paso el escenario de
confinamiento por grep (los únicos imports de `effect`/`xstate` del repo viven
donde la regla manda). Los 2 tests existentes de api quedan intactos.

**`effect` en web**: se instala pineado como base fundacional §10 (spec `web`),
sin consumidor propio aún — documentado en `vendor-bindings`.

### D-SA8 — Íconos: swap a `@octanejs/phosphor-icons` (sin decisión pendiente)

El swap más limpio (riesgo 🟢). `Icon`/`IconProps` (`name`, `size`,
`aria-label`, `class`) intactos; `IconName` sigue siendo la union cerrada de 12
íconos, ahora **mapeada a exports del binding** en `paths.ts` (que pasa a ser el
mapa nombre→componente phosphor). El cuerpo de `Icon` delega en el componente
del binding con `size`, `weight="regular"`, `fill="currentColor"` y el mismo
manejo de `role`/`aria-hidden`. Verificación obligatoria en implementación
(spec design-system): tree-shaking (evidencia de bundle registrada) y SSR del
SVG sin mismatch. `ICON_PATHS` vendored se elimina; el README del wrapper
actualiza provenance (D4 superseded).

## 3. Flujo de datos

**OTP (login-verification):** página → `OtpInput` (wrapper, zag pin-input vía
`useMachine`+`connect` de `@octanejs/zag`) → `onComplete(code)` → fachada
`createOtpMachine` → actor xstate → `fromPromise(OtpVerifier.verify)` →
`FakeOtpVerifier` (este change) / verifier real RPC (change auth). Estados e
intentos llegan a la UI desde `actor.getSnapshot()`; mensajes i18n con tokens
de estado. Nada de esto cambia de contrato: cambia el motor interno.

**Sidebar:** shell (`Group`/`Panel`/`Separator` del wrapper `vendor/resizable`)
→ `Panel` imperativo (`collapse/expand`) ← toggle del nav → `autoSaveId`
persiste en localStorage post-mount → SSR/hidratación siempre con `defaultSize`
→ `SidebarCollapseContext` → `SidebarNav` (labels vs íconos). `url` sigue
llegando por `RenderRouteProps.url` (D3 intacto).

**i18n:** sin cambios de flujo (D-SA3 mantiene); si el gate de evaluación
adopta el binding, la instancia se crea igualmente en `lib/i18n/config.ts` y el
contrato del wrapper es idéntico.

## 4. Archivos tocados

| Archivo | Cambio |
| --- | --- |
| `apps/web/package.json` | +`@octanejs/zag`, `@zag-js/pin-input`, `@octanejs/xstate`, `xstate`, `@octanejs/phosphor-icons`, `@octanejs/resizable-panels`, `@octanejs/sonner`, `@octanejs/usehooks-ts`, `effect` (pineadas exactas; `@octanejs/i18next` solo si el gate D-SA3 adopta) |
| `apps/api/package.json` | +`effect`, `xstate`, `@octanejs/xstate` (pineadas) |
| `components/vendor/otp-input/` | swap a zag pin-input: `otp-input.tsrx` reescrito, `pin-input-props.ts` nuevo, `machine.ts`+`normalize-props.ts` eliminados, tests re-enfocados, README addendum D1 |
| `components/vendor/icons/` | `icon.tsrx` delega en binding; `paths.ts` → mapa `IconName`→export; README addendum D4 |
| `components/vendor/resizable/` | **nuevo** wrapper mínimo (D-SA6) |
| `components/vendor/toast/` | **nuevo** wrapper mínimo (D-SA5) |
| `components/vendor/hooks/` | **nuevo** wrapper cohorte host-safe (D-SA5) |
| `components/vendor/i18n/` | sin cambios (D-SA3) salvo swap condicional del gate |
| `routes/__app-shell.tsrx` | paneles resizables + contexto de colapso |
| `components/organisms/sidebar-nav/sidebar-nav.tsrx` | colapso vía contexto + panel imperativo; storage propio eliminado |
| `lib/nav/sidebar-layout.ts` (+test) | **nuevo** — constantes/funciones puras de layout |
| `lib/otp/otp-machine.ts` | migración a xstate con fachada preservada (D-SA4) |
| `lib/otp/otp-machine.test.ts` | 9 tests adaptados a actor xstate, mismos casos |
| `apps/api/src/infrastructure/*.smoke.test.ts` | **2 nuevos** (D-SA7) |
| `docs/PRD-v2.md` §9/§10 | correcciones (recharts, no-aplicables, wrappers sobre bindings) |
| `openspec/config.yaml` | `stack.frontend` con `@octanejs/*`, diferidos con change consumidor, error-boundary nativo registrado, re-evaluación i18n |
| Specs activas `frontend-foundation` | addenda D1/D4/D8 (no reescritura) |

## 5. Contratos (estables salvo nota)

| Contrato | Estado |
| --- | --- |
| `OtpInputProps` | **idéntico** |
| `Icon` / `IconProps` / `IconName` | **idéntico** (union cerrada de 12) |
| `I18nProvider` / `useT()` / `t()` / `createI18n()` / `subscribeLanguageChange()` | **idéntico** |
| `SidebarNavProps { url }` | **idéntico** |
| `createOtpMachine` / `OtpMachine` / `OtpVerifier` / `Verdict` / constantes OTP | **idéntico** (fachada sobre xstate) |
| localStorage `"crm-sidebar"` (booleano) | **evolución documentada** → `"crm-sidebar-layout"` (formato del binding); preferencia cosmética, sin migración |
| Export interno `createOtpMachine` de `vendor/otp-input` (máquina hand-rolled) | **eliminado — justificado**: era interno del wrapper (D1 fallback); su rol lo cumple la máquina zag + `toPinInputProps`. No es consumido fuera del wrapper (verificado: solo `otp-input.tsrx` lo importa) |

## 6. Orden de commits atómicos (Conventional Commits, husky activo)

Un binding/swap por commit; cada commit verde por sí mismo y revertible sin
afectar a los demás. Dentro de cada commit de swap: tests adaptados RED primero
(fallan contra la implementación vieja/nueva ausente), luego el swap a GREEN.

1. `chore(deps): pin effect + xstate + @octanejs/xstate en api y web con smoke tests`
   — verificación de peer ranges contra `octane@0.2.3`/`vite@8`; 2 smoke tests
   RED→GREEN en api.
2. `refactor(icons): swap vendor/icons a @octanejs/phosphor-icons` — incluye el
   pin del binding; evidencia de tree-shaking + SSR registrada en el commit/PR.
3. `refactor(otp-input): swap vendor/otp-input a @octanejs/zag pin-input` —
   incluye pins `@octanejs/zag` + `@zag-js/pin-input`; 8 tests re-enfocados RED
   primero; cadena de fallback D-SA1 si diverge.
4. `refactor(otp): migrar FSM lib/otp a xstate preservando puerto OtpVerifier` —
   9 tests adaptados RED primero.
5. `feat(shell): sidebar resizable con @octanejs/resizable-panels` — incluye
   wrapper `vendor/resizable`, `lib/nav/sidebar-layout` (tests RED), contexto de
   colapso, evolución de storage documentada.
6. `feat(vendor): wrappers toast (@octanejs/sonner) y hooks (@octanejs/usehooks-ts parcial)`
   — incluye pins; README con cohorte y ausentes.
7. `chore(i18n): evaluar @octanejs/i18next (gate D-SA3)` — commit de evaluación:
   si adopta, `refactor(i18n): swap vendor/i18n a @octanejs/i18next` con los 5
   tests adaptados; si no, revert + solo documentación.
8. `docs: corregir PRD §9/§10 y config.yaml; addenda D1/D4/D8` — recharts,
   no-aplicables (tanstack router, router-ssr-query, nuqs), nombres `@octanejs/*`,
   diferidos con change consumidor, error-boundary nativo, re-evaluación i18n.

Orden justificado: deps fundacionales primero; icons (🟢) valida el pipeline de
swap con el menor riesgo; otp-input y FSM después (tienen cadena de fallback y
tests claros); sidebar al final (mayor riesgo SSR/a11y); wrappers sin consumidor
y docs cierran.

## 7. Plan de tests (STRICT TDD — sin excepción en este change)

**Nuevos (RED primero):**

+ `apps/api/src/infrastructure/effect.smoke.test.ts` (1 caso) y
  `xstate.smoke.test.ts` (1 caso) — D-SA7.
+ `apps/web/src/lib/nav/sidebar-layout.test.ts` (3-4 casos): constantes de
  layout coherentes (`collapsedSize < minSize < defaultSize < maxSize`),
  `isCollapsedSize`, clamp de límites — D-SA6.
+ `apps/web/src/components/vendor/otp-input/pin-input-props.test.ts`
  (8 casos, re-enfoque de los existentes) — D-SA1.

**Adaptados (re-apuntados, nunca borrados sin reemplazo):**

+ `vendor/otp-input/machine.test.ts` (8) → `pin-input-props.test.ts` contra
  `toPinInputProps`. Legítimo: la máquina zag no es headless-testeable sin el
  runtime de Octane (causa raíz de D1); la lógica de la máquina queda cubierta
  por la suite CI de zag upstream y nuestra responsabilidad residual es el
  mapeo del contrato público — mismos comportamientos, nivel contrato.
+ `lib/otp/otp-machine.test.ts` (9) → mismos casos contra la API de actor
  xstate (`createActor`/`send`/`snapshot`). Legítimo: es la migración
  explícitamente pedida por la spec; comportamiento y contrato preservados.
+ `lib/i18n/i18n.test.ts` (5) → intactos si D-SA3 mantiene; adaptados solo si
  el gate adopta el binding.

**Intactos:** los 21 restantes de web (nav, theme, validation) y los 2 de api.

**Verificaciones no-test (criterios de aceptación por swap):** typecheck verde
en ambos paquetes; dev server HTTP 200 en todas las rutas; SSR sin mismatch en
`/login`, `/login-verification?email=…`, `/dashboard`; grep de confinamiento
(imports `@octanejs/*`, `@zag-js/*`, `sonner`, `xstate`, `effect` solo bajo
`vendor/` o `infrastructure/`/`http/`); evidencia de bundle (tree-shaking
phosphor) registrada.

## 8. Rollback y rollout

+ Cada swap es un commit atómico revertible en aislamiento (§6); los estados
  hand-rolled actuales quedan como fallback conocido (OTP: cadena D-SA1).
+ Lockfile commitado por commit → árbol reproducible en cualquier punto.
+ Sin migraciones, datos ni despliegues. La única "migración" (storage sidebar)
  es cosmética y hacia adelante.
+ **Precondición de implementación (ask-on-risk):** elevar al usuario la
  estrategia de tamaño (`size:exception` con los commits de §6 vs split en
  sub-changes) ANTES del commit 1. Este design no implementa nada.

## 9. Riesgos

| Riesgo | Nivel | Mitigación |
| --- | --- | --- |
| `@octanejs/zag` diverge del runtime de Octane en la práctica | 🟡 | Cadena de fallback D-SA1 (input-otp → hand-rolled actual), acotada y con contrato idéntico |
| SSR/hidratación del sidebar (nuevo mecanismo de persistencia) | 🟡 | `defaultSize` estable + persistencia post-mount (patrón D8); criterio de aceptación sin mismatch por ruta |
| px→% en anchos del sidebar altera la paridad visual | 🟢 | Ajuste fino en implementación + verificación visual; comportamiento colapsado conservado |
| Madurez beta de bindings (0.x) | 🟡 | Pin exacto, un binding por commit, peer ranges verificados contra `octane@0.2.3`/`vite@8` |
| `@octanejs/usehooks-ts` parcial | 🟡 | Cohorte explícita en wrapper + README + spec + config.yaml |
| Re-enfoque de 17 tests (OTP×2) percibido como pérdida de cobertura | 🟢 | Justificación registrada (§7): cobertura residual = contrato; lógica de máquina cubierta upstream (zag) o por los mismos casos (xstate) |
| Tamaño vs review_budget 400 | 🟡 | Elevación a usuario antes de implementar (§8); commits atómicos revertibles |
