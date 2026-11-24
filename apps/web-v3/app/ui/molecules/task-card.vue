<script setup lang="ts">
import { computed } from "vue";
import { dueBucket, type Task } from "~/domain/task/entities";
import { dataColorFgVar, dataColorVar } from "~/domain/config/entities";

/**
 * Kanban task card (PRD-v4 §8.4): title, client, category chip and the
 * due date on the right (the catalogue shows "vence <fecha>").
 *
 * A native `<button>` and not a div with a role: the keyboard contract
 * (Enter and Space), the focus ring and the screen reader name come for
 * free instead of being hand-rolled.
 */
const props = defineProps<{
  task: Task;
  clientName: string | null;
  categoryName: string | null;
  /** The data color of the category; null = the category has no color. */
  categoryColor?: string | null | undefined;
}>();

const emit = defineEmits<{
  open: [id: string];
}>();

const { t } = useI18n();

/** The bucket of the deadline: overdue / today / upcoming / none. */
const bucket = computed(() => dueBucket(props.task.dueDate));

/** "Vence el 28/06" — the deadline, in the local calendar day. */
const dueLabel = computed(() => {
  if (!props.task.dueDate) return null;
  const date = new Intl.DateTimeFormat("es-AR", {
    day: "2-digit",
    month: "2-digit",
  }).format(props.task.dueDate);
  return t(`tasks.due.${bucket.value}`, { date });
});
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
    <span class="mt-2 flex items-center justify-between gap-2">
      <span v-if="categoryName" class="min-w-0">
        <span
          class="inline-block rounded-full px-2 py-0.5 text-xs"
          :class="categoryColor ? undefined : 'bg-primary-50 text-primary-700'"
          :style="
            categoryColor
              ? {
                  backgroundColor: dataColorVar(categoryColor),
                  color: dataColorFgVar(categoryColor),
                }
              : undefined
          "
          data-testid="task-card-category"
        >
          {{ categoryName }}
        </span>
      </span>
      <span
        v-if="dueLabel"
        class="shrink-0 text-xs tabular-nums"
        :class="bucket === 'overdue' ? 'text-error' : 'text-text-2'"
        data-testid="task-card-due"
      >
        {{ dueLabel }}
      </span>
    </span>
  </button>
</template>
