import { useEffect, useState } from "octane";
import {
  isGroupActive,
  isItemActive,
  pathnameOf,
} from "../../../lib/nav/active";
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

/** Persistencia del colapso (D7): una key, sin abstraer framework. */
const SIDEBAR_STORAGE_KEY = "crm-sidebar";

/**
 * Organismo de navegación lateral (D8, árbol §7): `<nav>` con `<ul>`,
 * NavItem/NavGroup con `aria-current="page"` en el activo, ThemeToggle y
 * toggle de colapso al pie (260px ↔ 64px, persistido en localStorage).
 * Todo es `<a>`/`<button>` nativo: cero handlers de teclado custom (WCAG 2.1.1).
 */
export function SidebarNav(props: SidebarNavProps) @{
  const t = useT();
  const pathname = pathnameOf(props.url);

  // SSR e hidratación inicial renderizan EXPANDIDO (snapshot estable); la
  // preferencia persistida se aplica tras montar (única lectura del storage).
  const [collapsed, setCollapsed] = useState(false);

  useEffect(() => {
    try {
      setCollapsed(localStorage.getItem(SIDEBAR_STORAGE_KEY) === "collapsed");
    } catch {
      // Storage inaccesible (modo privado estricto): queda expandido.
    }
  }, []);

  const toggleCollapsed = () => {
    const next = !collapsed;
    setCollapsed(next);
    try {
      localStorage.setItem(
        SIDEBAR_STORAGE_KEY,
        next ? "collapsed" : "expanded",
      );
    } catch {
      // Sin persistencia disponible: el estado vive solo en memoria.
    }
  };

  const collapseLabel = collapsed ? t("shell.expand") : t("shell.collapse");

  <nav
    aria-label={t("nav.ariaLabel")}
    class={`sticky top-0 flex h-dvh shrink-0 flex-col border-r border-border bg-background transition-[width] ${collapsed ? "w-16" : "w-65"}`}
  >
    <ul class="m-0 flex list-none flex-col gap-0.5 overflow-y-auto p-3">
      {NAV_TREE.map((node) =>
        node.type === "group" ? (
          <NavGroup
            label={t(node.labelKey)}
            icon={node.icon}
            active={isGroupActive(pathname, node.children)}
            collapsed={collapsed}
          >
            {node.children.map((child) => (
              <li>
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
          <li>
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
        onClick={toggleCollapsed}
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
