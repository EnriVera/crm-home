import { useState } from "octane";

import type { ViewKind } from "./base-view";

/**
 * Switcher de vistas extraído (REFACTOR WU9). Aislar el render del switch
 * permite reusarlo entre módulos sin duplicar markup.
 *
 * Recibe el estado actual y el setter como props controladas — el state
 * vive en BaseView; este componente sólo renderiza el `<nav>`.
 */

export interface ViewSwitcherProps {
  availableViews: ViewKind[];
  active: ViewKind;
  onChange: (next: ViewKind) => void;
}

export function ViewSwitcher(props: ViewSwitcherProps) @{
  <nav data-view-switcher>
    {props.availableViews.map((v) => (
      <button
        type="button"
        data-active={v === props.active}
        onClick={() => props.onChange(v)}
      >
        {v}
      </button>
    ))}
  </nav>
}
