<script setup lang="ts">
/**
 * Sheet — convenience wrapper around Dialog with `side="right"`.
 * Same machine, different positioning + a max-width.
 *
 * Usage:
 *   <Sheet v-model:open="isOpen" title="Edit task" description="Make changes and save.">
 *     <TaskForm @saved="isOpen = false" />
 *   </Sheet>
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
    side="right"
    :close-on-interact-outside="closeOnInteractOutside ?? true"
    @update:open="$emit('update:open', $event)"
  >
    <slot />
  </Dialog>
</template>
