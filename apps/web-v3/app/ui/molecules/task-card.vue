<script setup lang="ts">
import type { Task } from "~/domain/task/entities";

/**
 * Kanban task card (PRD-v4 §8.4): title, client and category chip.
 *
 * The catalogue also shows a due date; the task wire has no due date
 * field, so the card renders what the API carries.
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
  <article
    class="cursor-pointer rounded-[var(--radius)] border border-border bg-surface p-4 shadow-sm transition-[border-color,transform] duration-150 ease-out hover:-translate-y-px hover:border-primary-300"
    :data-task-id="task.id"
    data-testid="task-card"
    @click="emit('open', task.id)"
    @keydown.enter="emit('open', task.id)"
  >
    <p class="text-sm font-medium text-text">{{ task.title }}</p>
    <p v-if="clientName" class="mt-1 text-xs text-text-2">{{ clientName }}</p>
    <div v-if="categoryName" class="mt-2">
      <span
        class="inline-block rounded-full bg-primary-50 px-2 py-0.5 text-xs text-primary-700"
        data-testid="task-card-category"
      >
        {{ categoryName }}
      </span>
    </div>
  </article>
</template>
