/**
 * Máquina OTP del wrapper `vendor/otp-input` (D1 — fallback hand-rolled).
 *
 * Provenance y decisión: la base prevista era `@zag-js/pin-input` +
 * `@zag-js/core`, pero la v1 de zagjs eliminó el runtime de servicio vanilla
 * (`createService`/`interpret`): el `Service` solo se construye dentro de los
 * adapters de framework (react/vue/solid), incompatibles con el runtime de
 * Octane. Conforme a D1, el fallback hand-rolled mantiene EXACTAMENTE la
 * interfaz pública del wrapper (`OtpInputProps`) y el comportamiento de la
 * máquina pin-input: auto-avance, backspace que retrocede, paste distribuido
 * entre celdas con ceros a la izquierda preservados (PRD §8.1).
 *
 * TS puro, sin DOM: testeable headless (`machine.test.ts`).
 */

export interface OtpMachineOptions {
  /** Cantidad de celdas (default 6, PRD §8.1). */
  length?: number;
  /** Máquina inerte: ignora tipeo y paste. */
  disabled?: boolean;
  /** Se dispara UNA vez al completarse el código; preserva ceros a la izquierda. */
  onComplete?: (code: string) => void;
}

export interface OtpMachine {
  /** Slots actuales; string vacío en celdas sin dígito. */
  getValue(): string[];
  /** Escribe un dígito en una celda (rechaza no numéricos). */
  typeDigit(index: number, digit: string): void;
  /** Borra una celda y devuelve el índice de foco destino (retrocede). */
  backspace(index: number): number;
  /** Distribuye texto pegado entre celdas desde `index` (solo dígitos). */
  paste(index: number, text: string): void;
  /** Todas las celdas tienen dígito. */
  isComplete(): boolean;
  /** Vacía todas las celdas. */
  reset(): void;
}

const DIGIT = /^[0-9]$/;

export function createOtpMachine(options: OtpMachineOptions = {}): OtpMachine {
  const length = options.length ?? 6;
  const disabled = options.disabled ?? false;
  let slots: string[] = Array.from({ length }, () => "");
  let completedFired = false;

  const maybeComplete = () => {
    if (completedFired || !slots.every((slot) => DIGIT.test(slot))) return;
    completedFired = true;
    options.onComplete?.(slots.join(""));
  };

  const clampIndex = (index: number) =>
    Math.max(0, Math.min(index, length - 1));

  return {
    getValue(): string[] {
      return [...slots];
    },

    typeDigit(index: number, digit: string): void {
      if (disabled || !DIGIT.test(digit)) return;
      slots[clampIndex(index)] = digit;
      maybeComplete();
    },

    backspace(index: number): number {
      if (disabled) return clampIndex(index);
      const current = clampIndex(index);
      if (slots[current] !== "") {
        slots[current] = "";
        completedFired = false;
        return current;
      }
      const previous = Math.max(0, current - 1);
      slots[previous] = "";
      completedFired = false;
      return previous;
    },

    paste(index: number, text: string): void {
      if (disabled) return;
      const digits = text.split("").filter((char) => DIGIT.test(char));
      let cursor = clampIndex(index);
      for (const digit of digits) {
        if (cursor >= length) break;
        slots[cursor] = digit;
        cursor += 1;
      }
      maybeComplete();
    },

    isComplete(): boolean {
      return slots.every((slot) => DIGIT.test(slot));
    },

    reset(): void {
      slots = Array.from({ length }, () => "");
      completedFired = false;
    },
  };
}
