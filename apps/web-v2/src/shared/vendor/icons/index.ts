/**
 * Phosphor icons vendor wrapper.
 *
 * The ONLY place that imports `@phosphor-icons/vue`. Components use
 * `<Icon name="PhCaretDown" :size="18" />` etc. The actual icon set
 * is the allowlist below — adding a new icon is a one-line change
 * (import + map entry) so tree-shaking drops everything else.
 *
 * Day-of-judgment fix: the previous version did
 * `import * as Phosphor from "@phosphor-icons/vue"`, which pulled in
 * every icon the package ships (~1,500 components → 5.6 MB chunk,
 * 1.18 MB gzipped, on the login critical path). With explicit
 * imports, the bundle now contains only the 11 icons the app
 * actually uses.
 */
import type { Component } from "vue";
import {
  PhCaretDown,
  PhCheckSquare,
  PhCircleNotch,
  PhGearSix,
  PhMoon,
  PhSignOut,
  PhSquaresFour,
  PhSun,
  PhTimer,
  PhUsersThree,
  PhX,
} from "@phosphor-icons/vue";

export type PhosphorWeight =
  | "thin"
  | "light"
  | "regular"
  | "bold"
  | "fill"
  | "duotone";

/**
 * Closed set of icon names the app may use. Adding a new icon here
 * is a one-line change (import + map entry) and TypeScript will
 * surface every `<Icon name="…" />` call site that needs updating.
 */
export const ICON_NAMES = [
  "PhCaretDown",
  "PhCheckSquare",
  "PhCircleNotch",
  "PhGearSix",
  "PhMoon",
  "PhSignOut",
  "PhSquaresFour",
  "PhSun",
  "PhTimer",
  "PhUsersThree",
  "PhX",
] as const;

export type PhosphorName = (typeof ICON_NAMES)[number];

const iconMap: Record<PhosphorName, Component> = {
  PhCaretDown,
  PhCheckSquare,
  PhCircleNotch,
  PhGearSix,
  PhMoon,
  PhSignOut,
  PhSquaresFour,
  PhSun,
  PhTimer,
  PhUsersThree,
  PhX,
};

export function getIcon(name: PhosphorName): Component | null {
  return iconMap[name] ?? null;
}

export { default as Icon } from "./Icon.vue";
