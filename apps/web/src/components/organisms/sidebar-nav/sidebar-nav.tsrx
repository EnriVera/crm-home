import { useContext } from "octane";
import {
  isGroupActive,
  isItemActive,
  pathnameOf,
} from "../../../lib/nav/active";
import { SidebarCollapseContext } from "../../../lib/nav/sidebar-collapse";
import { NAV_TREE } from "../../../lib/nav/tree";
import { NavGroup } from "../../molecules/nav-group.tsrx";
import { NavItem } from "../../molecules/nav-item.tsrx";
import { ThemeToggle } from "../../molecules/theme-toggle.tsrx";
import { Icon } from "../../vendor/icons";
import { useT } from "../../vendor/i18n";

export interface SidebarNavProps {
  /**
   * `props.url` del layout (`RenderRouteProps.url`: pathname + search,
   * idéntico en SSR e hidratación — D3). De aquí deriva el estado activo;
   * NUNCA `window.location` (SSR-safe, sin mismatch de hidratación).
   */
  url: string;
}

/**
 * Organismo de navegación lateral (D8 → D-SA6, árbol §7): `<nav>` con `<ul>`,
 * NavItem/NavGroup con `aria-current="page"` en el activo, ThemeToggle y
 * toggle de colapso al pie. El estado `collapsed` deriva del panel del shell
 * vía `SidebarCollapseContext` (el ancho lo controla el binding
 * resizable-panels; la clave booleana `"crm-sidebar"` quedó abandonada) y el
 * toggle llama `panelRef.collapse()/expand()` del shell. Todo es
 * `<a>`/`<button>` nativo: cero handlers de teclado custom (WCAG 2.1.1).
 */
export function SidebarNav(props: SidebarNavProps) @{
  const t = useT();
  const pathname = pathnameOf(props.url);
  const { collapsed, toggle } = useContext(SidebarCollapseContext);

  const collapseLabel = collapsed ? t("shell.expand") : t("shell.collapse");

  <nav
    aria-label={t("nav.ariaLabel")}
    class="sticky top-0 flex h-dvh flex-col overflow-x-hidden border-r border-border bg-background"
  >
    <ul class="m-0 flex list-none flex-col gap-0.5 overflow-y-auto p-3">
      {NAV_TREE.map((node) =>
        node.type === "group" ? (
          <NavGroup
            key={node.labelKey}
            label={t(node.labelKey)}
            icon={node.icon}
            active={isGroupActive(pathname, node.children)}
            collapsed={collapsed}
          >
            {node.children.map((child) => (
              <li key={child.href}>
                <NavItem
                  href={child.href}
                  icon={child.icon}
                  label={t(child.labelKey)}
                  active={isItemActive(pathname, child.href)}
                  collapsed={collapsed}
                />
              </li>
            ))}
          </NavGroup>
        ) : (
          <li key={node.href}>
            <NavItem
              href={node.href}
              icon={node.icon}
              label={t(node.labelKey)}
              active={isItemActive(pathname, node.href)}
              collapsed={collapsed}
            />
          </li>
        ),
      )}
    </ul>
    <div class="mt-auto flex flex-col gap-0.5 border-t border-border p-3">
      <ThemeToggle
        labelLight={t("theme.toLight")}
        labelDark={t("theme.toDark")}
        collapsed={collapsed}
      />
      <button
        type="button"
        onClick={toggle}
        aria-label={collapseLabel}
        aria-expanded={!collapsed}
        title={collapseLabel}
        class={`flex items-center gap-3 rounded-md px-3 py-2 text-sm text-text-secondary transition-colors hover:bg-surface hover:text-text-primary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus ${collapsed ? "justify-center px-0" : ""}`}
      >
        <Icon name="sidebar" size={20} />
        {collapsed ? null : <span>{t("shell.collapse")}</span>}
      </button>
    </div>
  </nav>
}
