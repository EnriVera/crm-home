/**
 * Árbol de navegación canónico del sidebar (PRD §7, D8). Los labels son
 * claves i18n `nav.*`; los íconos vienen del wrapper `vendor/icons` (D4).
 */
import type { IconName } from "../../components/vendor/icons";

export interface NavLeaf {
  type: "item";
  href: string;
  labelKey: string;
  icon: IconName;
}

export interface NavGroupNode {
  type: "group";
  labelKey: string;
  icon: IconName;
  children: NavLeaf[];
}

export type NavNode = NavLeaf | NavGroupNode;

/** Orden exacto del árbol §7; Finance es un grupo NO clicable. */
export const NAV_TREE: NavNode[] = [
  { type: "item", href: "/dashboard", labelKey: "nav.dashboard", icon: "house" },
  { type: "item", href: "/tasks", labelKey: "nav.tasks", icon: "check-square" },
  { type: "item", href: "/schedules", labelKey: "nav.schedule", icon: "calendar" },
  { type: "item", href: "/clients", labelKey: "nav.clients", icon: "users" },
  {
    type: "group",
    labelKey: "nav.finance",
    icon: "wallet",
    children: [
      { type: "item", href: "/incomes", labelKey: "nav.income", icon: "arrow-down-circle" },
      { type: "item", href: "/expenses", labelKey: "nav.expenses", icon: "arrow-up-circle" },
      { type: "item", href: "/transfers", labelKey: "nav.transfers", icon: "arrows-left-right" },
    ],
  },
  { type: "item", href: "/config", labelKey: "nav.config", icon: "gear" },
];
