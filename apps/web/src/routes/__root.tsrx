import type { OctaneNode } from "octane";
import { I18nProvider } from "../components/vendor/i18n";
import "../lib/i18n/config";

interface RootLayoutProps {
  children: OctaneNode;
}

/**
 * Layout raíz de las rutas (equivalente a `__root` de la tabla canónica,
 * adaptado a la convención `layout` del meta-framework Octane — ver D6).
 * Importa `lib/i18n/config` para inicializar el catálogo `es` antes de
 * renderizar, tanto en SSR como en hidratación.
 */
export function RootLayout(props: RootLayoutProps) @{
  <I18nProvider>
    <main class="flex min-h-dvh items-center justify-center bg-(--color-background)">
      {props.children}
    </main>
  </I18nProvider>
}
