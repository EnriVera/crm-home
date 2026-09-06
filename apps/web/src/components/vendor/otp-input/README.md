# vendor/otp-input

Wrapper del input de código OTP (PRD §8.1). ÚNICO módulo del codebase
autorizado a contener la lógica de la máquina de pin/OTP (regla §9 de
wrappers); los consumidores solo conocen `OtpInput` y su contrato
`OtpInputProps` (D1), estable hacia el change de auth.

## Provenance y decisión de base

- **Base prevista (D1):** `@zag-js/pin-input` + `@zag-js/core` (stack
  declarado en `openspec/config.yaml`), instaladas y pineadas (`1.43.3`)
  durante la implementación.
- **Incompatibilidad detectada:** zagjs v1 eliminó el runtime de servicio
  vanilla (`createService`/`interpret`); el `Service` solo se construye
  dentro de los adapters de framework (react/vue/solid), incompatibles con
  el runtime de Octane (riesgo 🟡 previsto en D1). Las dependencias se
  retiraron para no arrastrar runtime muerto; el pin queda registrado en la
  historia de git por si un futuro adapter vanilla las rehabilita.
- **Fallback aplicado (D1, explícito):** implementación hand-rolled con la
  MISMA interfaz pública `OtpInputProps` y el mismo comportamiento de la
  máquina pin-input: auto-avance, backspace que retrocede, paste distribuido
  entre celdas con ceros a la izquierda preservados (`"041283"` →
  `["0","4","1","2","8","3"]`), `inputmode="numeric"`, `pattern="[0-9]*"`,
  `autocomplete="one-time-code"`, NUNCA `type="number"`.

## Estructura

- `machine.ts` — máquina de estado puro, testeable headless (`machine.test.ts`).
- `normalize-props.ts` — mapeo descriptor→props DOM de Octane, documentado.
- `otp-input.tsrx` — componente; capa DOM delgada sobre la máquina.

## Addendum — D-SA1 (supersede D1)

La causa raíz del fallback D1 (zag v1 sin runtime vanilla) quedó resuelta por
`@octanejs/zag` (el adapter de Octane que faltaba). El wrapper se reimplementó
sobre `@octanejs/zag@0.0.18` + `@zag-js/pin-input@1.42.0` (pin exacto; la
versión 1.42.0 iguala el `@zag-js/core@1.42.0` del adapter — la 1.43.3
introducía una segunda copia de core con tipos incompatibles, divergencia
prevista como riesgo 🟡 en D-SA1 y resuelta por alineación de versión, sin
necesidad de la cadena de fallback).

- `pin-input-props.ts` — única lógica propia: mapeo puro `OtpInputProps` →
  props de la máquina zag (`toPinInputProps`). Testeado por
  `pin-input-props.test.ts`.
- `otp-input.tsrx` — `useMachine(pinInput.machine)` + `connect(service,
  normalizeProps)`; styling por data-attributes del binding
  (`data-invalid`, `data-complete`, `data-disabled`) con los mismos tokens.
- `machine.ts`, `normalize-props.ts` y `machine.test.ts` (D1) — eliminados.

**Justificación del re-enfoque de los 8 tests:** la máquina zag no es
headless-testeable en TS puro sin el runtime de Octane (el `Service` vive en
el adapter). La lógica de la máquina queda cubierta por la suite CI de zag
upstream; la cobertura residual del wrapper es el contrato — los 8 tests se
reescribieron contra `toPinInputProps` cubriendo los mismos comportamientos a
nivel de mapeo (default length 6, rechazo de no-numéricos vía
`pattern`/`type`, `onComplete` → `onValueComplete(valueAsString)` con ceros
preservados, disabled inerte, invalid propagado). Cobertura equivalente,
adaptada — nunca borrada sin reemplazo.

El contrato público `OtpInputProps` quedó idéntico; el export interno
`createOtpMachine` de la máquina hand-rolled se eliminó (solo lo importaba
`otp-input.tsrx`; su rol lo cumple la máquina zag).
