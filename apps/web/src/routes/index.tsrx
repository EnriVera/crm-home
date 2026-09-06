import { useT } from "../components/vendor/i18n";
import "../lib/i18n/config";

/**
 * Fallback de `/` (D2): en la práctica NO renderiza — el middleware `before`
 * (`lib/nav/redirect`) responde 302 a `/login` antes de renderizar. Es
 * defensa ante un entorno que no ejecute middleware: un anchor manual a
 * `/login`. La SmokePage del scaffold quedó retirada.
 */
export function IndexRoute() @{
  const t = useT();

  <main class="flex min-h-dvh items-center justify-center bg-background">
    <a
      href="/login"
      class="rounded-md px-4 py-2 text-sm font-medium text-primary-700 underline underline-offset-4 transition-colors hover:bg-surface focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus dark:text-primary-400"
    >
      {t("shell.redirectFallback")}
    </a>
  </main>
}
