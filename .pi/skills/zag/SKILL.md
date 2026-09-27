---
name: zag
description: "Trigger: zag, zagjs, @zag-js, @octanejs/zag, pin-input, otp-input, OTP input, UI state machine, vendor wrapper. Zag.js UI primitives (Chakra) integrated into Octane fullstack via @octanejs/zag. Use when adding a Zag component, fixing a vendor wrapper under apps/web/src/components/vendor/, or wiring state-machine-driven UI in a .tsrx file."
license: Apache-2.0
metadata:
  author: "enri"
  version: "1.0"
---

# Zag

## Activation Contract

Activate when adding a new Zag UI component to the CRM, debugging a vendor
wrapper under `apps/web/src/components/vendor/`, or wiring a Zag state
machine into a `.tsrx` component. Zag is the chosen base for UI primitives
that need state-machine-driven accessibility (OTP, accordion, dialog,
combobox, etc.) — do not hand-roll the same behavior with raw `useState`.

## Hard Rules

- **Adapter is mandatory**: import `useMachine` and `normalizeProps` from
  `@octanejs/zag`, NOT from `@zag-js/react`. The React adapter ships a
  React scheduler that crashes Octane runtime (`startTime undefined`).
- **Version pin is exact**: `@zag-js/<pkg>` and `@zag-js/core` MUST share
  the same minor (e.g. `1.42.0`). The adapter bundles its own core; a
  mismatch produces two copies with incompatible types. Today: `1.42.0`.
- **Id is stable**: pass a deterministic `id` to `useMachine` (e.g.
  `"otp-input"`). Generated DOM ids and ARIA references depend on it.
  Different `id` per page is OK, but it must be deterministic across
  SSR + hydration.
- **Vendor wrapper rule §9**: only the wrapper under
  `apps/web/src/components/vendor/<name>/` imports the Zag package.
  Consumers import from the wrapper only. Wrapper re-exports a stable
  props contract — internal machine/wrapper can swap without breaking
  callers.
- **No `type="number"` for numeric inputs** — use `type="numeric"`
  (pin-input), `inputMode="numeric"`, `pattern="[0-9]*"`. Preserves
  leading zeros and lets the machine handle paste/backspace.
- **`onComplete` over `onChange`** for finished-input events: zag
  pin-input fires `onValueComplete({ valueAsString })` only when all
  cells are filled. Do not reimplement completion detection.

## Decision Gates

| Need | Action |
| ------ | -------- |
| Add a new UI primitive (combobox, dialog, accordion, etc.) | Check `https://zagjs.com/llms-<framework>.txt` for the machine API. Create wrapper under `apps/web/src/components/vendor/<name>/` with a stable props contract. |
| A vendor wrapper exists for the component | Import from the wrapper only — never from `@zag-js/<pkg>` directly in app code. |
| Component is simple, no state machine needed | Use a regular `.tsrx` molecule (button, input, label) — do not pull in Zag for trivial UI. |
| Pinning or version conflict | Run `bun pm ls @zag-js/core` from repo root. Mismatched duplicates = the version pin was violated; align to a single minor. |
| SSR hydration mismatch on a wrapper | Wrapper must render identical DOM in SSR + first client paint. Defer client-only state behind `useEffect` or guard with `typeof window !== "undefined"`. |

## Execution Steps

### Wrapper structure (canonical)

```text
apps/web/src/components/vendor/<name>/
├── SKILL target         # the wrapper component, e.g. otp-input.tsrx
├── <name>-props.ts      # pure map: public props → zag machine props
└── README.md            # provenance, version pin, contract stability note
```

The wrapper has TWO modules of code (component + props mapper) and a
README documenting the version pin and contract stability. Keep both
small. The mapper is plain `.ts` (testable headless); the component is
`.tsrx` (Octane runtime).

### Component shape

```tsrx
import { normalizeProps, useMachine } from "@octanejs/zag";
import * as machine from "@zag-js/<pkg>";
import { toMachineProps } from "./<name>-props";

export function MyComponent(props: MyComponentProps) @{
  const service = useMachine(machine.machine, toMachineProps(props));
  const api = machine.connect(service, normalizeProps);

  <div {...api.getRootProps()}>
    {/* spread api.getXProps() onto each part; data-* drives styling */}
  </div>
}
```

### Props mapper shape

```ts
import type { Props as MachineProps } from "@zag-js/<pkg>";
import type { MyComponentProps } from "./<name>.tsrx";

export function toMachineProps(props: MyComponentProps): MachineProps {
  return {
    id: "stable-id",
    // map only the fields the machine understands;
    // local-only props (class names, i18n labels) stay on the component
  };
}
```

### Styling

Zag emits `data-part`, `data-state`, `data-invalid`, `data-disabled`,
`data-complete`, `data-focus` on each element. Style via CSS selectors
(`[data-part="root"][data-state="open"]`) or Tailwind variants
(`data-[invalid]:border-error`). Do NOT add `useState` to mirror state
for styling — read it from the DOM via the data attributes.

### Testing

- Map pure props: `bun test <name>-props.test.ts` — no DOM, no Octane.
- Skip e2e tests of the machine itself (covered by Zag's upstream
  suite). Test the wrapper's contract: defaults, disabled, invalid,
  onComplete fires once with the full string.
- Verify SSR + hydration with playwright: navigate to the page, check
  console has zero hydration warnings, assert the `data-*` attributes
  are present on mount.

## Output Contract

When adding a Zag wrapper to CRM-Home:

- Two files in `apps/web/src/components/vendor/<name>/`: the `.tsrx`
  component and the pure `.ts` props mapper. README.md with version
  pin and contract.
- Wrapper contract (`MyComponentProps`) is the public API — internal
  Zag props are an implementation detail.
- Consumer code imports the wrapper, never `@zag-js/*` directly.
- Pin version documented in README. Mismatched `@zag-js/core` copies
  are a bug; flag and fix.

## References

- <https://zagjs.com/llms-react.txt> — authoritative API dump (per machine:
  install, anatomy, usage, methods, data attributes, keyboard a11y).
- `apps/web/src/components/vendor/otp-input/README.md` — canonical
  example of the wrapper structure, version-pin rationale, and the
  D1 → D-SA1 fallback history.
- `.pi/skills/octane/SKILL.md` — Octane runtime rules that constrain
  how Zag can be used (no React scheduler, `.tsrx` for components,
  `onInput` not `onChange`).
