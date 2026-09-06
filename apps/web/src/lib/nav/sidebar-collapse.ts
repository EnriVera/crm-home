import { createContext } from "octane";

/**
 * Contexto de colapso del sidebar (D-SA6): el estado `collapsed` que antes
 * vivía dentro de `SidebarNav` pasa a derivarse del panel del shell; el toggle
 * llama a la API imperativa del binding (`panelRef.collapse()/expand()`).
 * Lo crea el shell (`__app-shell.tsrx`); lo consume el organismo `SidebarNav`.
 * `SidebarNavProps { url }` queda intacto (cambio interno del organismo).
 */
export interface SidebarCollapseValue {
 /** ¿El panel del sidebar está colapsado? (deriva de `onResize` del panel). */
 readonly collapsed: boolean;
 /** Colapsa/expande el panel vía `PanelHandle` del binding. */
 toggle(): void;
}

/** Default inerte (expandido, sin-op): solo se usa fuera del shell. */
export const SidebarCollapseContext = createContext<SidebarCollapseValue>({
 collapsed: false,
 toggle: () => {},
});
