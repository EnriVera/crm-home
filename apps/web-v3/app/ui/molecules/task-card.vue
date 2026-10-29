<script setup lang="ts">
import type { Task } from "~/domain/task/entities";

/**
 * Kanban task card (PRD-v4 §8.4): title, client and category chip.
 *
 * The catalogue also shows a due date; the task wire has no due date
 * field, so the card renders what the API carries.
 *
 * A native `<button>` and not a div with a role: the keyboard contract
 * (Enter and Space), the focus ring and the screen reader name come for
 * free instead of being hand-rolled.
 */
defineProps<{
  task: Task;
  clientName: string | null;
  categoryName: string | null;
}>();

const emit = defineEmits<{
  open: [id: string];
}>();
</script>

<template>
  <button
    type="button"
    class="block w-full cursor-pointer rounded-[var(--radius)] border border-border bg-surface p-4 text-left shadow-sm transition-[border-color,transform] duration-150 ease-out hover:-translate-y-px hover:border-primary-300 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
    :data-task-id="task.id"
    data-testid="task-card"
    @click="emit('open', task.id)"
  >
    <span class="block text-sm font-medium text-text">{{ task.title }}</span>
    <span v-if="clientName" class="mt-1 block text-xs text-text-2">{{ clientName }}</span>
    <span v-if="categoryName" class="mt-2 block">
      <span
        class="inline-block rounded-full bg-primary-50 px-2 py-0.5 text-xs text-primary-700"
        data-testid="task-card-category"
      >
        {{ categoryName }}
      </span>
    </span>
  </button>
</template>
