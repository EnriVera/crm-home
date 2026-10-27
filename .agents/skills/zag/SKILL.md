---
name: zag
description: Builds headless UI primitives in Vue 3 using the Zag.js state machines. Zag replaces reka-ui, @floating-ui/vue, vaul-vue, @internationalized/date, and @vuepic/vue-datepicker in this app. Triggers on "zag", "useMachine", "normalizeProps", "@zag-js", "pin-input", "dialog", "popover", "date-picker", "select", "menu", "tabs", "checkbox", "switch", "tooltip", "accordion", "headless primitive", or any task that needs a behavior-rich UI primitive wired to a state machine. The Zag vendor wrapper in src/shared/vendor/zag/ is the only place that imports @zag-js/vue and @zag-js/*; components consume the wrapper, never the packages directly.
user-invocable: false
allowed-tools: Read(apps/web-v2/src/shared/vendor/zag/**), Bash(bun add @zag-js/*@1.44.0)
---

# Zag.js (Vue 3) — CRM-Home

Zag.js is the headless primitives layer for web-v2. Each component is a
**state machine** exported as `*.machine(input).connect().send(...)` style,
plus a `*.anatomy` of DOM parts, plus a `*.props` factory for partial
inputs. The Vue 3 integration is `@zag-js/vue` (a thin adapter) and the
`useMachine` hook runs the machine and returns a reactive API.

In CRM-Home, Zag replaces:

| Removed | Replaced by |
| --- | --- |
| `reka-ui` | `@zag-js/dialog`, `@zag-js/popover`, `@zag-js/tabs`, `@zag-js/select`, `@zag-js/menu`, `@zag-js/checkbox`, `@zag-js/switch`, `@zag-js/tooltip`, `@zag-js/accordion` |
| `@floating-ui/vue` | `@zag-js/popover` (Zag does its own positioning via `floating-ui` internally) |
| `vaul-vue` | `@zag-js/dialog` (with the `modal: false, role: "dialog"` for non-modal sheets) |
| `@internationalized/date` | `@zag-js/date-picker` (the machine bundles `@internationalized/date` transitively) |
| `@vuepic/vue-datepicker` | `@zag-js/date-picker` |

The shadcn-vue preset (luma / zinc / green / roboto / phosphor / large /
solid / bold) still applies at the styling layer; components.json
defines the shadcn CLI behavior, but the actual primitives that ship are
Zag machines wrapped in vendor components, not reka-ui primitives.

## The three layers

1. **Machine layer** — `@zag-js/<component>` exports `anatomy`, `machine`,
   `props`, `splitProps`, `connect`. One machine per primitive; no
   framework dependencies in this layer.
2. **Framework adapter** — `@zag-js/vue` exports `useMachine`,
   `normalizeProps`, `mergeProps`, `useSyncExternalStore`. The adapter
   turns the machine into reactive Vue 3 state.
3. **Vendor wrapper** — `src/shared/vendor/zag/` is the only file in the
   app that imports both layers. It exposes a small surface (a `useZag`
   composable per component, plus the helpers) that the rest of the app
   imports. Lint-enforced by `eslint.config.ts`.

## The Vue 3 use pattern (every component looks like this)

```ts
// inside src/shared/vendor/zag/<component>/<Component>.vue
import * as zag from "@zag-js/<component>";
import { useMachine, normalizeProps } from "@zag-js/vue";
import { computed } from "vue";

const props = defineProps<{ /* component-specific */ }>();

const [state, send] = useMachine(zag.machine({ id: useId(), /* props */ }));
const api = computed(() => zag.connect(state, send, normalizeProps));

