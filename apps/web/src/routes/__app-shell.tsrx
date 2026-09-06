import type { OctaneNode } from "octane";
import { SkipLink } from "../components/atoms/skip-link.tsrx";
import { SidebarNav } from "../components/organisms/sidebar-nav/sidebar-nav.tsrx";
import { I18nProvider, useT } from "../components/vendor/i18n";
import "../lib/i18n/config";

interface AppShellLayoutProps {
  children: OctaneNode;
  /** `RenderRouteProps.url` (pathname + search; idéntico en SSR e hidratación — D3). */
  url: string;
}

/**
 * Layout del shell autenticado (D8): SkipLink como primer elemento
 * focalizable → `<div flex>` con SidebarNav + `<main id="content">`.
 * El estado activo del nav deriva de `props.url`, sin `window.location`.
 * Importa `lib/i18n/config` para inicializar el catálogo antes de renderizar
 * (SSR e hidratación).
 */
export function AppShellLayout(props: AppShellLayoutProps) @{
  const t = useT();

  <I18nProvider>
    <SkipLink label={t("shell.skipToContent")} />
    <div class="flex min-h-dvh bg-background">
      <SidebarNav url={props.url} />
      <main id="content" class="min-w-0 flex-1 p-8">
        {props.children}
      </main>
    </div>
  </I18nProvider>
}
