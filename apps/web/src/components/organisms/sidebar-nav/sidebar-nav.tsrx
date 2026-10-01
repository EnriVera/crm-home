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
import { NAV_TREE, type NavSection } from "../../../lib/nav/tree";
import { FinanceNavGroup } from "../../molecules/finance-nav-group/finance-nav-group.tsrx";
import { NavItem } from "../../molecules/nav-item.tsrx";
import { SidebarSection } from "../../molecules/sidebar-section.tsrx";
import { SidebarUserCard } from "../../molecules/sidebar-user-card/sidebar-user-card.tsrx";
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
  /** Datos del usuario para el footer card (placeholder mientras llega auth). */
  user?: {
    initials: string;
    name: string;
    email: string;
  };
}

const DEFAULT_USER = {
  initials: "SB",
  name: "Sean Brydon",
  email: "sean@cal.com",
};

const SECTION_LABEL_KEYS: Record<NavSection, string> = {
  main: "nav.section.main",
  finance: "nav.section.finance",
  settings: "nav.section.settings",
};

/**
 * Organismo de navegación lateral (D8 → D-SA6 → rediseño 2026-Q4): `<nav>`
 * con secciones etiquetadas (`SidebarSection`), `NavItem` para items
 * planos, `FinanceNavGroup` para el grupo colapsable Finance (zag
 * disclosure), `ThemeToggle`, `SidebarUserCard` en el footer, y los
 * botones de colapso + logout. El estado `collapsed` deriva del panel del
 * shell vía `SidebarCollapseContext`. Todo es `<a>`/`<button>` nativo: cero
 * handlers de teclado custom (WCAG 2.1.1).
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

  const collapseLabel = collapsed === true ? t("shell.expand") : t("shell.collapse");

  const user = props.user ?? DEFAULT_USER;

  // Optimistic logout: navegamos a /login YA para que la UI responda
  // instantáneamente, y disparamos el POST /auth/logout en background.
  // Si el server falla (red caída, 500), el cookie igual queda válido pero
  // la UI ya está en /login — el user verá el form de auth y cualquier RPC
  // siguiente con `credentials: 'include'` será rechazado por el backend
  // porque la sesión sigue viva del lado server. Aceptamos esa
  // inconsistencia porque el patrón canónico es "logout local first,
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
      // presence check del session-guard.
    }
  };

  // Renderizamos el `SidebarSection` solo cuando la sección cambia entre
  // nodos consecutivos (estado "section tracker").
  let currentSection: NavSection | null = null;
  const renderItem = (item: {
    href: string;
    labelKey: string;
    icon: import("../../../components/vendor/icons").IconName;
  }) => {
    return (
      <li key={item.href}>
        <NavItem
          href={item.href}
          icon={item.icon}
          label={t(item.labelKey)}
          active={isItemActive(pathname, item.href)}
          collapsed={collapsed}
        />
      </li>
    );
  };

  // El `.map()` retorna `renderItem(node)` directamente (sin envolver en
  // otro `<li>`) — `renderItem` ya emite su propio `<li>`. El patrón previo
  // `<li key={node.href}>{renderItem(node)}</li>` causaba doble `<li>`
  // (`<li><li>...</li></li>`) y rompía la hidratación: el walker de octane
  // (`findMatchingClose`) contaba markers open/close imbalanceados y
  // tiraba `Cannot read properties of null (reading 'nodeType')`.

  <nav
    aria-label={t("nav.ariaLabel")}
    class="sticky top-0 flex h-dvh flex-col overflow-x-hidden border-r border-border bg-surface/40"
  >
    <ul class="m-0 flex list-none flex-col gap-0.5 overflow-y-auto p-2">
      {NAV_TREE.map((node) => {
        const section = node.section ?? "main";
        const renderSectionHeader = section !== currentSection;
        currentSection = section;

        if (node.type === "group") {
          // Finance (único group por ahora) usa FinanceNavGroup: zag
          // disclosure + persistencia localStorage. El header del grupo
          // se oculta cuando el sidebar está colapsado (queda solo el
          // ícono wallet en el botón del disclosure).
          if (node.labelKey === "nav.finance") {
            const children = node.children.map((c) => ({
              href: c.href,
              label: t(c.labelKey),
              icon: c.icon,
            }));
            return (
              <FinanceNavGroup
                key={node.labelKey}
                label={t(node.labelKey)}
                children={children}
                pathname={pathname}
                collapsed={collapsed}
              />
            );
          }
          return (
            <li key={node.labelKey}>
              {renderSectionHeader && collapsed !== true ? (
                <SidebarSection label={t(SECTION_LABEL_KEYS[section])} />
              ) : null}
              <NavGroup
                label={t(node.labelKey)}
                icon={node.icon}
                active={isGroupActive(pathname, node.children)}
                collapsed={collapsed}
              >
                {node.children.map((child) => renderItem(child))}
              </NavGroup>
            </li>
          );
        }

        // Caso non-group: `renderItem(node)` ya emite su propio `<li>`
        // (lo usa también como hijo de `<NavGroup>`). Envolverlo en otro
        // `<li>` producía doble `<li>` y rompía la hidratación. El
        // SidebarSection se omite en este caso porque rompería la
        // estructura `<ul>/<li>`; los headers de sección los emite el
        // NavGroup de los grupos (caso `node.type === "group"`).
        return renderItem(node);
      })}
    </ul>

    <div class="mt-auto flex flex-col gap-0.5 border-t border-border bg-background">
      <SidebarUserCard
        initials={user.initials}
        name={user.name}
        email={user.email}
        menuLabel={t("sidebarUserCard.menuLabel")}
      />
      <div class="flex flex-col gap-0.5 px-2 py-2">
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
          class={`flex items-center gap-3 rounded-md px-2.5 py-1.5 text-sm text-text-secondary transition-colors hover:bg-text-primary/5 hover:text-text-primary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus ${collapsed === true ? "justify-center px-0" : ""}`}
        >
          <Icon name="sidebar" size={18} class="opacity-70" />
          {collapsed === true ? null : <span>{t("shell.collapse")}</span>}
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
          class={`flex items-center gap-3 rounded-md px-2.5 py-1.5 text-sm text-text-secondary transition-colors hover:bg-error/10 hover:text-error focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus disabled:cursor-not-allowed disabled:opacity-60 ${collapsed === true ? "justify-center px-0" : ""}`}
        >
          {/* Inline SVG logout icon (door + arrow): evitamos dependencia de
              phosphor-icons porque el set cerrado (paths.ts) no incluye este
              nombre y solo se amplía por decisión de design. */}
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="18"
            height="18"
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
          {collapsed === true ? null : (
            <span>{loggingOut ? t("shell.loggingOut") : t("shell.logout")}</span>
          )}
        </button>
      </div>
    </div>
  </nav>
}

// Local NavGroup import (preserva la NavGroup molecule existente para
// grupos no-Finance; hoy el árbol solo tiene Finance, pero el path queda
// disponible por si aparece un segundo grupo colapsable).
import { NavGroup } from "../../molecules/nav-group.tsrx";
