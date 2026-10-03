<script setup lang="ts">
/**
 * KanbanBoard — renders one column per TaskState with TaskCard
 * children. Uses native browser drag-and-drop (HTML5 dataTransfer)
 * because the `vue-draggable-plus` vendor wrapper that the PRD
 * names is not present in the dependency tree (the wrapper folder
 * at `src/shared/vendor/dnd/` is empty and the package itself is
 * not installed). Native dnd keeps the move mutation contract
 * unchanged and avoids pulling in a new dependency for v1.
 *
 * Events:
 *   - `move` with { taskId, toColumnId, toIndex } on every drop.
 *     Parent calls `useUpdateTaskState` which optimistically
 *     rebuilds the column and reconciles with the server on settle.
 *   - `select` with the task id when a card is clicked without
 *     dragging (the dragstart suppresses the click).
 */
import { ref } from "vue";
import type { Task, TaskState } from "@crm/contract/task";
import type { TaskStateId } from "@crm/contract/shared/identifiers";
import TaskCard from "@/ui/molecules/task-card/TaskCard.vue";

export interface KanbanMovePayload {
  id: Task["id"];
  columnId: TaskStateId;
  toIndex: number;
}

const props = defineProps<{
  columns: TaskState[];
  tasksByColumn: Map<TaskStateId, Task[]>;
}>();

const emit = defineEmits<{
  move: [payload: KanbanMovePayload];
  select: [taskId: Task["id"]];
}>();

/** id of the card currently being dragged (null when idle). */
const draggingId = ref<Task["id"] | null>(null);
/** id of the column under the cursor (null when not hovering). */
const dragOverColumnId = ref<TaskStateId | null>(null);

function onDragStart(event: DragEvent, task: Task) {
  draggingId.value = task.id;
  if (event.dataTransfer) {
    event.dataTransfer.effectAllowed = "move";
    // text/plain is the fallback payload the spec mandates for cross-
    // browser compatibility; some browsers ignore empty payloads.
    event.dataTransfer.setData("text/plain", task.id);
  }
}

function onDragEnd() {
  draggingId.value = null;
  dragOverColumnId.value = null;
}

function onDragOver(event: DragEvent, columnId: TaskStateId) {
  // preventDefault is required for the drop event to fire.
  event.preventDefault();
  if (event.dataTransfer) {
    event.dataTransfer.dropEffect = "move";
  }
  dragOverColumnId.value = columnId;
}

function onDragLeave(event: DragEvent, columnId: TaskStateId) {
  // dragleave fires when moving into a child element; only clear the
  // marker when leaving the column bounds. A counter column is a cheap
  // heuristic that catches most false-positive leaves.
  const related = event.relatedTarget as Node | null;
  const current = event.currentTarget as Node | null;
  if (current && related && current.contains(related)) return;
  if (dragOverColumnId.value === columnId) {
    dragOverColumnId.value = null;
  }
}

function onDrop(event: DragEvent, columnId: TaskStateId) {
  event.preventDefault();
  const data =
    event.dataTransfer?.getData("text/plain") ?? draggingId.value ?? null;
  if (!data) return;
  const tasks = props.tasksByColumn.get(columnId) ?? [];
  // Append to the end of the target column for v1; a between-cards
  // drop target would let the user pick an index, but the requirement
  // is to persist the move, not to support arbitrary ordering.
  emit("move", {
    id: data as Task["id"],
    columnId: columnId,
    toIndex: tasks.length,
  });
  draggingId.value = null;
  dragOverColumnId.value = null;
}

function tasksFor(columnId: TaskStateId): Task[] {
  return props.tasksByColumn.get(columnId) ?? [];
}
</script>

<template>
  <div class="flex h-full gap-4 overflow-x-auto pb-2">
    <div
      v-for="column in columns"
      :key="column.id"
      class="flex w-72 shrink-0 flex-col rounded-lg border border-zinc-200 bg-bg transition dark:border-zinc-800"
      :class="{ 'ring-2 ring-accent ring-offset-1 ring-offset-bg': dragOverColumnId === column.id }"
      @dragover="onDragOver($event, column.id)"
      @dragleave="onDragLeave($event, column.id)"
      @drop="onDrop($event, column.id)"
    >
      <header
        class="flex items-center justify-between border-b border-zinc-200 px-3 py-2 dark:border-zinc-800"
      >
        <h3 class="text-xs font-semibold uppercase tracking-wide text-text-2">
          {{ column.title }}
        </h3>
        <span class="text-xs text-text-2">{{ tasksFor(column.id).length }}</span>
      </header>
      <div class="flex flex-1 flex-col gap-2 overflow-y-auto p-2">
        <TaskCard
          v-for="task in tasksFor(column.id)"
          :key="task.id"
          :task="task"
          draggable="true"
          @click="emit('select', task.id)"
          @dragstart="onDragStart($event, task)"
          @dragend="onDragEnd"
        />
        <p
          v-if="tasksFor(column.id).length === 0"
          class="py-6 text-center text-xs text-text-2"
        >
          Drop tasks here
        </p>
      </div>
    </div>
  </div>
</template>