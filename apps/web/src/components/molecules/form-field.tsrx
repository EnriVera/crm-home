import { StatusMessage } from "../atoms/status-message.tsrx";
import { TextInput } from "../atoms/text-input.tsrx";

export interface FormFieldProps {
  id: string;
  label: string;
  type?: "text" | "email";
  value?: string;
  placeholder?: string;
  autoComplete?: string;
  required?: boolean;
  disabled?: boolean;
  /** Mensaje de error inline (i18n); activa aria-invalid + aria-describedby. */
  error?: string;
  onInput?: (value: string) => void;
}

/**
 * Molecule campo de formulario (D8): label + input + error inline accesible
 * (`aria-invalid` + `aria-describedby` apuntando al mensaje).
 */
export function FormField(props: FormFieldProps) @{
  const errorId = `${props.id}-error`;

  <div class="flex flex-col gap-1.5">
    <label
      for={props.id}
      class="text-sm font-medium text-text-primary"
    >
      {props.label}
    </label>
    <TextInput
      id={props.id}
      type={props.type}
      value={props.value}
      placeholder={props.placeholder}
      autoComplete={props.autoComplete}
      required={props.required}
      disabled={props.disabled}
      invalid={props.error !== undefined}
      aria-describedby={props.error !== undefined ? errorId : undefined}
      onInput={props.onInput}
    />
    {props.error !== undefined ? (
      <StatusMessage id={errorId} variant="error">
        {props.error}
      </StatusMessage>
    ) : null}
  </div>
}
