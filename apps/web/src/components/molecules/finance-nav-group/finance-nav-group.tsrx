import { useEffect, useState } from "octane";
import {
  loadFinanceCollapsed,
  saveFinanceCollapsed,
} from "../../../lib/nav/finance-collapsed";
import { Icon, type IconName } from "../../vendor/icons";
import { useT } from "../../vendor/i18n";
import { Disclosure } from "../../vendor/disclosure";
import { NavItem } from "../nav-item.tsrx";
import { isItemActive } from "../../../lib/nav/active";

export interface FinanceNavGroupChild {
  href: string;
  label: string;
  icon: IconName;
}

export interface FinanceNavGroupProps {
  /** Label del grupo, ya traducido (i18n se hace fuera del componente). */
  label: string;
  /** Hijos: items de Finance (income / expenses / transfers). */
  children: ReadonlyArray<FinanceNavGroupChild>;
  /** Pathname actual (deriva `active` de cada hijo). */
  pathname: string;
  /** Sidebar colapsado: solo ícono del grupo + íconos de hijos sin label. */
  collapsed?: boolean;
}

/**
 * Grupo Finance del sidebar: `Disclosure` (zag collapsible) que envuelve un
 * header clickable (ícono wallet + label + chevron rotatorio) y un panel con
 * los hijos (income / expenses / transfers). El estado open/close se
 * persiste en localStorage (`crm.finance.collapsed`) y se hidrata en mount;
 * default expandido.
 *
 * Renderiza el `Disclosure` directamente en SSR y cliente (sin deferred
 * rendering) — el bug de markers que motivaba el defer era en realidad el
 * doble `<li>` en `SidebarNav`'s `.map`, ya resuelto en commit `1f46aad`.
 */
export function FinanceNavGroup(props: FinanceNavGroupProps) @{
  const t = useT();

  // Hidratación: en SSR arrancamos expandidos (no leemos localStorage); en
  // mount leemos la preferencia persistida y la aplicamos vía `open`.
  const [hydratedCollapsed, setHydratedCollapsed] = useState<boolean | null>(
    null,
  );

  useEffect(() => {
    setHydratedCollapsed(loadFinanceCollapsed());
  }, []);

  // Mientras no hidratamos, expandidos (default). Una vez hidratados,
  // usamos el valor persistido. Después de hidratar, el `open` se actualiza
  // localmente en cada toggle (además de persistirlo en localStorage) para
  // que el `Disclosure` controlado responda al click.
  const [open, setOpen] = useState<boolean>(true);
  useEffect(() => {
    if (hydratedCollapsed !== null) {
      setOpen(!hydratedCollapsed);
    }
  }, [hydratedCollapsed]);
  const handleOpenChange = (details: { open: boolean }) => {
    saveFinanceCollapsed(!details.open);
    setOpen(details.open);
  };

  const hasActiveChild = props.children.some((c) =>
    isItemActive(props.pathname, c.href),
  );

  return (
    <li>
      <Disclosure
        defaultOpen={open}
        open={open}
        onOpenChange={handleOpenChange}
        trigger={
          <span
            class={`flex w-full items-center gap-3 px-3 pb-1 pt-3 text-xs font-semibold uppercase tracking-wide ${
              hasActiveChild ? "text-text-primary" : "text-text-secondary"
            }`}
          >
            <Icon name="wallet" size={20} />
            {props.collapsed === true ? null : (
              <>
                <span class="flex-1 text-left">{props.label}</span>
                <span
                  data-part="indicator"
                  data-state={open ? "open" : "closed"}
                  aria-hidden="true"
                  class="inline-block size-3 transition-transform data-[state=open]:rotate-180"
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="12"
                    height="12"
                    viewBox="0 0 12 12"
                    fill="none"
                    stroke="currentColor"
                    stroke-width="1.5"
                    stroke-linecap="round"
                    stroke-linejoin="round"
                  >
                    <polyline points="3 4.5 6 7.5 9 4.5" />
                  </svg>
                </span>
              </>
            )}
          </span>
        }
      >
        <ul class="m-0 flex list-none flex-col gap-0.5 p-0 pl-2">
          {props.children.map((child) => (
            <li key={child.href}>
              <NavItem
                href={child.href}
                icon={child.icon}
                label={child.label}
                active={isItemActive(props.pathname, child.href)}
                collapsed={props.collapsed}
              />
            </li>
          ))}
        </ul>
      </Disclosure>
    </li>
  );
}