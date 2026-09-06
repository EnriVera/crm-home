import type { OctaneNode } from "octane";
import { systemThemeStore, useTheme } from "../lib/theme/use-theme";
import { I18nProvider, useT } from "../components/vendor/i18n";
import "../lib/i18n/config";

interface AuthLayoutProps {
  children: OctaneNode;
}

const FOOTER_LINK_CLASS =
  "rounded-md text-sm text-text-secondary underline-offset-4 transition-colors hover:text-text-primary hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus";

/**
 * Layout público de auth (D9): contenido centrado + footer legal con anchors
 * reales a /terms, /privacy, /cookies (los destinos llegan en otro change;
 * NO se crean placeholders legales). Tema según el SO (PRD §6.8): compone con
 * `SystemThemeSource` vía `systemThemeStore` — sin toggle de tema.
 */
export function AuthLayout(props: AuthLayoutProps) @{
  const t = useT();
  // Suscripción al tema del SO: re-aplica `.dark` si el SO cambia en vivo.
  useTheme(systemThemeStore);

  <I18nProvider>
    <div class="flex min-h-dvh flex-col bg-background">
      <main class="flex flex-1 items-center justify-center p-4">
        {props.children}
      </main>
      <footer class="flex items-center justify-center gap-6 p-6">
        <a href="/terms" class={FOOTER_LINK_CLASS}>
          {t("auth.footer.terms")}
        </a>
        <a href="/privacy" class={FOOTER_LINK_CLASS}>
          {t("auth.footer.privacy")}
        </a>
        <a href="/cookies" class={FOOTER_LINK_CLASS}>
          {t("auth.footer.cookies")}
        </a>
      </footer>
    </div>
  </I18nProvider>
}
