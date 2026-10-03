<script setup lang="ts">
/**
 * Dropdown — convenience wrapper around Popover with a styled trigger
 * button (label + chevron) and a list of menu items rendered via the
 * default slot. The trigger is a `<button>` element so it can be
 * focused by tab and announced by screen readers via the popover
 * machine's aria-* attributes.
 *
 * Usage:
 *   <Dropdown v-model:open="isOpen" label="Actions">
 *     <button class="w-full text-left px-3 py-2 text-sm hover:bg-zinc-100 dark:hover:bg-zinc-800">
 *       Edit
 *     </button>
 *   </Dropdown>
 */
import { computed, useId, watch } from "vue";
import { useMachine, normalizeProps } from "@zag-js/vue";
import * as popover from "@zag-js/popover";
import { Icon } from "@/shared/vendor/icons";
import { cn } from "@/shared/ui/cn";

type DropdownPlacement =
  | "top-start"
  | "top"
  | "top-end"
  | "right-start"
  | "right"
  | "right-end"
  | "bottom-start"
  | "bottom"
  | "bottom-end"
  | "left-start"
  | "left"
  | "left-end";

const props = withDefaults(
  defineProps<{
    open: boolean;
    label: string;
    side?: "top" | "right" | "bottom" | "left";
    align?: "start" | "center" | "end";
  }>(),
  {
    side: "bottom",
    align: "end",
  },
);

const emit = defineEmits<{
  "update:open": [open: boolean];
}>();

const id = useId();

const placement = computed<DropdownPlacement>(() => {
  const align = props.align;
  if (align === "center") {
    return props.side as DropdownPlacement;
  }
  return `${props.side}-${align}` as DropdownPlacement;
});

const service = useMachine(
  popover.machine,
  computed(() => ({
    id,
    open: props.open,
    positioning: { placement: placement.value },
  })),
);

const api = computed(() => popover.connect(service, normalizeProps));

watch(
  () => props.open,
  (next) => {
    if (next === api.value.open) return;
    api.value.setOpen(next);
  },
);
watch(api.value, (next) => {
  if (next.open !== props.open) emit("update:open", next.open);
});

const triggerClass = cn(
  "inline-flex h-8 items-center gap-1.5 rounded-md border border-zinc-200 bg-surface px-3 text-sm",
  "text-text hover:bg-zinc-100 dark:border-zinc-800 dark:hover:bg-zinc-800",
  "focus:outline-none focus:ring-2 focus:ring-accent/30",
);
const contentClass = cn(
  "z-50 min-w-[10rem] rounded-md border border-zinc-200 bg-surface p-1 text-text shadow-none",
  "dark:border-zinc-800",
  "outline-none",
);
</script>

<template>
  <button
    v-bind="api.getTriggerProps()"
    type="button"
    :class="triggerClass"
  >
    <span>{{ label }}</span>
    <Icon name="PhCaretDown" :size="14" />
  </button>
  <Teleport to="body">
    <div v-bind="api.getPositionerProps()">
      <div v-bind="api.getContentProps()" :class="contentClass">
        <slot />
      </div>
    </div>
  </Teleport>
</template>
