import { useT } from "../vendor/i18n";

/** Atom de ejemplo (D7): título de aplicación. Consume solo `../vendor`. */
export function AppTitle() @{
  const t = useT();

  <h1 class="m-0 text-4xl font-semibold tracking-tight text-(--color-text-primary)">
    {t("app.title")}
  </h1>
}
