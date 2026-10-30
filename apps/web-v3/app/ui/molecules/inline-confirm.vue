<script setup lang="ts">
import { PhX } from "~/shared/vendor/icons";

/**
 * An explicit confirmation for a destructive action, inline (PRD-v2 §8.5:
 * deleting never fires from a single click). No modal: the caller swaps
 * its action area for this and emits `confirm` only on the explicit yes.
 */
defineProps<{
  /** The question to confirm. */
  question: string;
  /** The label of the confirm button. */
  confirmLabel: string;
  /** The label of the cancel button. */
  cancelLabel: string;
}>();

const emit = defineEmits<{
  confirm: [];
  cancel: [];
}>();
</script>

<template>
  <div
    class="flex items-center gap-2"
    role="group"
    :aria-label="question"
    data-testid="inline-confirm"
  >
    <span class="text-xs text-text-2">{{ question }}</span>
    <button
      type="button"
      class="rounded-[var(--radius)] bg-accent px-2 py-1 text-xs font-semibold text-accent-fg transition-colors hover:bg-accent-hover"
      data-testid="inline-confirm-yes"
      @click="emit('confirm')"
    >
      {{ confirmLabel }}
    </button>
    <button
      type="button"
      class="grid size-6 place-items-center rounded-full text-text-2 transition-colors hover:bg-surface-2 hover:text-text"
      :aria-label="cancelLabel"
      data-testid="inline-confirm-no"
      @click="emit('cancel')"
    >
      <PhX :size="14" weight="regular" aria-hidden="true" />
    </button>
  </div>
</template>
