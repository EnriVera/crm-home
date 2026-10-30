<script setup lang="ts">
import { ref } from "vue";
import { PhTrash } from "~/shared/vendor/icons";
import InlineConfirm from "~/ui/molecules/inline-confirm.vue";

/**
 * The delete action of the /config records (PRD-v2 §8.5: a destructive
 * action never fires from a single click). The trash button swaps to an
 * inline confirmation; the caller only hears about the explicit confirm.
 */
defineProps<{
  /** The label of the delete action. */
  deleteLabel: string;
  /** The question of the confirmation. */
  deleteConfirm: string;
  /** The label of the confirm button. */
  confirmLabel: string;
  /** The label of the cancel button. */
  cancelLabel: string;
}>();

const emit = defineEmits<{
  remove: [];
}>();

const confirming = ref(false);
</script>

<template>
  <button
    v-if="!confirming"
    type="button"
    class="rounded p-1 text-text-2 transition-colors hover:bg-surface-2 hover:text-error"
    :aria-label="deleteLabel"
    data-testid="config-delete"
    @click="confirming = true"
  >
    <PhTrash :size="15" weight="regular" aria-hidden="true" />
  </button>
  <InlineConfirm
    v-else
    :question="deleteConfirm"
    :confirm-label="confirmLabel"
    :cancel-label="cancelLabel"
    @confirm="
      confirming = false;
      emit('remove');
    "
    @cancel="confirming = false"
  />
</template>
