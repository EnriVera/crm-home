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
