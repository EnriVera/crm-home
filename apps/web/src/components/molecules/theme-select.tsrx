import { t } from "../vendor/i18n/core";
import { Icon } from "../vendor/icons";
import { useTheme } from "../../lib/theme/use-theme";

/**
 * Molecule: 3-way theme selector (PRD-v2.md §8.7 line 234-239).
 *
 * Renders three radio options (light / dark / system) in a horizontal
 * row, marks the active one, and emits `onChange` when the user picks.
 * The component is presentational: it reads from `useTheme()` for the
 * local store (localStorage + class on `<html>`) and calls
 * `setTheme(next)` on pick for instant local apply. The CALLER (the
 * config page) is responsible for the server-side persistence —
 * it passes the server's `userTheme` as `value` and handles the
 * `rpc.auth.updateTheme({ setting })` call inside `onChange`.
 *
 * Why presentational and not "smart" (own RPC + auth wiring):
 * - Reusable in any context that wants a 3-way picker (e.g. a future
 *   onboarding flow, a per-task theming flow).
 * - Keeps `lib/api/rpc.ts` out of the molecule, preserving the rule
 *   that molecules under `components/molecules/` are layer-agnostic
 *   UI building blocks.
 * - Easier to test (molecule can render with a static value; the
 *   page tests cover the persistence wiring separately).
 *
 * The "system" option has no icon because the icon set
 * (`apps/web/src/components/vendor/icons/paths.ts`) is a closed union
 * and the closest semantic match (`monitor` / `computer` /
 * `desktop`) is not yet imported. Adding icons to the set is an
 * explicit design decision; the text-only fallback keeps the scope
 * of this change tight.
 */

export interface ThemeSelectProps {
  /**
   * Currently active theme setting. Comes from the server's
   * `user.userTheme` for authenticated users, or the local theme
   * store for the unauthenticated / pre-hydration path.
   */
  value: "light" | "dark" | "system";
  /** Label for the light option (i18n, supplied by the caller). */
  labelLight: string;
  /** Label for the dark option (i18n, supplied by the caller). */
  labelDark: string;
  /** Label for the system option (i18n, supplied by the caller). */
  labelSystem: string;
  /**
   * Fired when the user picks a different option. The caller is
   * responsible for server persistence — typically:
   *   1. optimistic setTheme(next) (already done by this component)
   *   2. await rpc.auth.updateTheme({ setting: next })
   *   3. invalidate session() to refresh the local user.userTheme
   *   4. on error, optionally revert by calling setTheme(previous)
   */
  onChange: (next: "light" | "dark" | "system") => void;
  /**
   * Disables all three options (e.g. while the server call is in
   * flight). Per-option pending state is not exposed — the caller
   * already has the active value and disables the whole group.
   */
  disabled?: boolean;
}

type ThemeOption = "light" | "dark" | "system";

export function ThemeSelect(props: ThemeSelectProps) @{
  const { setTheme } = useTheme();

  // The "system" option has no icon (see file-level comment).
  const options: Array<{
    value: ThemeOption;
    label: string;
    icon: "sun" | "moon" | null;
  }> = [
    { value: "light", label: props.labelLight, icon: "sun" },
    { value: "dark", label: props.labelDark, icon: "moon" },
    { value: "system", label: props.labelSystem, icon: null },
  ];

  const handlePick = (next: ThemeOption): void => {
    if (next === props.value) return;
    setTheme(next);
    props.onChange(next);
  };

  <div
    role="radiogroup"
    aria-label={t("config.appearance.themeLabel")}
    data-component="theme-select"
    class="grid grid-cols-3 gap-2"
  >
    {options.map((opt) => {
      const isActive = opt.value === props.value;
      return (
        <button
          key={opt.value}
          type="button"
          role="radio"
          aria-checked={isActive}
          data-theme-option={opt.value}
          data-theme-active={isActive ? "true" : "false"}
          disabled={props.disabled}
          onClick={() => handlePick(opt.value)}
          class={`flex flex-col items-center gap-1.5 rounded-md border px-3 py-2.5 text-xs font-medium transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus disabled:cursor-not-allowed disabled:opacity-50 ${
            isActive
              ? "border-primary bg-primary/10 text-primary"
              : "border-border bg-surface text-text-secondary hover:bg-background hover:text-text-primary"
          }`}
        >
          {opt.icon ? <Icon name={opt.icon} size={20} /> : null}
          <span>{opt.label}</span>
        </button>
      );
    })}
  </div>
}
