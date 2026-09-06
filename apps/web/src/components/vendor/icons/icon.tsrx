import { ICON_COMPONENTS, type IconName } from "./paths";

export interface IconProps {
  /** Nombre del ícono; union cerrada decidida en design (D4, superseded por D-SA8). */
  name: IconName;
  /** Tamaño en px (ancho = alto). Default 20 (nav del shell). */
  size?: number;
  /** Texto accesible; si se omite, el ícono es decorativo (aria-hidden). */
  "aria-label"?: string;
  class?: string;
}

/**
 * Ícono del design system (D-SA8): delega en el componente de
 * `@octanejs/phosphor-icons` con peso `regular` y `fill="currentColor"`
 * para heredar el color de texto del contexto. Contrato `IconProps` intacto.
 */
export function Icon(props: IconProps) @{
  const size = props.size ?? 20;
  const PhosphorIcon = ICON_COMPONENTS[props.name];

  <PhosphorIcon
    size={size}
    weight="regular"
    color="currentColor"
    role={props["aria-label"] ? "img" : undefined}
    aria-label={props["aria-label"]}
    aria-hidden={props["aria-label"] ? undefined : true}
    class={props.class}
  />
}
