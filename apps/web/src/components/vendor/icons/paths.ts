/**
 * Mapa `IconName` → componente del binding `@octanejs/phosphor-icons`
 * (D-SA8, supersede D4): los path data ya NO se vendoran inline; cada nombre
 * de la union cerrada apunta al export tree-shakeable del binding (peso
 * `regular` en uso; el binding genera todos los pesos por ícono).
 *
 * Set cerrado: ampliar el set es una decisión de design que se materializa
 * editando ESTE archivo.
 */

import {
  ArrowCircleDown,
  ArrowCircleUp,
  ArrowsLeftRight,
  Calendar,
  CheckSquare,
  Gear,
  House,
  Moon,
  Sidebar,
  Sun,
  Users,
  Wallet,
  type Icon as PhosphorIcon,
} from "@octanejs/phosphor-icons";

export type IconName =
  | "house"
  | "check-square"
  | "calendar"
  | "users"
  | "wallet"
  | "arrow-down-circle"
  | "arrow-up-circle"
  | "arrows-left-right"
  | "gear"
  | "sun"
  | "moon"
  | "sidebar";

/** Componente phosphor por ícono del set cerrado. */
export const ICON_COMPONENTS: Record<IconName, PhosphorIcon> = {
  house: House,
  "check-square": CheckSquare,
  calendar: Calendar,
  users: Users,
  wallet: Wallet,
  "arrow-down-circle": ArrowCircleDown,
  "arrow-up-circle": ArrowCircleUp,
  "arrows-left-right": ArrowsLeftRight,
  gear: Gear,
  sun: Sun,
  moon: Moon,
  sidebar: Sidebar,
};
