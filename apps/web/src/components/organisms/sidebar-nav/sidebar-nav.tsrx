import { useContext, useEffect, useState } from "octane";
import {
  isGroupActive,
  isItemActive,
  pathnameOf,
} from "../../../lib/nav/active";
import {
  getCurrentPath,
  subscribe,
} from "../../../lib/nav/client-router.ts";
import { SidebarCollapseContext } from "../../../lib/nav/sidebar-collapse";
import { NAV_TREE } from "../../../lib/nav/tree";
import { NavGroup } from "../../molecules/nav-group.tsrx";
import { NavItem } from "../../molecules/nav-item.tsrx";
import { ThemeToggle } from "../../molecules/theme-toggle.tsrx";
import { Icon } from "../../vendor/icons";
import { useT } from "../../vendor/i18n";
import { createRpcClient } from "../../../lib/api/rpc";

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
  // First render: derive from the SSR-stable `props.url` (hydration-safe).
  // After mount: subscribe to client-side URL changes so `aria-current` /
  // active styling track SPA navigation performed by the global click
  // interceptor in `lib/nav/client-router.ts`.
  const [pathname, setPathname] = useState<string>(() => pathnameOf(props.url));
  useEffect(() => subscribe(() => setPathname(getCurrentPath())), []);
  const { collapsed, toggle } = useContext(SidebarCollapseContext);
  const [loggingOut, setLoggingOut] = useState(false);

  const collapseLabel = collapsed ? t("shell.expand") : t("shell.collapse");

  // Optimistic logout: navegamos a /login YA para que la UI responda
  // instantáneamente, y disparamos el POST /auth/logout en background.
  // Si el server falla (red caída, 500), el cookie igual queda válida
  // pero la UI ya está en /login — el user verá el form de auth y
  // cualquier RPC siguiente con `credentials: 'include'` será rechazado
  // por el backend porque la sesión sigue viva del lado server. Aceptamos
  // esa inconsistencia porque el patrón canónico es "logout local first,
  // server second" (ver el interceptor 401 → /login?reauth=1 en rpc.ts).
  const rpc = createRpcClient(import.meta.env.VITE_API_URL ?? "/rpc");
  const handleLogout = async () => {
    if (loggingOut) return;
    setLoggingOut(true);
    globalThis.history.pushState({}, "", "/login");
    try {
      await rpc.auth.logout();
    } catch {
      // Swallow: navegamos igual (el user está en /login). El cookie
      // queda válida server-side hasta que expire (30d default), pero
      // cualquier GET /dashboard será redirigido a /login por la cookie
      // presence check del session-guard. Sin throw → sin error en UI.
    }
  };

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
      <button
        type="button"
        onClick={() => {
          void handleLogout();
        }}
        disabled={loggingOut}
        aria-label={t("shell.logout")}
        title={t("shell.logout")}
        data-action="logout"
        class={`flex items-center gap-3 rounded-md px-3 py-2 text-sm text-text-secondary transition-colors hover:bg-error/10 hover:text-error focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus disabled:cursor-not-allowed disabled:opacity-60 ${collapsed ? "justify-center px-0" : ""}`}
      >
        {/* Inline SVG logout icon (door + arrow): evitamos dependencia de
            phosphor-icons porque el set cerrado (paths.ts) no incluye este
            nombre y solo se amplia por decisión de design. */}
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="20"
          height="20"
          viewBox="0 0 20 20"
          fill="none"
          stroke="currentColor"
          stroke-width="1.5"
          stroke-linecap="round"
          stroke-linejoin="round"
          aria-hidden="true"
        >
          <path d="M8 3H5a2 2 0 0 0-2 2v10a2 2 0 0 0 2 2h3" />
          <line x1="12" y1="10" x2="18" y2="10" />
          <polyline points="15 7 18 10 15 13" />
        </svg>
        {collapsed ? null : (
          <span>{loggingOut ? t("shell.loggingOut") : t("shell.logout")}</span>
        )}
      </button>
    </div>
  </nav>
}
