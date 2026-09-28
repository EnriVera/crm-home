import type { OctaneNode } from "octane";

/**
 * Molecule: navegación por tabs (PRD-v2.md §8.7 Config tiene 8 tabs).
 *
 * Simple controlled component. La page es dueña del `activeId` y del
 * contenido de cada tab; este molecule solo renderiza:
 *   - la fila de tabs con keyboard navigation
 *   - el panel del tab activo (children)
 *
 * Keyboard support (WAI-ARIA tablist):
 *   - Enter / Space → activar el tab con foco (provisto por el button
 *     nativo — no necesitamos handler propio).
 *   - ArrowLeft / ArrowRight / Home / End → DESHABILITADOS en este
 *     cambio por incompatibilidad de tipos con el `onKeydown` del button
 *     prop de octane (el contextual type no propaga al inline arrow).
 *     Pendiente para una iteración futura que evite el name collision
 *     con el `KeyboardEvent` global.
 *
 * Por qué custom (no Zag):
 * Per `.pi/skills/zag/SKILL.md` Decision Gates ("Component is simple,
 * no state machine needed → use a regular `.tsrx` molecule"). Tabs
 * es state puro local sin máquinas; no necesita el adapter de Zag.
 */

export interface TabItem {
  id: string;
  label: string;
}

export interface TabsProps {
  items: TabItem[];
  activeId: string;
  onChange: (id: string) => void;
  /** Contenido del tab activo. La page lo renderiza según activeId. */
  children: OctaneNode;
}

export function Tabs(props: TabsProps) @{
  const tablistId = "tabs-tablist";
  const activeIndex = Math.max(
    0,
    props.items.findIndex((t) => t.id === props.activeId),
  );
  const activeTab = props.items[activeIndex] ?? props.items[0];
  const panelId = `${tablistId}-panel-${activeTab?.id ?? ""}`;
  const itemCount = props.items.length;

  <div data-component="tabs">
    <div
      role="tablist"
      aria-label="tabs"
      id={tablistId}
      class="flex flex-wrap gap-1 border-b border-border"
    >
      {props.items.map((item, currentIndex) => {
        const isActive = item.id === props.activeId;
        return (
          <button
            key={item.id}
            type="button"
            role="tab"
            id={`${tablistId}-tab-${item.id}`}
            data-tab-id={item.id}
            aria-selected={isActive}
            aria-controls={panelId}
            tabindex={isActive ? 0 : -1}
            onClick={() => props.onChange(item.id)}
            class={`px-4 py-2 text-sm font-medium transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus ${
              isActive
                ? "border-b-2 border-primary text-primary"
                : "text-text-secondary hover:text-text-primary"
            }`}
          >
            {item.label}
          </button>
        );
      })}
    </div>
    <div
      role="tabpanel"
      id={panelId}
      aria-labelledby={`${tablistId}-tab-${activeTab?.id ?? ""}`}
      class="mt-6"
    >
      {props.children}
    </div>
  </div>
}
