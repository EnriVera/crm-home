import { ICON_PATHS, type IconName } from "./paths";

export interface IconProps {
  /** Nombre del ícono; union cerrada decidida en design (D4). */
  name: IconName;
  /** Tamaño en px (ancho = alto). Default 20 (nav del shell). */
  size?: number;
  /** Texto accesible; si se omite, el ícono es decorativo (aria-hidden). */
  "aria-label"?: string;
  class?: string;
}

/**
 * Ícono del design system (D4): SVG inline vendored de phosphor (regular),
 * `fill="currentColor"` para heredar el color de texto del contexto.
 */
export function Icon(props: IconProps) @{
  const size = props.size ?? 20;

  <svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 256 256"
    width={size}
    height={size}
    fill="currentColor"
    role={props["aria-label"] ? "img" : undefined}
    aria-label={props["aria-label"]}
    aria-hidden={props["aria-label"] ? undefined : true}
    class={props.class}
  >
    <path d={ICON_PATHS[props.name]} />
  </svg>
}
