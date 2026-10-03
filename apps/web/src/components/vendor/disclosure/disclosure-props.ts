import type { Props as CollapsibleProps } from "@zag-js/collapsible";

import type { DisclosureProps } from "./disclosure.tsrx";

/**
 * Mapper puro: `DisclosureProps` (contrato público del wrapper) → props de la
 * máquina zag `collapsible` (D-SA1-style). Sigue el patrón canónico de
 * `vendor/otp-input/pin-input-props.ts`.
 *
 * Reglas:
 * - `id` estable (D-SA1): determinístico entre SSR e hidratación → `"disclosure"`.
 *   Si una página necesita varios disclosures en simultáneo, debe extender el
 *   wrapper (o pasar `id` como prop cuando agreguemos la necesidad).
 * - `defaultOpen` vs `open`: uncontrolled vs controlled. El wrapper expone
 *   ambos; el caller elige.
 * - `onOpenChange` se pasa dereferenciado para que la rama undefined
 *   no se rinda ante una firma opcional.
 */
export function toDisclosureProps(props: DisclosureProps): CollapsibleProps {
  return {
    id: "disclosure",
    defaultOpen: props.defaultOpen,
    open: props.open,
    onOpenChange: props.onOpenChange,
    disabled: props.disabled,
  };
}
