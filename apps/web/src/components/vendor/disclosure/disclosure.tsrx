import type { OctaneNode } from "octane";
import { normalizeProps, useMachine } from "@octanejs/zag";
import * as collapsible from "@zag-js/collapsible";

import { toDisclosureProps } from "./disclosure-props";

/**
 * Contrato público del wrapper (D-SA1-style). ESTABLE: el cambio interno de
 * la máquina (hoy `@zag-js/collapsible` vía `@octanejs/zag`) no toca a los
 * consumidores.
 *
 * Patrón disclosure WAI-ARIA: un botón trigger que controla un panel de
 * contenido vía `aria-expanded` / `aria-controls`. zag ya emite los
 * `data-state="open|closed"` en root/trigger/content; estilizar desde CSS
 * por atributo, no duplicando estado en `useState`.
 */
export interface DisclosureProps {
  /** Estado inicial (uncontrolled). Default `false`. */
  defaultOpen?: boolean;
  /** Estado controlado (ignora `defaultOpen`). */
  open?: boolean;
  /** Cambio de estado controlado; recibe `{ open }`. */
  onOpenChange?: (details: { open: boolean }) => void;
  disabled?: boolean;
  /** Slot del trigger (botón o link que abre/cierra el panel). */
  trigger: OctaneNode;
  /** Slot del panel (contenido revelado). */
  children: OctaneNode;
  /** Clase opcional aplicada al root del disclosure. */
  class?: string;
}

/**
 * Disclosure envoltura fina sobre la máquina zag `collapsible` (vía el adapter
 * `@octanejs/zag`): root + trigger + content con `data-state` que el caller
 * estiliza. `aria-expanded` y `aria-controls` los emite la propia máquina.
 */
export function Disclosure(props: DisclosureProps) @{
  const service = useMachine(collapsible.machine, toDisclosureProps(props));
  const api = collapsible.connect(service, normalizeProps);

  <div {...api.getRootProps()} class={props.class}>
    <button
      type="button"
      {...api.getTriggerProps()}
    >
      {props.trigger}
    </button>
    <div {...api.getContentProps()}>
      {props.children}
    </div>
  </div>
}
