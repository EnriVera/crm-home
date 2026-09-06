/**
 * normalizeProps del wrapper `vendor/otp-input` (D1).
 *
 * Traduce los descriptores de props que produce la capa de conexión del
 * wrapper (nomenclatura estilo adapter: `htmlFor`, `onChange`, data-attrs) a
 * props de DOM válidas para el runtime de Octane. Es el ÚNICO lugar donde
 * vive ese mapeo.
 *
 * Mapeos documentados:
 * - `htmlFor`        → `for`            (atributo nativo de <label>)
 * - `onChange`       → `onInput`        (Octane despacha `input`; no existe
 *                                        el evento sintético `change` de React)
 * - `autoComplete`   → `autocomplete`   (atributo HTML en minúsculas)
 * - `inputMode`      → `inputmode`
 * - data-attributes  → passthrough sin cambios (`data-invalid`, etc.)
 * - el resto         → passthrough (`id`, `type`, `value`, `maxLength`,
 *                      `disabled`, `pattern`, handlers de teclado/paste)
 */

/** Descriptor de props de una celda, en nomenclatura de adapter. */
export interface CellPropDescriptor {
  id: string;
  type: "text";
  inputMode: "numeric";
  pattern: "[0-9]*";
  autoComplete: "one-time-code";
  maxLength: 1;
  value: string;
  disabled?: boolean;
  "data-invalid"?: "" | undefined;
  "aria-label": string;
  onChange: (value: string) => void;
  /** Recibe la tecla y el evento (para `preventDefault`, p. ej. Backspace). */
  onKeydown: (key: string, event: KeyboardEvent) => void;
  onPaste: (text: string) => void;
}

/** Props de celda normalizadas para el runtime de Octane. */
export interface NormalizedCellProps {
  id: string;
  type: "text";
  inputmode: "numeric";
  pattern: "[0-9]*";
  autocomplete: "one-time-code";
  maxLength: 1;
  value: string;
  disabled?: boolean;
  "data-invalid"?: "" | undefined;
  "aria-label": string;
  onInput: (event: Event) => void;
  onKeyDown: (event: KeyboardEvent) => void;
  onPaste: (event: ClipboardEvent) => void;
}

/** Normaliza el descriptor de una celda a props DOM de Octane. */
export function normalizeCellProps(
  descriptor: CellPropDescriptor,
): NormalizedCellProps {
  const { inputMode, autoComplete, onChange, onKeydown, onPaste, ...rest } =
    descriptor;
  return {
    ...rest,
    inputmode: inputMode,
    autocomplete: autoComplete,
    onInput: (event) => {
      const target = event.target as HTMLInputElement | null;
      onChange(target?.value ?? "");
    },
    onKeyDown: (event) => {
      onKeydown(event.key, event);
    },
    onPaste: (event) => {
      event.preventDefault();
      onPaste(event.clipboardData?.getData("text") ?? "");
    },
  };
}

/** Normaliza props de <label> (`htmlFor` → `for`). */
export function normalizeLabelProps(descriptor: { htmlFor: string }): {
  for: string;
} {
  return { for: descriptor.htmlFor };
}
