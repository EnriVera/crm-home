import { useEffect, useState } from "octane";
import type { OctaneNode } from "octane";
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
 * default expandido para preservar el comportamiento previo al rediseño.
 *
 * SSR-safe (hydration): el `Disclosure` de zag emite markup diferente en
 * SSR vs cliente (atributos `data-state`, `aria-controls`, `id`, derivados
 * de la máquina de estado que `useMachine` arranca en cada lado). Eso
 * rompe el walker de hidratación de octane (`findMatchingClose` corre
 * hasta el final del parent y encuentra null). Para evitarlo, NO
 * renderizamos el `Disclosure` en SSR — sólo en el cliente post-mount.
 * El SSR emite un `<li>` con un fallback de "Finance" que el cliente
 * reemplaza en el siguiente render.
 */
export function FinanceNavGroup(props: FinanceNavGroupProps) @{
  const t = useT();

  // Hidratación: en SSR retorna false (no renderiza Disclosure); en mount
  // pasa a true. El `useEffect` corre sólo en cliente.
  const [mounted, setMounted] = useState(false);
  const [hydratedCollapsed, setHydratedCollapsed] = useState<boolean | null>(
    null,
  );

  useEffect(() => {
    setMounted(true);
    setHydratedCollapsed(loadFinanceCollapsed());
  }, []);

  // Mientras no estamos montados, renderizamos un fallback SSR-safe
  // (lista plana con los hijos, sin máquina de estado).
  if (mounted === false) {
    <li>
      <span
        class={`flex w-full items-center gap-3 px-3 pb-1 pt-3 text-xs font-semibold uppercase tracking-wide ${
          props.children.some((c) => isItemActive(props.pathname, c.href))
            ? "text-text-primary"
            : "text-text-secondary"
        } ${props.collapsed === true ? "justify-center px-0" : ""}`}
      >
        <Icon name="wallet" size={20} />
        {props.collapsed === true ? null : (
          <span class="flex-1 text-left">{props.label}</span>
        )}
      </span>
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
    </li>;
    return;
  }

  // Cliente (post-mount): disclosure completo con persistencia.
  const initialOpen = hydratedCollapsed === null ? true : !hydratedCollapsed;
  const open = initialOpen;
  const handleOpenChange = (details: { open: boolean }) => {
    saveFinanceCollapsed(!details.open);
  };

  const hasActiveChild = props.children.some((c) =>
    isItemActive(props.pathname, c.href),
  );

  <li>
    <Disclosure
      defaultOpen={initialOpen}
      open={open}
      onOpenChange={handleOpenChange}
      trigger={
        <span
          class={`flex w-full items-center gap-3 px-3 pb-1 pt-3 text-xs font-semibold uppercase tracking-wide ${
            hasActiveChild ? "text-text-primary" : "text-text-secondary"
          } ${props.collapsed === true ? "justify-center px-0" : ""}`}
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
  </li>;
}
