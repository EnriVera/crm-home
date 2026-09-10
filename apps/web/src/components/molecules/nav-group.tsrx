import type { OctaneNode } from "octane";
import { Icon, type IconName } from "../vendor/icons";

export interface NavGroupProps {
  /** Encabezado NO clicable del grupo (i18n). */
  label: string;
  icon: IconName;
  /** Alguno de los hijos está activo (deriva de `isGroupActive`). */
  active?: boolean;
  collapsed?: boolean;
  /** Lista de NavItem hijos. */
  children?: OctaneNode;
}

/**
 * Molecule grupo de navegación (D8 — p. ej. Finance): encabezado no clicable
 * + lista de hijos. El encabezado se marca activo cuando algún hijo lo está.
 */
export function NavGroup(props: NavGroupProps) @{
  // Cabecera activa: jerarquía por peso + contraste neutral. El verde se
  // queda en el NavItem hijo (caso canónico de la lista cerrada: nav activo);
  // duplicar el tinte aquí sería una segunda señal cromática para el mismo
  // hecho visual.
  const stateClass = props.active
    ? "text-text-primary font-medium"
    : "text-text-secondary";

  <li>
    <div
      aria-label={props.collapsed ? props.label : undefined}
      title={props.collapsed ? props.label : undefined}
      class={`flex items-center gap-3 px-3 pb-1 pt-3 text-xs font-semibold uppercase tracking-wide ${props.collapsed ? "justify-center px-0" : ""} ${stateClass}`}
    >
      <Icon name={props.icon} size={20} />
      {props.collapsed ? null : <span>{props.label}</span>}
    </div>
    <ul class="m-0 flex list-none flex-col gap-0.5 p-0 pl-2">
      {props.children}
    </ul>
  </li>
}
