import { useTheme } from "../../lib/theme/use-theme";
import { Icon } from "../vendor/icons";

export interface ThemeToggleProps {
  /** Labels accesibles (i18n, provistos por el consumidor). */
  labelLight: string;
  labelDark: string;
  collapsed?: boolean;
}

/**
 * Molecule toggle de tema (D7/D8): alterna claro/oscuro vía `useTheme()`
 * (sun/moon). Solo vive en el shell; las páginas públicas siguen al SO.
 */
export function ThemeToggle(props: ThemeToggleProps) @{
  const { theme, setTheme } = useTheme();
  const next = theme === "dark" ? "light" : "dark";
  const label = theme === "dark" ? props.labelLight : props.labelDark;

  <button
    type="button"
    onClick={() => setTheme(next)}
    aria-label={label}
    title={label}
    data-theme-label={label}
    data-theme-mode={theme}
    suppressHydrationWarning
    class={`flex items-center gap-3 rounded-md px-3 py-2 text-sm text-text-secondary transition-colors hover:bg-surface hover:text-text-primary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus ${props.collapsed ? "justify-center px-0" : ""}`}
  >
    <Icon name={theme === "dark" ? "sun" : "moon"} size={20} />
    {props.collapsed ? null : <span data-theme-label-text>{label}</span>}
  </button>
}
