import { useT } from "../../vendor/i18n";
import { Icon } from "../../vendor/icons";

export interface TopbarProps {
  /** Search input placeholder text (i18n). */
  searchPlaceholder: string;
  /** Notification button aria-label (i18n). */
  notificationsLabel: string;
  /** Brand label visible next to the logo (i18n). */
  brandLabel: string;
  /** Brand menu aria-label (i18n). */
  brandMenuLabel: string;
  /** User initials shown in the avatar fallback. */
  userInitials: string;
  /** Online status dot aria-label (i18n). */
  onlineStatusLabel: string;
}

/**
 * Topbar del shell autenticado (PRD §9 — topbar nuevo, rediseño 2026-Q4):
 * brand switcher (placeholder, sin dropdown todavía) + búsqueda con
 * shortcut `⌘K` + notificaciones + avatar con dot online.
 *
 * - `h-14` (56px) — coincide con la primera fila del grid
 *   `grid-rows-[56px_1fr]` del shell.
 * - Sticky top, `border-b` 1px con `border-border/60` (60% del token
 *   borde — la jerarquía se construye con espacio y peso, no con
 *   elevación).
 * - Tokens semánticos exclusivamente (sin hex hardcodeado). El degradado
 *   del brand-mark usa `from-primary-500 to-primary-700` (escala
 *   estática del sistema, no usa el acento para decoración según
 *   DESIGN.md §1 — caso 1: acción primaria; aquí el verde del brand
 *   marca la "marca" del producto, equivalente al favicon del workspace).
 */
export function Topbar(props: TopbarProps) @{
  const t = useT();

  <header class="sticky top-0 z-10 flex h-14 items-center gap-4 border-b border-border bg-background px-4">
    <button
      type="button"
      aria-label={props.brandMenuLabel}
      title={props.brandMenuLabel}
      class="flex items-center gap-2 rounded-md border border-border bg-surface px-2 py-1.5 transition-colors hover:bg-text-primary/5 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus"
    >
      <span
        aria-hidden="true"
        class="size-6 rounded bg-gradient-to-br from-primary-500 to-primary-700"
      />
      <span class="font-medium text-sm text-text-primary">{props.brandLabel}</span>
      <Icon name="caret-down" size={14} class="opacity-60" />
    </button>

    <div class="mx-auto w-full max-w-md">
      <label class="relative block">
        <span class="sr-only">{props.searchPlaceholder}</span>
        <span
          aria-hidden="true"
          class="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-text-secondary"
        >
          <Icon name="magnifying-glass" size={16} />
        </span>
        <input
          type="search"
          placeholder={props.searchPlaceholder}
          aria-label={props.searchPlaceholder}
          class="block w-full rounded-md border border-border bg-surface py-1.5 pl-9 pr-12 text-sm text-text-primary placeholder:text-text-secondary focus:border-primary focus:outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus"
        />
        <span
          aria-hidden="true"
          class="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-3"
        >
          <kbd class="rounded border border-border bg-background px-1.5 py-0.5 font-mono text-[10px] text-text-secondary">
            ⌘K
          </kbd>
        </span>
      </label>
    </div>

    <div class="ml-auto flex items-center gap-2">
      <button
        type="button"
        aria-label={props.notificationsLabel}
        title={props.notificationsLabel}
        class="inline-flex size-9 items-center justify-center rounded-md text-text-secondary transition-colors hover:bg-surface hover:text-text-primary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus"
      >
        <Icon name="bell" size={18} />
      </button>
      <div class="relative">
        <span
          class="flex size-8 items-center justify-center rounded-full bg-surface font-medium text-text-primary text-xs"
          aria-label={t("topbar.userAvatar")}
        >
          {props.userInitials}
        </span>
        <span
          aria-label={props.onlineStatusLabel}
          title={props.onlineStatusLabel}
          class="absolute right-0 bottom-0 size-2 rounded-full bg-success ring-2 ring-background"
        />
      </div>
    </div>
  </header>
}
