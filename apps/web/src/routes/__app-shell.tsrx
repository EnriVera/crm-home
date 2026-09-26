import { useRef, useState, type OctaneNode } from "octane";
import { Router } from "@octanejs/wouter";
import { SkipLink } from "../components/atoms/skip-link.tsrx";
import { SidebarNav } from "../components/organisms/sidebar-nav/sidebar-nav.tsrx";
import { I18nProvider, useT } from "../components/vendor/i18n";
import {
  Group,
  Panel,
  Separator,
  useDefaultLayout,
  type PanelHandle,
} from "../components/vendor/resizable";
import "../lib/i18n/config";
import { RouteSync } from "../lib/nav/route-sync";
import {
  SidebarCollapseContext,
  type SidebarCollapseValue,
} from "../lib/nav/sidebar-collapse";
import {
  isCollapsedSize,
  SIDEBAR_LAYOUT,
  SIDEBAR_LAYOUT_ID,
} from "../lib/nav/sidebar-layout";

interface AppShellLayoutProps {
  children: OctaneNode;
  /** `RenderRouteProps.url` (pathname + search; idéntico en SSR e hidratación — D3). */
  url: string;
}

/**
 * Layout del shell autenticado (D8 → D-SA6): SkipLink como primer elemento
 * focalizable → `Group` horizontal de `@octanejs/resizable-panels` (vía el
 * wrapper vendor) con el sidebar como `Panel` collapsible + `Separator`
 * (drag-handle con rol `separator`, flechas de teclado y ARIA incluidos por el
 * binding — WCAG 2.1.1 sin handlers custom) + `Panel` para
 * `<main id="content">`.
 *
 * - Persistencia: `useDefaultLayout({ id: "crm-sidebar-layout" })` (auto-save
 *   del binding; reemplaza la clave booleana `"crm-sidebar"`, abandonada sin
 *   migración — preferencia cosmética).
 * - SSR sin mismatch: SSR e hidratación renderizan con `defaultSize`
 *   (snapshot estable, patrón D8); el layout persistido se aplica post-mount.
 * - Los tamaños se pasan como strings `"N%"` (el binding interpreta números
 *   como px; los % viven en `lib/nav/sidebar-layout.ts`).
 * - `collapsed` deriva de `onResize` del panel y se expone a `SidebarNav`
 *   vía `SidebarCollapseContext`; el toggle usa la API imperativa del panel.
 */
export function AppShellLayout(props: AppShellLayoutProps) @{
  const t = useT();

  const { defaultLayout, onLayoutChange, onLayoutChanged } = useDefaultLayout({
    id: SIDEBAR_LAYOUT_ID,
  });

  const sidebarPanelRef = useRef<PanelHandle | null>(null);
  const [collapsed, setCollapsed] = useState(false);

  const collapseValue: SidebarCollapseValue = {
    collapsed,
    toggle: () => {
      const panel = sidebarPanelRef.current;
      if (panel === null) return;
      if (panel.isCollapsed()) {
        panel.expand();
      } else {
        panel.collapse();
      }
    },
  };

  // wouter `Router` se inicializa con el `pathname` del SSR para que
  // `useLocation` no haga hydration-mismatch: server lee `props.url`
  // (estable en SSR + hidratación — D3), client toma `globalThis.location.pathname`
  // en el primer render post-hidratación (vía `useSyncExternalStore`).
  const pathname = pathnameOf(props.url);

  <I18nProvider>
    <Router ssrPath={pathname}>
      <RouteSync ssrPath={pathname} />
      <SkipLink label={t("shell.skipToContent")} />
      <Group
        orientation="horizontal"
        class="min-h-dvh bg-background"
        defaultLayout={defaultLayout}
        onLayoutChange={onLayoutChange}
        onLayoutChanged={onLayoutChanged}
      >
      <Panel
        id="sidebar"
        collapsible
        collapsedSize={`${SIDEBAR_LAYOUT.collapsedSize}%`}
        minSize={`${SIDEBAR_LAYOUT.minSize}%`}
        maxSize={`${SIDEBAR_LAYOUT.maxSize}%`}
        defaultSize={`${SIDEBAR_LAYOUT.defaultSize}%`}
        panelRef={sidebarPanelRef}
        onResize={(size) => setCollapsed(isCollapsedSize(size.asPercentage))}
      >
        <SidebarCollapseContext value={collapseValue}>
          <SidebarNav url={props.url} />
        </SidebarCollapseContext>
      </Panel>
      <Separator class="w-1 shrink-0 bg-border transition-colors hover:bg-text-secondary focus-visible:bg-text-secondary" />
      <Panel id="content">
        <main id="content" class="min-w-0 flex-1 p-8">
          {props.children}
        </main>
      </Panel>
    </Group>
    </Router>
  </I18nProvider>
}

/**
 * Saca el pathname de un string tipo `RenderRouteProps.url` (`pathname?search#hash`).
 * Si el string viene vacío (defensa contra SSR raro), devuelve `/`.
 */
function pathnameOf(url: string): string {
  const queryIndex = url.indexOf("?");
  const hashIndex = url.indexOf("#");
  let end = url.length;
  if (queryIndex !== -1) end = Math.min(end, queryIndex);
  if (hashIndex !== -1) end = Math.min(end, hashIndex);
  const path = url.slice(0, end);
  return path.length > 0 ? path : "/";
}
