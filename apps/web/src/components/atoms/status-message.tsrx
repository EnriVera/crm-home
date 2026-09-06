export interface StatusMessageProps {
  variant: "error" | "success";
  /** id para que el campo asociado lo referencie con aria-describedby. */
  id?: string;
  children?: unknown;
  class?: string;
}

const VARIANT_CLASS: Record<StatusMessageProps["variant"], string> = {
  error: "text-error",
  success: "text-success",
};

/**
 * Atom mensaje de estado (D8): tokens `text-error`/`text-success` (AA en
 * ambos temas). `role="alert"` anuncia errores a lectores de pantalla;
 * `role="status"` (polite) para éxitos.
 */
export function StatusMessage(props: StatusMessageProps) @{
  <p
    id={props.id}
    role={props.variant === "error" ? "alert" : "status"}
    class={`m-0 text-sm ${VARIANT_CLASS[props.variant]} ${props.class ?? ""}`}
  >
    {props.children}
  </p>
}
