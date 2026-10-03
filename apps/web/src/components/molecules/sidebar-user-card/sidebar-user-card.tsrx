import { useT } from "../../vendor/i18n";
import { Icon } from "../../vendor/icons";

export interface SidebarUserCardProps {
  /** Iniciales del usuario (avatar fallback). */
  initials: string;
  /** Nombre visible del usuario. */
  name: string;
  /** Email (o subtítulo) del usuario. */
  email: string;
  /** aria-label del botón de abrir el menú del usuario (i18n). */
  menuLabel: string;
}

/**
 * Card de usuario en el footer del sidebar: avatar (iniciales) + nombre +
 * email + botón de menú. Visualmente separada del resto de la nav por un
 * `border-t` sutil; el área completa es un `<button>` para abrir el menú
 * (placeholder, sin dropdown todavía).
 *
 * Tokens: `border-border` (1px), `bg-background` para alinear con la línea
 * del shell, `text-text-primary`/`text-text-secondary` para el texto.
 */
export function SidebarUserCard(props: SidebarUserCardProps) @{
  const t = useT();

  <button
    type="button"
    aria-label={props.menuLabel}
    title={props.menuLabel}
    data-component="sidebar-user-card"
    class="mt-auto flex w-full items-center gap-2 border-t border-border bg-background px-3 py-2.5 text-left transition-colors hover:bg-surface focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus"
  >
    <span
      aria-hidden="true"
      class="flex size-7 shrink-0 items-center justify-center rounded-full bg-surface font-medium text-text-primary text-xs"
    >
      {props.initials}
    </span>
    <span class="min-w-0 flex-1">
      <span class="block truncate font-medium text-sm text-text-primary">
        {props.name}
      </span>
      <span class="block truncate text-text-secondary text-xs">
        {props.email}
      </span>
    </span>
    <Icon name="caret-up" size={14} class="opacity-60 text-text-secondary" />
    <span class="sr-only">{t("sidebarUserCard.openMenuHint")}</span>
  </button>
}
