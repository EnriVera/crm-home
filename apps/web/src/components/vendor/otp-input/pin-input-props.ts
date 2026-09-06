import type { Props as PinInputProps } from "@zag-js/pin-input";

import type { OtpInputProps } from "./otp-input.tsrx";

export const OTP_INPUT_DEFAULT_LENGTH = 6;

/**
 * Mapeo puro del contrato público `OtpInputProps` → props de la máquina zag
 * pin-input (D-SA1). Única lógica propia que sobrevive al swap: la máquina
 * (`@zag-js/pin-input`) y su Service (`@octanejs/zag`) hacen el resto.
 *
 * Invariantes §8.1: `type: "numeric"` (NUNCA `type="number"` — ceros a la
 * izquierda), `pattern: "[0-9]*"`, `otp: true` (`autocomplete="one-time-code"`),
 * `onComplete` cableado a `onValueComplete(details.valueAsString)`.
 */
export function toPinInputProps(props: OtpInputProps): PinInputProps {
  const length = props.length ?? OTP_INPUT_DEFAULT_LENGTH;
  return {
    // id estable: una única instancia por pantalla (login-verification);
    // SSR e hidratación comparten el mismo id (snapshot estable).
    id: "otp-input",
    count: length,
    defaultValue: Array.from({ length }, () => ""),
    type: "numeric",
    otp: true,
    pattern: "[0-9]*",
    // Paridad visual con el wrapper previo: celdas vacías, sin "○" de zag.
    placeholder: "",
    disabled: props.disabled,
    invalid: props.invalid,
    onValueComplete: props.onComplete
      ? (details) => {
          props.onComplete!(details.valueAsString);
        }
      : undefined,
  };
}
