export interface TextInputProps {
  id: string;
  name?: string;
  type?: "text" | "email";
  value?: string;
  placeholder?: string;
  autocomplete?: string;
  required?: boolean;
  disabled?: boolean;
  invalid?: boolean;
  "aria-describedby"?: string;
  onInput?: (value: string) => void;
  class?: string;
}

const INPUT_CLASS =
  "w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-text-primary placeholder:text-text-secondary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus disabled:cursor-not-allowed disabled:opacity-50";

/** Atom input de texto (D8): solo tokens, foco visible canónico. */
export function TextInput(props: TextInputProps) @{
  <input
    id={props.id}
    name={props.name ?? props.id}
    type={props.type ?? "text"}
    value={props.value}
    placeholder={props.placeholder}
    autocomplete={props.autocomplete}
    required={props.required}
    disabled={props.disabled}
    aria-invalid={props.invalid ? true : undefined}
    aria-describedby={props["aria-describedby"]}
    onInput={(event: Event) => {
      const target = event.target as HTMLInputElement | null;
      props.onInput?.(target?.value ?? "");
    }}
    class={`${INPUT_CLASS} ${props.invalid ? "border-error" : ""} ${props.class ?? ""}`}
  />
}
