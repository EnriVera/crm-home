<script setup lang="ts">
/**
 * Popover — base popover wrapped around @zag-js/popover.
 *
 * Renders a trigger button (default slot) and a content panel (named
 * slot) that anchors to the trigger. The content is portalled to body
 * so it escapes clipping parents. Use for tooltips, context menus,
 * dropdowns, and any panel that hangs off a trigger.
 *
 * Usage:
 *   <Popover v-model:open="isOpen">
 *     <template #trigger>
 *       <span>Open menu</span>
 *     </template>
 *     <div class="p-4">Content here</div>
 *   </Popover>
 */
import { computed, useId, watch } from "vue";
import { useMachine, normalizeProps } from "@zag-js/vue";
import * as popover from "@zag-js/popover";
import { cn } from "@/shared/ui/cn";

type PopoverPlacement =
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
    /** Positioning side relative to the trigger. */
    side?: "top" | "right" | "bottom" | "left";
    /** Alignment on the cross-axis. */
    align?: "start" | "center" | "end";
  }>(),
  {
    side: "bottom",
    align: "center",
  },
);

const emit = defineEmits<{
  "update:open": [open: boolean];
}>();

const id = useId();

const placement = computed<PopoverPlacement>(() => {
  const align = props.align;
  if (align === "center") {
    return props.side as PopoverPlacement;
  }
  return `${props.side}-${align}` as PopoverPlacement;
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

const contentClass = cn(
  "z-50 min-w-[12rem] rounded-md border border-zinc-200 bg-surface p-1 text-text shadow-none",
  "dark:border-zinc-800",
  "outline-none",
);
</script>

<template>
  <button
    v-bind="api.getTriggerProps()"
    type="button"
    class="inline-flex items-center"
  >
    <slot name="trigger" />
  </button>
  <Teleport to="body">
    <div v-bind="api.getPositionerProps()">
      <div v-bind="api.getContentProps()" :class="contentClass">
        <slot />
      </div>
    </div>
  </Teleport>
</template>
