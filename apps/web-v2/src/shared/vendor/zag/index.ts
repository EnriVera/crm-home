/**
 * Zag vendor wrapper — the only place in the app that imports
 * @zag-js/vue and the per-component @zag-js/* machines.
 *
 * Public surface:
 *   - Framework adapter: useMachine, normalizeProps, mergeProps
 *   - Vue helper: useId
 *   - Wrapped primitives (one SFC per component, slot-based API):
 *     - OtpInput       (pin-input, the auth OTP screen)
 *     - Dialog         (dialog, base modal with side prop)
 *     - Modal          (dialog side="center", confirmation)
 *     - Sheet          (dialog side="right", edit drawer)
 *     - Popover        (popover, base anchored panel)
 *     - Dropdown       (popover with a styled trigger + list of items)
 *
 * Lint-enforced by `eslint.config.ts`: the blocked-packages list
 * includes `@zag-js/vue` and the per-component machines; they are
 * allowed only in `src/shared/vendor/zag/`.
 */
export { useMachine, normalizeProps, mergeProps } from "@zag-js/vue";
export { useId, computed, watch } from "vue";

export { default as OtpInput } from "./pin-input/OtpInput.vue";
export { default as Dialog } from "./dialog/Dialog.vue";
export { default as Modal } from "./dialog/Modal.vue";
export { default as Sheet } from "./dialog/Sheet.vue";
export { default as Popover } from "./popover/Popover.vue";
export { default as Dropdown } from "./popover/Dropdown.vue";
