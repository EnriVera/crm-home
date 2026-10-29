<script setup lang="ts">
import { computed, onMounted, ref, watch } from "vue";
import { filterTasks, type Task } from "~/domain/task/entities";
import { useTasks } from "~/shared/composables/use-tasks";
import { useRouteSearch } from "~/shared/composables/use-route-search";
import type { SearchParams } from "~/router/search-schemas";
import BaseView from "~/ui/organisms/base-view.vue";
import KanbanBoard from "~/ui/organisms/kanban-board.vue";
import TaskDrawer from "~/ui/organisms/task-drawer.vue";
import TaskCard from "~/ui/molecules/task-card.vue";
import {
  PhKanban,
  PhList,
  PhMagnifyingGlass,
  PhPlus,
  PhSquaresFour,
} from "~/shared/vendor/icons";

const { t } = useI18n();
const { params, set } = useRouteSearch("tasks");
const {
  tasks,
  columns,
  clients,
  types,
  board,
  isLoading,
  error,
  clientNameById,
  categoryNameById,
  load,
  add,
  edit,
  deleteTask,
  move,
} = useTasks();

type ViewMode = NonNullable<SearchParams<"tasks">["view"]>;

const search = ref("");
const saving = ref(false);
const drawerError = ref<string | null>(null);

const view = computed<ViewMode>(() => params.value.view ?? "kanban");

const visibleTasks = computed(() => filterTasks(tasks.value, search.value));

const activeCount = computed(() => tasks.value.length);

const editingTask = computed(
  () => tasks.value.find((task) => task.id === params.value.edit) ?? null,
);

const drawerOpen = computed(
  () => params.value.drawer === "new" || params.value.edit !== undefined,
);

/** The column the "+" of a kanban column creates into (null = default). */
const newTaskStateId = ref<string | null>(null);

const VIEWS: { id: ViewMode; labelKey: string; icon: typeof PhList }[] = [
  { id: "kanban", labelKey: "baseview.kanban", icon: PhKanban },
  { id: "grilla", labelKey: "baseview.grid", icon: PhSquaresFour },
  { id: "lista", labelKey: "baseview.list", icon: PhList },
];

onMounted(() => {
  void load();
});

function selectView(next: ViewMode) {
  void set({ view: next });
}

function openCreate(stateId: string | null = null) {
  newTaskStateId.value = stateId;
  drawerError.value = null;
  void set({ drawer: "new", edit: "" });
}

function openEdit(taskId: string) {
  drawerError.value = null;
  void set({ edit: taskId, drawer: "" });
}

function closeDrawer() {
  newTaskStateId.value = null;
  return set({ drawer: "", edit: "" });
}

async function submitTask(values: {
  title: string;
  description: string | null;
  clientId: string | null;
  typeId: string | null;
  categoryId: string | null;
}) {
  drawerError.value = null;
  saving.value = true;
  try {
    if (editingTask.value) {
      await edit({ id: editingTask.value.id, ...values });
    } else {
      if (!values.typeId) {
        drawerError.value = "tasks.drawer.typeRequired";
        return;
      }
      await add({
        title: values.title,
        description: values.description,
        typeId: values.typeId,
        categoryId: values.categoryId,
        clientId: values.clientId,
        ...(newTaskStateId.value ? { stateId: newTaskStateId.value } : {}),
      });
    }
    await closeDrawer();
  } catch {
    drawerError.value = "config.drawer.saveError";
  } finally {
    saving.value = false;
  }
}

async function removeTask(taskId: string) {
  await deleteTask(taskId);
  await closeDrawer();
}

async function onMove(payload: {
  id: string;
  targetStateId: string;
  index: number;
  columnTasks: Task[];
}) {
  try {
    await move(payload);
  } catch {
    // The composable restored the pre-drag board; the error surfaces in
    // the next load, not as a toast (PRD-v4 §11.5: inline, not blocking).
  }
}

function clientName(task: Task): string | null {
  return task.clientId ? (clientNameById.value.get(task.clientId) ?? null) : null;
}

function categoryName(task: Task): string | null {
  return task.categoryId
    ? (categoryNameById.value.get(task.categoryId) ?? null)
    : null;
}
</script>

