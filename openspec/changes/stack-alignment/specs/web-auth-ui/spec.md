# Delta for Web Auth UI

> Change: `stack-alignment` · Delta sobre la spec `web-auth-ui`.
> NOTA DE BASELINE: `openspec/specs/web-auth-ui/spec.md` aún no existe porque ni
> `monorepo-scaffold` ni `frontend-foundation` fueron archivados; este delta se
> escribe contra `openspec/changes/frontend-foundation/specs/web-auth-ui/spec.md`
> como baseline de facto (verificado). Orden de archivo obligatorio:
> `monorepo-scaffold` → `frontend-foundation` → `stack-alignment`.

## MODIFIED Requirements

### Requirement: Wrapper vendor/otp-input con contrato estable

El input de código DEBE ser el componente `OtpInput` de
`components/vendor/otp-input/`, único módulo del codebase que PUEDE importar el
binding de OTP y sus paquetes upstream (regla §9 de wrappers, reforzada en la
spec `vendor-bindings`). Su interfaz pública DEBE ser exactamente:

```ts
interface OtpInputProps {
  length?: number;            // default 6
  disabled?: boolean;
  invalid?: boolean;
  onComplete?: (code: string) => void;
  "aria-label"?: string;
}
```

El wrapper DEBE implementarse sobre el binding first-party, siendo la opción
preferida `@octanejs/zag` + `@zag-js/pin-input` (stack declarado §10; zag
pin-input v1.43.3 cubre `otp: true`/`autocomplete="one-time-code"`,
`onValueComplete`, `pattern` y paste de código SMS, y `@octanejs/zag` expone
`useMachine`/`normalizeProps` para Octane, eliminando la causa raíz del fallback
hand-rolled D1). La alternativa es `@octanejs/input-otp` (bindings-status:
Completo, controlled/uncontrolled y mobile-autofill) si zag pin-input diverge
del contrato en la práctica. La elección entre ambos es decisión de design; si
ambos bindings resultaran incompatibles con el runtime de Octane, el fallback
hand-rolled DEBE mantener exactamente la misma interfaz pública y la misma
máquina de estados UI (estado actual conocido y verde). La lógica de la máquina
DEBE ser testeable headless en TS puro (type, backspace, paste, `onComplete`);
si la máquina del binding no es headless-testeable, los tests DEBEN reescribirse
como tests de comportamiento del wrapper — nunca borrarse sin reemplazo.
(Previously: el wrapper era un fallback hand-rolled (D1) con máquina propia +
normalize-props, declarado como único módulo que podía importar
`@zag-js/pin-input`/`@zag-js/core`, con zagjs como base preferida aún no
viable.)

#### Scenario: Regla de wrapper auditable

- GIVEN el código de `src/`
- WHEN se inspeccionan los imports de `@octanejs/zag`, `@zag-js/*` o `@octanejs/input-otp`
- THEN aparecen únicamente bajo `components/vendor/otp-input/`

#### Scenario: Contrato público intacto tras el swap

- GIVEN el wrapper reimplementado sobre el binding elegido
- WHEN se inspeccionan los consumidores (`/login-verification`) y los tests de comportamiento
- THEN `OtpInputProps` es idéntica a la definida en esta spec y ningún consumidor requirió cambios de contrato

#### Scenario: Máquina testeable sin DOM

- GIVEN la máquina del pin-input (del binding si es headless-testeable, o el wrapper) creada headless
- WHEN se envían eventos de tipeo, backspace y paste
- THEN el estado interno refleja los valores esperados y `onComplete` se dispara al completar, sin DOM

### Requirement: Máquina de estados OTP tras el puerto OtpVerifier

La verificación DEBE modelarse como una máquina de estados
(`idle → ready → submitting → error | expired`) implementada sobre
`@octanejs/xstate`/`xstate` (bindings-status: Completo, con soporte SSR vía
`getServerSnapshot`), dando a xstate un consumidor real en web. La migración a
xstate es la opción por defecto; si design documenta una razón técnica concreta
para mantener la FSM pura en TS, DEBE quedar registrada la decisión y el motivo
en el design del change (requisito condicional) — en ese caso xstate queda
instalado como base fundacional sin consumidor propio aún. En ambos casos: el
contador de intentos (máximo 5, PRD §8.1) y la expiración (10 minutos, PRD §8.1)
DEBEN seguir siendo DATOS de la máquina — nunca strings en componentes; el
submit DEBE llamar al puerto `OtpVerifier { verify(code): Promise<Verdict> }`;
las constantes (`OTP_MAX_ATTEMPTS`, etc.) y el puerto DEBEN preservarse; este
change DEBE seguir inyectando `FakeOtpVerifier` (siempre veredicto `invalid`
tras latencia simulada) y el change de auth DEBE poder inyectar el verifier real
sin tocar la UI ni la máquina. Los 9 tests existentes de la máquina DEBEN
adaptarse a la API elegida manteniendo los mismos casos — re-apuntados, nunca
borrados sin reemplazo. Los mensajes de error/expiración DEBEN mostrarse con los
tokens de estado del design system.
(Previously: máquina de estados en TS puro hand-rolled (D9) con los mismos
estados, puerto y constantes; xstate no tenía consumidor.)

#### Scenario: Código inválido consume un intento

- GIVEN la máquina en `ready` con 5 intentos disponibles y el `FakeOtpVerifier`
- WHEN se envía un código de 6 dígitos
- THEN la máquina transita a `submitting` y luego a `error` con 4 intentos restantes y el mensaje i18n correspondiente

#### Scenario: Bloqueo al agotar intentos

- GIVEN la máquina con 0 intentos restantes
- WHEN el usuario intenta enviar otro código
- THEN la máquina NO llama al verifier y muestra el estado de bloqueo/expiración con su mensaje i18n

#### Scenario: Swap del verifier sin tocar UI

- GIVEN la pantalla de verificación compuesta con `FakeOtpVerifier`
- WHEN se inyecta un verifier real vía RPC en el punto de composición
- THEN la UI y la máquina funcionan sin cambios

#### Scenario: Mismos casos de test verdes tras la migración

- GIVEN la máquina migrada a la API elegida (xstate o FSM pura documentada)
- WHEN se ejecuta `bun test`
- THEN los casos de la máquina OTP (transiciones, intentos, expiración, veredictos) pasan con cobertura equivalente a los 9 tests previos
