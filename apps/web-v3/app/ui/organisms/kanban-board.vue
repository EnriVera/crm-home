<script setup lang="ts">
import { nextTick, reactive, ref, watch } from "vue";
import DragList from "~/shared/vendor/dnd/DragList.vue";
import { sortColumns, type Task, type TaskColumn } from "~/domain/task/entities";
import TaskCard from "~/ui/molecules/task-card.vue";
import { PhPlus } from "~/shared/vendor/icons";

/**
 * KanbanBoard (PRD-v4 §8.4): one column per task state, drag & drop
 * between and inside columns via vue-draggable-plus (the vendor wrapper
 * rule points at `vendor/dnd/` for this library — see tasks.vue, which
 * is the only consumer and keeps the import surface reviewed).
 *
 * The board is a controlled view: the drag mutates local copies for the
 * visual, then emits `move` with the semantic intent; the parent applies
 * it optimistically and the resynced board flows back down.
 *
 * Motion (PRD-v4 §11.5 #5/#6): the dragged card lifts (shadow + ring +
 * scale) and settles back on drop.
 */
const props = defineProps<{
  columns: TaskColumn[];
  board: Map<string | null, Task[]>;
  clientNameById: Map<string, string>;
  categoryNameById: Map<string, string>;
}>();

const emit = defineEmits<{
  move: [
    payload: {
      id: string;
      targetStateId: string;
      index: number;
      columnTasks: Task[];
    },
  ];
  add: [stateId: string];
  open: [taskId: string];
}>();

const { t } = useI18n();

/** Local per-column arrays the draggable mutates for the visual drag. */
const local = reactive<Record<string, Task[]>>({});

/**
 * Bumped after every drop to rebuild the columns from the data.
 *
 * vue-draggable-plus moves the DOM node itself and only supports v-model
 * (no `list` prop), so after a drop Vue's diff and Sortable's DOM move
 * disagree and the card can stay visible in the source column. Remounting
 * the columns re-renders them from the (already updated) data.
 */
const epoch = ref(0);

watch(
  () => props.board,
  (board) => {
    for (const column of props.columns) {
      local[column.id] = [...(board.get(column.id) ?? [])];
    }
  },
  { immediate: true, deep: true },
);

const orderedColumns = () => sortColumns(props.columns);

interface DragEndEvent {
  item: HTMLElement;
  from: HTMLElement;
  to: HTMLElement;
  newIndex: number;
}

function columnIdOf(element: HTMLElement | null): string | null {
  return element?.closest("[data-state-id]")?.getAttribute("data-state-id") ?? null;
}

/**
 * The task that was dragged.
 *
 * The id comes from the dragged DOM element, NOT from the list: the
 * `end` event fires BEFORE the v-model array is updated, so reading the
 * array here would pick the wrong task (the one that was at that index).
 */
function draggedTaskId(item: HTMLElement | null): string | null {
  return item?.getAttribute("data-task-id") ?? null;
}

function onEnd(event: DragEndEvent) {
  const targetStateId = columnIdOf(event.to);
  if (!targetStateId) return;
  const movedId = draggedTaskId(event.item);
  if (!movedId) return;
  const targetList = local[targetStateId] ?? [];
  emit("move", {
    id: movedId,
    targetStateId,
    index: event.newIndex,
    // The column WITHOUT the moved task: the API places the task between
    // these neighbors.
    columnTasks: targetList.filter((task) => task.id !== movedId),
  });
  // Rebuild the columns once the parent applied the move, so the DOM
  // matches the data (see the `epoch` note).
  void nextTick(() => {
    epoch.value += 1;
  });
}
</script>

<template>
  <div class="flex items-start gap-4 overflow-x-auto pb-4">
    <section
      v-for="column in orderedColumns()"
      :key="`${column.id}:${epoch}`"
      class="flex w-72 shrink-0 flex-col"
      :data-state-id="column.id"
      :data-testid="`kanban-column-${column.id}`"
    >
      <header class="flex items-center gap-2 px-1 py-2">
        <p class="text-sm font-semibold text-text">{{ column.name }}</p>
        <span
          class="rounded-full bg-surface-2 px-2 py-0.5 text-xs text-text-2"
          data-testid="kanban-count"
        >
          {{ (local[column.id] ?? []).length }}
        </span>
        <button
          type="button"
          class="ml-auto rounded-full p-1 text-text-2 transition-colors hover:bg-surface-2 hover:text-text"
          :aria-label="t('tasks.addInColumn', { name: column.name })"
          :data-testid="`kanban-add-${column.id}`"
          @click="emit('add', column.id)"
        >
          <PhPlus :size="16" weight="regular" />
        </button>
      </header>

      <DragList
        v-model="local[column.id]!"
        group="tasks"
        class="flex min-h-32 flex-col gap-3 rounded-[var(--radius)] p-1"
        :data-testid="`kanban-drop-${column.id}`"
        @end="onEnd"
      >
        <template #item="{ item }">
          <TaskCard
            :task="item"
            :client-name="item.clientId ? (clientNameById.get(item.clientId) ?? null) : null"
            :category-name="item.categoryId ? (categoryNameById.get(item.categoryId) ?? null) : null"
            @open="emit('open', $event)"
          />
        </template>
      </DragList>

      <p
        v-if="(local[column.id] ?? []).length === 0"
        class="rounded-[var(--radius)] border border-dashed border-border px-3 py-6 text-center text-xs text-text-2"
      >
        {{ t("tasks.emptyColumn") }}
      </p>
    </section>
  </div>
</template>

<style scoped>
/* PRD-v4 §11.5 #5: lift while dragging (functional elevation only). */
:deep(.sortable-ghost) {
  opacity: 0.6;
}

:deep(.sortable-drag) {
  transform: scale(1.02);
  box-shadow: var(--shadow-elevation);
  outline: 2px solid var(--color-primary-300);
  outline-offset: 1px;
}
</style>