<template>
  <section class="mx-auto w-full max-w-6xl">
    <header class="flex flex-wrap items-start justify-between gap-4">
      <div>
        <h1 class="text-2xl font-semibold tracking-tight text-text">
          {{ t("tasks.title") }}
        </h1>
        <p class="mt-1 text-sm text-text-2">
          {{ t("tasks.subtitle", { count: activeCount }) }}
        </p>
      </div>
      <button
        type="button"
        class="inline-flex items-center gap-2 rounded-full bg-accent px-4 py-2.5 text-sm font-semibold text-accent-fg transition-colors hover:bg-accent-hover"
        data-testid="tasks-new"
        @click="openCreate()"
      >
        <PhPlus :size="16" weight="bold" />
        {{ t("tasks.new") }}
      </button>
    </header>

    <p v-if="error" class="mt-4 text-sm text-error" data-testid="tasks-error">
      {{ t(error) }}
    </p>

    <!-- Toolbar: pill search + 3-view switcher (PRD-v4 §8.4). -->
    <div class="mt-5 flex flex-wrap items-center justify-between gap-3">
      <label class="relative block w-full max-w-sm">
        <span class="sr-only">{{ t("tasks.search") }}</span>
        <PhMagnifyingGlass
          :size="16"
          class="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-text-2"
        />
        <input
          v-model="search"
          type="search"
          :placeholder="t('tasks.search')"
          class="h-10 w-full rounded-full border border-border bg-surface pl-9 pr-3 text-sm text-text outline-none transition-colors placeholder:text-text-2 focus:border-accent"
          data-testid="tasks-search"
        />
      </label>

      <div
        class="flex gap-1 rounded-full bg-surface-2 p-1"
        role="group"
        :aria-label="t('baseview.switcher')"
      >
        <button
          v-for="option in VIEWS"
          :key="option.id"
          type="button"
          class="inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm transition-colors"
          :class="
            view === option.id
              ? 'bg-surface font-medium text-accent shadow-sm'
              : 'text-text-2 hover:text-text'
          "
          :aria-pressed="view === option.id"
          :data-testid="`tasks-view-${option.id}`"
          @click="selectView(option.id)"
        >
          <component :is="option.icon" :size="16" weight="regular" />
          <span class="hidden sm:inline">{{ t(option.labelKey) }}</span>
        </button>
      </div>
    </div>

    <!-- Kanban (default view of the catalogue). -->
    <div v-if="view === 'kanban'" class="mt-5">
      <div
        v-if="isLoading"
        class="flex gap-4 overflow-hidden"
        aria-hidden="true"
        data-testid="tasks-kanban-loading"
      >
        <div
          v-for="n in 3"
          :key="n"
          class="h-64 w-72 shrink-0 animate-pulse rounded-[var(--radius)] bg-surface-2"
        />
      </div>
      <KanbanBoard
        v-else
        :columns="columns"
        :board="board"
        :client-name-by-id="clientNameById"
        :category-name-by-id="categoryNameById"
        @move="onMove"
        @add="openCreate"
        @open="openEdit"
      />
    </div>

    <!-- Grid / list views. -->
    <BaseView
      v-else
      id="tasks-list"
      :toolbar="false"
      :view="view === 'lista' ? 'list' : 'grid'"
      :loading="isLoading"
      :search-placeholder="t('tasks.search')"
    >
      <template #grid>
        <div class="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <TaskCard
            v-for="task in visibleTasks"
            :key="task.id"
            :task="task"
            :client-name="clientName(task)"
            :category-name="categoryName(task)"
            @open="openEdit"
          />
        </div>
      </template>
      <template #list>
        <ul
          class="divide-y divide-border rounded-[var(--radius)] border border-border bg-surface"
        >
          <li
            v-for="task in visibleTasks"
            :key="task.id"
            class="flex items-center justify-between gap-3 px-4 py-3"
          >
            <div class="min-w-0">
              <p class="truncate text-sm font-medium text-text">{{ task.title }}</p>
              <p class="truncate text-xs text-text-2">
                {{ clientName(task) ?? t("tasks.noClient") }}
              </p>
            </div>
            <span
              v-if="categoryName(task)"
              class="shrink-0 rounded-full bg-primary-50 px-2 py-0.5 text-xs text-primary-700"
            >
              {{ categoryName(task) }}
            </span>
          </li>
        </ul>
      </template>
      <template #empty>
        <p
          v-if="visibleTasks.length === 0"
          class="rounded-[var(--radius)] border border-dashed border-border px-4 py-10 text-center text-sm text-text-2"
          data-testid="tasks-empty"
        >
          {{ t("tasks.empty") }}
        </p>
      </template>
    </BaseView>

    <TaskDrawer
      :open="drawerOpen"
      :initial="editingTask"
      :clients="clients"
      :types="types"
      :submitting="saving"
      :error="drawerError"
      @close="closeDrawer"
      @submit="submitTask"
      @remove="removeTask"
    />
  </section>
</template>
