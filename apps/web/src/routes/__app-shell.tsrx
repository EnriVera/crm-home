import { useEffect, useRef, useState, type OctaneNode } from "octane";
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
import { ClientRouter } from "../lib/nav/client-router.tsrx";
import {
  SidebarCollapseContext,
  type SidebarCollapseValue,
} from "../lib/nav/sidebar-collapse";
import {
  isCollapsedSize,
  SIDEBAR_LAYOUT,
  SIDEBAR_LAYOUT_ID,
} from "../lib/nav/sidebar-layout";
import { createRpcClient } from "../lib/api/rpc";
import { NuqsAdapter } from "@octanejs/nuqs/adapters/react";

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
 * - SPA navigation: `<ClientRouter>` monta el click interceptor global y
 *   sincroniza `<main id="content">` cuando la URL cambia vía History API.
 *   Los `<NavItem>` del sidebar son `<a>` nativos — el interceptor los
 *   captura antes de que el browser haga el full reload.
 */
export function AppShellLayout(props: AppShellLayoutProps) @{
  const t = useT();

  const { defaultLayout, onLayoutChange, onLayoutChanged } = useDefaultLayout({
    id: SIDEBAR_LAYOUT_ID,
  });

  const sidebarPanelRef = useRef<PanelHandle | null>(null);
  const [collapsed, setCollapsed] = useState(false);

  // Session probe (validación temprana de cookie stale).
  // El `session-guard` del router SSR verifica PRESENCIA de cookie (no
  // validez — Node fetch no propaga cookies del browser), entonces un user
  // con cookie expirada/revocada pasa al shell y aterriza en /dashboard.
  // Sin este probe, las páginas que NO disparan RPC al mount (ej.
  // placeholder /dashboard) dejan al user atascado: la UI renderiza
  // vacía y nunca se entera de que la sesión murió. Disparamos
  // `rpc.auth.session()` al mount del shell; si devuelve 401, el
  // interceptor del RPCLink redirige a `/login?reauth=1` (que ya muestra
  // el banner "Tu sesión expiró").
  useEffect(() => {
    const rpc = createRpcClient(import.meta.env.VITE_API_URL ?? "/rpc");
    void rpc.auth.session().catch(() => {
      // El 401 ya redirige vía el interceptor del link. Cualquier otro error
      // (network, 500) lo tragamos: la UI sigue funcional y el próximo
      // click que dispare un RPC va a revelar el problema.
    });
  }, []);

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

  <NuqsAdapter>
    <I18nProvider>
      <ClientRouter />
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
    </I18nProvider>
  </NuqsAdapter>
}
