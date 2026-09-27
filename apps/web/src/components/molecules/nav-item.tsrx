import { Link } from "@octanejs/wouter";
import { Icon, type IconName } from "../vendor/icons";

export interface NavItemProps {
  href: string;
  icon: IconName;
  label: string;
  /** Deriva de `isItemActive` (lib/nav/active); emite aria-current="page". */
  active?: boolean;
  /** Sidebar colapsado: solo ícono; el label queda en title + aria-label. */
  collapsed?: boolean;
}

/**
 * Molecule item de navegación (D8): wouter `<Link>` + ícono + label.
 *
 * wouter intercepta el click, hace `preventDefault` y empuja la nueva URL
 * vía History API. `<RouteSync>` (en `lib/nav/route-sync.tsrx`) escucha los
 * cambios de `useLocation`, hace fetch del HTML server-rendered de la nueva
 * ruta y reemplaza `<main id="content">` en lugar del clásico full-reload de
 * octane fullstack. El `<Link>` sigue siendo un `<a href>` real para
 * accesibilidad (lectores de pantalla, click derecho → "abrir en pestaña
 * nueva", modifier-click → nueva ventana), así que las acciones nativas del
 * browser siguen funcionando sin handlers custom.
 *
 * Contraste D6.5: activo `primary-700` (claro) / `primary-400` (oscuro);
 * inactivo `text-text-secondary`.
 */
export function NavItem(props: NavItemProps) @{
  const stateClass = props.active
    ? "bg-surface font-medium text-primary-700 dark:text-primary-400"
    : "text-text-secondary hover:bg-surface hover:text-text-primary";

  <Link
    href={props.href}
    aria-current={props.active ? "page" : undefined}
    aria-label={props.collapsed ? props.label : undefined}
    title={props.collapsed ? props.label : undefined}
    className={`flex items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus ${props.collapsed ? "justify-center px-0" : ""} ${stateClass}`}
  >
    <Icon name={props.icon} size={20} />
    {props.collapsed ? null : <span>{props.label}</span>}
  </Link>
}