// in template:
//   <div v-bind="api.getRootProps()">
//     <input v-bind="api.getInputProps({ index: 0 })" />
//   </div>
```

Three things to know:

1. **`useMachine(machine(input))`** — pass the result of the machine
   factory, not the factory itself. The machine has an `id` requirement
   for DOM scoping; pass `useId()` from Vue.
2. **`connect(state, send, normalizeProps)`** — returns the imperative
   API (root props, item props, callbacks). The `normalizeProps` helper
   is the third arg, not optional.
3. **`splitProps(api)`** — when the API has many parts and you only need
   some in a child component, `splitProps` returns each part as a
   separate object so Vue's reactivity tracks them individually.

## The installed components (PRD-v3 §3.1)

| Package | Version | Used for |
| --- | --- | --- |
| `@zag-js/vue` | 1.44.0 | Framework adapter |
| `@zag-js/pin-input` | 1.44.0 | OTP screen (login-verification) |
| `@zag-js/dialog` | 1.44.0 | Modals, sheets (was vaul-vue) |
| `@zag-js/popover` | 1.44.0 | Dropdowns, context menus (was @floating-ui/vue) |
| `@zag-js/date-picker` | 1.44.0 | Schedule date filters, task due dates (was @vuepic/vue-datepicker) |
| `@zag-js/tabs` | 1.44.0 | /config tabs, tasks-config |
| `@zag-js/select` | 1.44.0 | Form selects, type/category pickers |
| `@zag-js/menu` | 1.44.0 | Nav menu, kebab menu on rows |
| `@zag-js/checkbox` | 1.44.0 | Bulk select in tables, task done |
| `@zag-js/switch` | 1.44.0 | Settings toggles |
| `@zag-js/tooltip` | 1.44.0 | Hint text on dense UI |
| `@zag-js/accordion` | 1.44.0 | FAQ, collapsed side panels |

To add another `@zag-js/*` machine, install the same version (1.44.0),
add a vendor wrapper file under `src/shared/vendor/zag/<component>/`, and
extend the lint allowlist in `eslint.config.ts` if the new package is
not already there.

## Styling — keep the tokens rule

Zag does not ship styles. Every machine's `api.get*Props()` returns
**behavioral** props (id, role, aria-*, data-*, event handlers). The
class names and visual styling are applied separately, using the
existing `cn()` utility and the design tokens in
`src/shared/ui/tokens.css`. The pattern is:

```vue
<button
  v-bind="api.getTriggerProps()"
  :class="cn(
    'inline-flex h-10 items-center justify-center rounded-md px-3 text-sm font-medium',
    'bg-accent text-accent-fg hover:bg-primary-700',
    api.open && 'bg-primary-700',
  )"
>
  <slot />
</button>
```

Never use raw hex / zinc-* literals in a Zag wrapper. Always go through
the tokens. The lint rule that bans zinc-200 in components (PRD-v3 §4
item 4) is checked at PR review, not yet by ESLint.

## The OtpInput reference implementation

`src/shared/vendor/zag/pin-input/OtpInput.vue` is the only Zag-wired
component in the app today. Read it as the canonical example. The
pattern there is:

- `useId()` for the machine's DOM scoping.
- `useMachine(pinInput.machine({ id, value, ... }))`.
- A computed `api` that wraps `pinInput.connect(state, send, normalizeProps)`.
- The six `<input>` cells render via `api.getInputProps({ index })`.
- `api.value` is the array of digits; the parent uses
  `watch(api.value, ...)` or `@complete` to react.
- The auto-submit pattern: emit `complete` only when
  `api.valueAsString.length === props.length` AND every character is a
  digit; the parent verifies with `@crm/contract/auth/OtpDigits` before
  treating it as a real code.

## The wrong / right way

Wrong:

```ts
// inside an organism in src/ui/
import { useMachine, normalizeProps } from "@zag-js/vue"; // ❌ blocked by lint
import * as pinInput from "@zag-js/pin-input";              // ❌ blocked by lint
```

Right:

```ts
// inside an organism in src/ui/
import { OtpInput } from "@/shared/vendor/zag";             // ✅
```

## Reference

- `llms-vue.txt` in this directory is the full Zag.js Vue 3
  documentation (29 kB, one section per primitive, each with the
  machine, the props, the anatomy, the connect API, and the
  framework-agnostic and Vue-specific usage examples). Read it with
  `read` when wiring a new primitive; the SKILL has the conventions
  for CRM-Home, the file has the API.
- The machines are statecharts; their connect API mirrors the
  anatomy 1:1 (e.g. `pin-input` has `getRootProps`, `getInputProps`,
  `getLabelProps`, `getHiddenInputProps`). The `splitProps` helper
  divides the API into per-part objects for clean composition.
