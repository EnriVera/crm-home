<script setup lang="ts">
/**
 * Dialog — base modal wrapped around @zag-js/dialog.
 *
 * Renders the backdrop and the content into a Teleport so the modal
 * escapes any clipping parent. Position is controlled by the `side`
 * prop: `center` (default, for confirmation modals) or `right` (a
 * Sheet for the right-side edit drawer). All styling comes from the
 * design tokens; no raw hex.
 *
 * Usage:
 *   <Dialog v-model:open="isOpen" title="Delete?" description="This cannot be undone.">
 *     <p>Body content goes in the default slot.</p>
 *   </Dialog>
 */
import { computed, useId, watch } from "vue";
import { useMachine, normalizeProps } from "@zag-js/vue";
import * as dialog from "@zag-js/dialog";
import { Icon } from "@/shared/vendor/icons";
import { cn } from "@/shared/ui/cn";

type DialogSide = "center" | "right";

const props = withDefaults(
  defineProps<{
    open: boolean;
    title?: string;
    description?: string;
    side?: DialogSide;
    closeOnInteractOutside?: boolean;
  }>(),
  {
    title: "",
    description: "",
    side: "center",
    closeOnInteractOutside: true,
  },
);

const emit = defineEmits<{
  "update:open": [open: boolean];
}>();

const id = useId();

const service = useMachine(
  dialog.machine,
  computed(() => ({
    id,
    open: props.open,
    closeOnInteractOutside: props.closeOnInteractOutside,
    preventScroll: true,
    modal: true,
    trapFocus: true,
  })),
);

const api = computed(() => dialog.connect(service, normalizeProps));

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

const positionerClass = computed(() =>
  cn(
    "fixed inset-0 z-50 flex",
    props.side === "right" ? "justify-end" : "items-center justify-center p-4",
  ),
);
const contentClass = computed(() =>
  cn(
    "relative z-50 w-full bg-surface text-text shadow-none",
    "rounded-lg border border-zinc-200 dark:border-zinc-800",
    "max-h-[85vh] overflow-auto p-6",
    props.side === "right" ? "h-full max-w-md rounded-l-lg rounded-r-none" : "max-w-md",
  ),
);
const backdropClass = computed(() =>
  cn(
    "fixed inset-0 z-40 bg-zinc-950/50 backdrop-blur-sm",
    "data-[state=closed]:animate-out data-[state=open]:animate-in",
  ),
);
const titleClass = "text-lg font-semibold tracking-tight";
const descriptionClass = "mt-1 text-sm text-text-2";
const bodyClass = "mt-4";
const closeButtonClass = cn(
  "inline-flex h-8 w-8 items-center justify-center rounded-md",
  "text-text-2 hover:bg-zinc-100 hover:text-text",
  "dark:hover:bg-zinc-800",
);
</script>

<template>
  <Teleport to="body">
    <div
      v-if="api.open"
      v-bind="api.getBackdropProps()"
      :class="backdropClass"
    />
    <div v-bind="api.getPositionerProps()" :class="positionerClass">
      <div v-bind="api.getContentProps()" :class="contentClass">
        <header v-if="title || description" class="flex items-start justify-between gap-4">
          <div>
            <h2 v-if="title" v-bind="api.getTitleProps()" :class="titleClass">{{ title }}</h2>
            <p v-if="description" v-bind="api.getDescriptionProps()" :class="descriptionClass">
              {{ description }}
            </p>
          </div>
          <button
            v-bind="api.getCloseTriggerProps()"
            :class="closeButtonClass"
            aria-label="Close"
            type="button"
          >
            <Icon name="PhX" :size="16" />
          </button>
        </header>
        <div :class="bodyClass">
          <slot />
        </div>
      </div>
    </div>
  </Teleport>
</template>
