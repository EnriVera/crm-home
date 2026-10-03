<script setup lang="ts">
/**
 * Modal — convenience wrapper around Dialog with `side="center"`.
 * Same machine, centered positioning. Use for confirmations and forms
 * that should sit over the page.
 *
 * Usage:
 *   <Modal v-model:open="isOpen" title="Delete task?" description="This cannot be undone.">
 *     <p>Are you sure?</p>
 *   </Modal>
 */
import Dialog from "./Dialog.vue";

defineProps<{
  open: boolean;
  title?: string;
  description?: string;
  closeOnInteractOutside?: boolean;
}>();

defineEmits<{
  "update:open": [open: boolean];
}>();
</script>

<template>
  <Dialog
    :open="open"
    :title="title ?? ''"
    :description="description ?? ''"
    side="center"
    :close-on-interact-outside="closeOnInteractOutside ?? true"
    @update:open="$emit('update:open', $event)"
  >
    <slot />
  </Dialog>
</template>
