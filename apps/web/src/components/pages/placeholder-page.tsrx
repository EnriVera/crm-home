import { AppTitle } from "../atoms/app-title.tsrx";
import { useT } from "../vendor/i18n";

/**
 * Página placeholder de las rutas del shell (D8): sin lógica de módulos ni
 * guards; solo título + texto i18n. La funcionalidad real llega en los
 * changes de cada módulo.
 */
export function PlaceholderPage() @{
  const t = useT();

  <div class="flex min-h-[70dvh] flex-col items-center justify-center gap-3 text-center">
    <AppTitle />
    <p class="m-0 max-w-md leading-relaxed text-text-secondary">
      {t("shell.placeholder")}
    </p>
  </div>
}
