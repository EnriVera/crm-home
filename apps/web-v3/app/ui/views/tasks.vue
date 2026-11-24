<script setup lang="ts">
import { computed, onMounted, ref, watch } from "vue";
import {
  dueBucket,
  filterTasks,
  isDueWithinDays,
  type Task,
} from "~/domain/task/entities";
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
  categoryColorById,
  load,
  add,
  edit,
  deleteTask,
  move,
} = useTasks();

type ViewMode = NonNullable<SearchParams<"tasks">["view"]>;
type DueFilter = NonNullable<SearchParams<"tasks">["due"]>;

const search = ref("");
const saving = ref(false);
const drawerError = ref<string | null>(null);

const view = computed<ViewMode>(() => params.value.view ?? "kanban");

/**
 * The due-date filter (PRD-v4 §8.4, toolbar "Filtros").
 *
 * It lives in the URL: a filtered view can be shared and survives a
 * reload (PRD-v4 §12.5).
 */
const dueFilter = computed<DueFilter>(() => params.value.due ?? "todas");

const DUE_FILTERS: { id: DueFilter; labelKey: string }[] = [
  { id: "todas", labelKey: "tasks.dueFilter.todas" },
  { id: "vencidas", labelKey: "tasks.dueFilter.vencidas" },
  { id: "hoy", labelKey: "tasks.dueFilter.hoy" },
  { id: "semana", labelKey: "tasks.dueFilter.semana" },
  { id: "sin-fecha", labelKey: "tasks.dueFilter.sinFecha" },
];

function selectDueFilter(next: DueFilter) {
  void set({ due: next });
}

/**
 * Whether a task passes the due-date filter.
 *
 * "Esta semana" is the only filter that is NOT a bucket: it is "today or
 * within the next seven days", so a task that expires in a month is
 * NOT in it.
 */
function matchesDueFilter(task: Task, filter: DueFilter): boolean {
  switch (filter) {
    case "todas":
      return true;
    case "vencidas":
      return dueBucket(task.dueDate) === "overdue";
    case "hoy":
      return dueBucket(task.dueDate) === "today";
    case "semana":
      return isDueWithinDays(task.dueDate);
    case "sin-fecha":
      return task.dueDate === null;
  }
}

/** The tasks that pass the search box AND the due-date filter. */
const visibleTasks = computed(() => {
  const searched = filterTasks(tasks.value, search.value);
  if (dueFilter.value === "todas") return searched;
  return searched.filter((task) => matchesDueFilter(task, dueFilter.value));
});

/** How many tasks each filter would show (the badge of the pill). */
function dueFilterCount(filter: DueFilter): number {
  return tasks.value.filter((task) => matchesDueFilter(task, filter)).length;
}

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
  dueDate: Date | null;
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
        dueDate: values.dueDate,
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

function categoryColor(task: Task): string | null {
  return task.categoryId
    ? (categoryColorById.value.get(task.categoryId) ?? null)
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

    <!-- Due-date filter (PRD-v4 §8.4, toolbar "Filtros"). -->
    <div
      class="mt-3 flex flex-wrap items-center gap-2"
      role="group"
      :aria-label="t('tasks.dueFilter.label')"
      data-testid="tasks-due-filter"
    >
      <button
        v-for="option in DUE_FILTERS"
        :key="option.id"
        type="button"
        class="rounded-full border px-3 py-1.5 text-sm transition-colors"
        :class="
          dueFilter === option.id
            ? 'border-primary-300 bg-primary-50 font-medium text-primary-700'
            : 'border-border text-text-2 hover:bg-surface-2 hover:text-text'
        "
        :aria-pressed="dueFilter === option.id"
        :data-testid="`tasks-due-filter-${option.id}`"
        @click="selectDueFilter(option.id)"
      >
        {{ t(option.labelKey) }}
        <span class="tabular-nums text-xs opacity-70">
          {{ dueFilterCount(option.id) }}
        </span>
      </button>
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
        :category-color-by-id="categoryColorById"
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
            :category-color="categoryColor(task)"
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
