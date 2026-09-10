import { normalizeProps, useMachine } from "@octanejs/zag";
import * as pinInput from "@zag-js/pin-input";

import { toPinInputProps } from "./pin-input-props";

/**
 * Contrato público del wrapper (D1, preservado por D-SA1). ESTABLE hacia el
 * change de auth: no cambia aunque la base interna cambie (hoy zag pin-input;
 * ver README).
 */
export interface OtpInputProps {
  length?: number; // default 6
  disabled?: boolean;
  invalid?: boolean; // pinta estado de error (tokens de estado)
  onComplete?: (code: string) => void; // preserva ceros a la izquierda
  "aria-label"?: string;
}

// `caret-text-primary` hereda --color-text-primary del tema activo
// (#171717 light / #fafafa dark). Soporte: Chrome 57+, Firefox 53+,
// Safari 11.1+. Fallback silencioso al color del sistema en navegadores
// antiguos (sin regresión funcional).
const CELL_CLASS =
  "size-11 rounded-md border border-border bg-background text-center text-lg font-semibold text-text-primary caret-text-primary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus disabled:opacity-50 data-[invalid]:border-error";

/**
 * Input de código OTP (PRD §8.1) sobre la máquina zag pin-input vía
 * `@octanejs/zag` (D-SA1): celdas con `inputmode="numeric"` y
 * `pattern="[0-9]*"`, NUNCA `type="number"` (preserva ceros a la izquierda).
 * Paste distribuido, auto-avance/retroceso y data-attributes
 * (`data-invalid`, `data-complete`, `data-disabled`) los provee el binding.
 */
export function OtpInput(props: OtpInputProps) @{
  const length = props.length ?? 6;
  const groupLabel = props["aria-label"] ?? "OTP";

  const service = useMachine(pinInput.machine, toPinInputProps(props));
  const api = pinInput.connect(service, normalizeProps);

  <div
    {...api.getRootProps()}
    role="group"
    aria-label={groupLabel}
    class="flex items-center gap-2"
  >
    {Array.from({ length }, (_, index) => (
      <input
        key={`otp-cell-${index}`}
        {...api.getInputProps({ index })}
        aria-label={`${groupLabel} ${index + 1}/${length}`}
        class={CELL_CLASS}
      />
    ))}
  </div>
}
