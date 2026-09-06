export interface ButtonProps {
  /** primary = relleno verde + texto blanco (única acción primaria por pantalla). */
  variant?: "primary" | "ghost";
  type?: "button" | "submit";
  disabled?: boolean;
  onClick?: (event: MouseEvent) => void;
  class?: string;
  children?: unknown;
  "aria-label"?: string;
}

const BASE_CLASS =
  "inline-flex items-center justify-center gap-2 rounded-md px-4 py-2 text-sm font-medium transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus disabled:cursor-not-allowed disabled:opacity-50";

const VARIANT_CLASS: Record<NonNullable<ButtonProps["variant"]>, string> = {
  // Verde como RELLENO de acción primaria con texto blanco (regla D6.5).
  primary: "bg-primary text-white hover:bg-primary-700 dark:hover:bg-primary-400",
  // Texto interactivo pequeño: primary-700 en claro / primary-400 en oscuro.
  ghost: "bg-transparent text-primary-700 hover:bg-surface dark:text-primary-400",
};

/** Atom botón (D8): estados primary/ghost, foco visible canónico. */
export function Button(props: ButtonProps) @{
  const variant = props.variant ?? "primary";

  <button
    type={props.type ?? "button"}
    disabled={props.disabled}
    aria-label={props["aria-label"]}
    onClick={props.onClick}
    class={`${BASE_CLASS} ${VARIANT_CLASS[variant]} ${props.class ?? ""}`}
  >
    {props.children}
  </button>
}
