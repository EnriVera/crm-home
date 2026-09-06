import { useRef, useState } from "octane";
import { createOtpMachine, type OtpMachine } from "./machine";
import { normalizeCellProps } from "./normalize-props";

/**
 * Contrato público del wrapper (D1). ESTABLE hacia el change de auth: no
 * cambia aunque la base interna cambie (hoy hand-rolled; ver README).
 */
export interface OtpInputProps {
  length?: number; // default 6
  disabled?: boolean;
  invalid?: boolean; // pinta estado de error (tokens de estado)
  onComplete?: (code: string) => void; // preserva ceros a la izquierda
  "aria-label"?: string;
}

const CELL_CLASS =
  "size-11 rounded-md border border-border bg-background text-center text-lg font-semibold text-text-primary caret-primary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus disabled:opacity-50";
const CELL_INVALID_CLASS = "border-error";

/**
 * Input de código OTP (PRD §8.1): celdas con `inputmode="numeric"` y
 * `pattern="[0-9]*"`, NUNCA `type="number"` (preserva ceros a la izquierda).
 * Paste distribuido entre celdas; auto-avance y backspace que retrocede.
 * La máquina (`machine.ts`) es la única fuente de verdad del valor.
 */
export function OtpInput(props: OtpInputProps) @{
  const length = props.length ?? 6;
  const groupLabel = props["aria-label"] ?? "OTP";

  const machineRef = useRef<OtpMachine | null>(null);
  if (machineRef.current === null) {
    machineRef.current = createOtpMachine({
      length,
      disabled: props.disabled,
      onComplete: props.onComplete,
    });
  }
  const machine = machineRef.current;

  const [value, setValue] = useState<string[]>(() => machine.getValue());
  const cellRefs = useRef<Array<HTMLInputElement | null>>([]);

  const focusCell = (index: number) => {
    cellRefs.current[index]?.focus();
  };

  const sync = () => {
    setValue(machine.getValue());
  };

  const handleChange = (index: number, raw: string) => {
    // El usuario pudo tipear sobre una celda con valor: nos quedamos con el
    // ÚLTIMO dígito ingresado (comportamiento pin-input).
    const digit = raw.replace(/[^0-9]/g, "").slice(-1);
    if (digit === "") {
      // Borrado por selección: limpia la celda, el foco permanece.
      machine.backspace(index);
      sync();
      return;
    }
    machine.typeDigit(index, digit);
    sync();
    if (index < length - 1) {
      focusCell(index + 1);
    }
  };

  const handleKeydown = (
    index: number,
    key: string,
    event: KeyboardEvent,
  ) => {
    if (key !== "Backspace") return;
    // Manejo manual: evita que el `input` posterior borre dos veces.
    event.preventDefault();
    const focusIndex = machine.backspace(index);
    sync();
    focusCell(focusIndex);
  };

  const handlePaste = (index: number, text: string) => {
    machine.paste(index, text);
    sync();
    const slots = machine.getValue();
    const firstEmpty = slots.findIndex((slot) => slot === "");
    focusCell(firstEmpty === -1 ? length - 1 : firstEmpty);
  };

  <div
    role="group"
    aria-label={groupLabel}
    data-invalid={props.invalid ? "" : undefined}
    class="flex items-center gap-2"
  >
    {value.map((slot, index) => {
      const cellProps = normalizeCellProps({
        id: `otp-cell-${index}`,
        type: "text",
        inputMode: "numeric",
        pattern: "[0-9]*",
        autoComplete: "one-time-code",
        maxLength: 1,
        value: slot,
        disabled: props.disabled,
        "data-invalid": props.invalid ? "" : undefined,
        // Etiqueta por celda derivada del label de grupo: la fracción
        // numérica es language-neutral y no agrega cadenas al wrapper.
        "aria-label": `${groupLabel} ${index + 1}/${length}`,
        onChange: (raw) => handleChange(index, raw),
        onKeydown: (key, event) => handleKeydown(index, key, event),
        onPaste: (text) => handlePaste(index, text),
      });
      return (
        <input
          {...cellProps}
          aria-invalid={props.invalid ? true : undefined}
          ref={(el: HTMLInputElement | null) => {
            cellRefs.current[index] = el;
          }}
          class={`${CELL_CLASS} ${props.invalid ? CELL_INVALID_CLASS : ""}`}
        />
      );
    })}
  </div>
}
