<script setup lang="ts">
/**
 * /tasks — the Tasks page. Default view is the Kanban board; a
 * header switcher toggles to a flat Grid view. The "+ New task"
 * button opens the EditTaskDrawer in create mode; clicking any
 * card or grid row opens it in edit mode. Drag-and-drop between
 * columns persists via `useUpdateTaskState`.
 *
 * View mode persists in localStorage (`tasks.viewMode`) so the
 * user choice survives a refresh.
 */
import { computed, onMounted, ref, watch } from "vue";
import { useT } from "@/shared/vendor/i18n";
import { toast } from "@/shared/vendor/toast";
import BaseView from "@/ui/organisms/base-view/BaseView.vue";
import KanbanBoard from "@/ui/organisms/kanban-board/KanbanBoard.vue";
import TaskGrid from "@/ui/organisms/task-grid/TaskGrid.vue";
import EditTaskDrawer from "@/ui/molecules/edit-task-drawer/EditTaskDrawer.vue";
import { useListTasks } from "@/shared/composables/use-list-tasks";
import { useListTaskStates } from "@/shared/composables/use-list-task-states";
import { useUpdateTaskState } from "@/shared/composables/use-update-task-state";
import type { Task, ListTasksQuery } from "@crm/contract/task";
import type { TaskStateId } from "@crm/contract/shared/identifiers";

const t = useT();

/* -------------------------------------------------------------- */
/*  View mode (kanban | grid), persisted to localStorage           */
/* -------------------------------------------------------------- */

type ViewMode = "kanban" | "grid";
const VIEW_MODE_KEY = "tasks.viewMode";

function readViewMode(): ViewMode {
  if (typeof window === "undefined") return "kanban";
  const raw = window.localStorage.getItem(VIEW_MODE_KEY);
  return raw === "grid" ? "grid" : "kanban";
}

const viewMode = ref<ViewMode>(readViewMode());

watch(viewMode, (next) => {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(VIEW_MODE_KEY, next);
});

/* -------------------------------------------------------------- */
/*  Drawer state                                                     */
/* -------------------------------------------------------------- */

const drawerOpen = ref(false);
const drawerTask = ref<Task | null>(null);

function openCreate() {
  drawerTask.value = null;
  drawerOpen.value = true;
}

function openEdit(taskId: Task["id"]) {
  const task = (tasksQuery.data.value?.items ?? []).find(
    (x) => x.id === taskId,
  );
  if (!task) {
    toast.error("Task not found in the current page.");
    return;
  }
  drawerTask.value = task;
  drawerOpen.value = true;
}

/* -------------------------------------------------------------- */
/*  Data                                                           */
/* -------------------------------------------------------------- */

const listQuery = ref<ListTasksQuery>({ limit: 50 });
const tasksQuery = useListTasks(listQuery);
const statesQuery = useListTaskStates();
const moveMutation = useUpdateTaskState();

/* -------------------------------------------------------------- */
/*  Derived: columns + tasks-by-column map                         */
/* -------------------------------------------------------------- */

const columns = computed(() => statesQuery.data.value ?? []);
const tasksByColumn = computed(() => {
  const map = new Map<TaskStateId, Task[]>();
  for (const column of columns.value) map.set(column.id, []);
  const items = tasksQuery.data.value?.items ?? [];
  for (const task of items) {
    const bucket = map.get(task.taskStateId);
    if (bucket) bucket.push(task);
  }
  return map;
});

/* -------------------------------------------------------------- */
/*  Error surfacing                                                */
/* -------------------------------------------------------------- */

watch(tasksQuery.error, (err) => {
  if (err) {
    toast.error("Could not load tasks.");
  }
});
watch(statesQuery.error, (err) => {
  if (err) {
    toast.error("Could not load task states.");
  }
});

/* -------------------------------------------------------------- */
/*  Drag-and-drop handler                                          */
/* -------------------------------------------------------------- */

function onMove(payload: {
  id: Task["id"];
  columnId: TaskStateId;
  toIndex: number;
}) {
  moveMutation.mutate(payload, {
    onError: () => {
      toast.error("Could not move task.");
    },
  });
}

onMounted(() => {
  // No-op — queries already kicked off at setup; reserved for future
  // telemetry hooks.
});
</script>

<template>
  <BaseView :title="t('nav.tasks')" v-model:view-mode="viewMode">
    <template #actions>
      <button
        type="button"
        class="rounded-md bg-accent px-3 py-1.5 text-sm font-medium text-accent-fg transition hover:opacity-90 disabled:opacity-50"
        @click="openCreate"
      >
        + New task
      </button>
    </template>

    <div
      v-if="tasksQuery.isLoading.value || statesQuery.isLoading.value"
      class="flex h-full items-center justify-center py-12 text-sm text-text-2"
    >
      Loading tasks…
    </div>
    <div
      v-else-if="tasksQuery.error.value || statesQuery.error.value"
      class="flex h-full flex-col items-center justify-center gap-3 py-12 text-sm text-text-2"
    >
      <p>{{ t("common.error") }}</p>
      <button
        type="button"
        class="rounded-md border border-zinc-200 px-3 py-1.5 text-sm font-medium transition hover:bg-zinc-50 dark:border-zinc-800 dark:hover:bg-zinc-800"
        @click="() => tasksQuery.refetch()"
      >
        {{ t("common.retry") }}
      </button>
    </div>
    <KanbanBoard
      v-else-if="viewMode === 'kanban'"
      :columns="columns"
      :tasks-by-column="tasksByColumn"
      @move="onMove"
      @select="openEdit"
    />
    <TaskGrid
      v-else
      :tasks="tasksQuery.data.value?.items ?? []"
      @select="openEdit"
    />

    <EditTaskDrawer
      v-model:open="drawerOpen"
      :task="drawerTask"
    />
  </BaseView>
</template>