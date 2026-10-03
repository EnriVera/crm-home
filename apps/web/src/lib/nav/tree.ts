/**
 * Árbol de navegación canónico del sidebar (PRD §7, D8). Los labels son
 * claves i18n `nav.*`; los íconos vienen del wrapper `vendor/icons` (D4).
 *
 * El campo opcional `section` agrupa nodos bajo un encabezado visual
 * (`SidebarSection`) en el sidebar. Sin sección → el nodo aparece bajo el
 * último encabezado renderizado (default: "main").
 */
import type { IconName } from "../../components/vendor/icons";

export interface NavLeaf {
  type: "item";
  href: string;
  labelKey: string;
  icon: IconName;
  /** Sección visual opcional. Default `"main"`. */
  section?: NavSection;
}

export interface NavGroupNode {
  type: "group";
  labelKey: string;
  icon: IconName;
  /** Sección visual opcional. Default `"main"`. */
  section?: NavSection;
  children: NavLeaf[];
}

export type NavNode = NavLeaf | NavGroupNode;

/**
 * Secciones canónicas del sidebar. Las claves son también claves i18n
 * `nav.section.*` para los labels visibles (e.g. `nav.section.main`).
 * Mantener unión cerrada — agregar sección es una decisión de design.
 */
export type NavSection = "main" | "finance" | "settings";

/** Orden exacto del árbol §7; Finance es un grupo colapsable (zag). */
export const NAV_TREE: NavNode[] = [
  {
    type: "item",
    href: "/dashboard",
    labelKey: "nav.dashboard",
    icon: "house",
    section: "main",
  },
  {
    type: "item",
    href: "/tasks",
    labelKey: "nav.tasks",
    icon: "check-square",
    section: "main",
  },
  {
    type: "item",
    href: "/schedules",
    labelKey: "nav.schedule",
    icon: "calendar",
    section: "main",
  },
  {
    type: "item",
    href: "/clients",
    labelKey: "nav.clients",
    icon: "users",
    section: "main",
  },
  {
    type: "group",
    labelKey: "nav.finance",
    icon: "wallet",
    section: "finance",
    children: [
      {
        type: "item",
        href: "/incomes",
        labelKey: "nav.income",
        icon: "arrow-down-circle",
      },
      {
        type: "item",
        href: "/expenses",
        labelKey: "nav.expenses",
        icon: "arrow-up-circle",
      },
      {
        type: "item",
        href: "/transfers",
        labelKey: "nav.transfers",
        icon: "arrows-left-right",
      },
    ],
  },
  {
    type: "item",
    href: "/config",
    labelKey: "nav.config",
    icon: "gear",
    section: "settings",
  },
];
