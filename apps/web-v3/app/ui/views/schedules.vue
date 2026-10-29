<script setup lang="ts">
import { computed, onMounted, ref } from "vue";
import {
  filterRuns,
  formatDay,
  formatDuration,
  formatTimeRange,
  groupByDay,
  groupByType,
  startOfDay,
  startOfWeek,
  totalSeconds,
  type TimerRun,
} from "~/domain/schedule/entities";
import { useTimer } from "~/shared/composables/use-timer";
import { listTaskTypes, listAllCategories, listTasks } from "~/infrastructure/task/orpc-task";
import { listClients } from "~/infrastructure/client/orpc-client";
import TimerBar from "~/ui/molecules/timer-bar.vue";
import TimeDonut from "~/ui/organisms/time-donut.vue";
import { PhArrowCounterClockwise, PhPlay } from "~/shared/vendor/icons";

/**
 * /schedules — the timer (PRD-v4 §8.5, PRD-v2 §8.4).
 *
 * Screen in three parts: the timer bar, the three stat cards (today /
 * this week / the task with the most hours) and the history with the range
 * filter.
 */
const { t } = useI18n();
const {
  run,
  history,
  elapsedSeconds,
  isRunning,
  isLoading,
  error,
  todaySeconds,
  weekSeconds,
  longest,
  sync,
  start,
  stop,
} = useTimer();

const RANGES = ["hoy", "semana"] as const;
type Range = (typeof RANGES)[number];

const range = ref<Range>("hoy");
const busy = ref(false);

const taskList = ref<{ id: string; title: string }[]>([]);
/** The titles the timer bar offers as autocomplete. */
const taskTitles = computed(() => taskList.value.map((task) => task.title));
const typeNames = ref(new Map<string, string>());
const categoryNames = ref(new Map<string, string>());
const clientNames = ref(new Map<string, string>());

// Filters of the per-day detail (PRD-v2 §8.4.3: search + type, category and task).
const detailSearch = ref("");
const detailTypeId = ref<string | null>(null);
const detailCategoryId = ref<string | null>(null);
const detailTaskId = ref<string | null>(null);

/** The data palette of the tokens (PRD-v4 §11.3), for the slices. */
const DATA_COLORS = [
  "var(--color-data-blue)",
  "var(--color-data-green)",
  "var(--color-data-pink)",
  "var(--color-data-cyan)",
  "var(--color-data-amber)",
  "var(--color-data-purple)",
  "var(--color-data-red)",
  "var(--color-data-gray)",
];

onMounted(async () => {
  await sync();
  const [tasks, types, categories, clients] = await Promise.all([
    listTasks(),
    listTaskTypes(),
    listAllCategories(),
    listClients(),
  ]);
  taskList.value = tasks.map((task) => ({ id: task.id, title: task.title }));
  typeNames.value = new Map(types.map((type) => [type.id, type.name]));
  categoryNames.value = new Map(
    categories.map((category) => [category.id, category.name]),
  );
  clientNames.value = new Map(clients.map((client) => [client.id, client.name]));
});

/** The runs of the selected range. */
const visibleRuns = computed<TimerRun[]>(() => {
  const from = range.value === "hoy" ? startOfDay(new Date()) : startOfWeek(new Date());
  return history.value.filter((item) => item.start >= from);
});

/** The total of the visible range (the footer of the history card). */
const rangeTotalSeconds = computed(() => {
  const now = new Date();
  const from = range.value === "hoy" ? startOfDay(now) : startOfWeek(now);
  return totalSeconds(visibleRuns.value, from, now, now);
});

/** The donut: the time of the range by type. */
const chartSlices = computed(() => {
  const byType = groupByType(visibleRuns.value, typeNames.value, new Date());
  return byType
    .map((slice, index) => ({
      // The id must NOT come empty (unovis uses it as the arc key).
      id: slice.id === "" ? "sin-tipo" : slice.id,
      label: slice.label,
      seconds: slice.seconds,
      color: DATA_COLORS[index % DATA_COLORS.length]!,
    }))
    // A slice of 0 seconds is not visible: drop it, an empty id breaks.
    .filter((slice) => slice.seconds > 0);
});

/** The detail by day (PRD-v2 §8.4.3), with the filters applied. */
const detailGroups = computed(() =>
  groupByDay(
    filterRuns(history.value, {
      search: detailSearch.value,
      typeId: detailTypeId.value,
      categoryId: detailCategoryId.value,
      taskId: detailTaskId.value,
    }),
  ),
);

const runningTypeName = computed(() =>
  run.value?.typeId ? (typeNames.value.get(run.value.typeId) ?? null) : null,
);
const runningCategoryName = computed(() =>
  run.value?.categoryId
    ? (categoryNames.value.get(run.value.categoryId) ?? null)
    : null,
);
const runningClientName = computed(() =>
  run.value?.clientId ? (clientNames.value.get(run.value.clientId) ?? null) : null,
);

function runSubtitle(item: TimerRun): string {
  const parts = [
    item.clientId ? (clientNames.value.get(item.clientId) ?? null) : null,
    item.typeId ? (typeNames.value.get(item.typeId) ?? null) : null,
    item.categoryId ? (categoryNames.value.get(item.categoryId) ?? null) : null,
  ].filter((part): part is string => Boolean(part));
  return parts.length > 0 ? parts.join(" · ") : t("schedules.freeTimer");
}

async function onStart(title: string) {
  busy.value = true;
  try {
    await start({ title });
  } catch {
    error.value = "schedules.startError";
  } finally {
    busy.value = false;
  }
}

async function onStop() {
  busy.value = true;
  try {
    await stop();
  } catch {
    error.value = "schedules.stopError";
  } finally {
    busy.value = false;
  }
}

/**
 * Starts a run again from the history (PRD-v2 §8.4: the running one is closed).
 *
 * The row has two buttons and they are not the same action: "Reanudar"
 * (Resume) continues the work (the title and the task), "Reiniciar"
 * (Restart) repeats it exactly as it was (the client, the type and the
 * category come along).
 */
async function onResume(item: TimerRun) {
  await startRun(item, { taskId: item.taskId });
}

async function onRestart(item: TimerRun) {
  await startRun(item, {
    taskId: item.taskId,
    clientId: item.clientId,
    typeId: item.typeId,
    categoryId: item.categoryId,
  });
}

async function startRun(item: TimerRun, context: Partial<TimerRun>) {
  busy.value = true;
  try {
    await start({
      title: item.title,
      taskId: context.taskId ?? null,
      clientId: context.clientId ?? null,
      typeId: context.typeId ?? null,
      categoryId: context.categoryId ?? null,
      origin: "resumed",
    });
  } catch {
    error.value = "schedules.startError";
  } finally {
    busy.value = false;
  }
}
</script>

<template>
  <section class="mx-auto w-full max-w-5xl">
    <header>
      <h1 class="text-2xl font-semibold tracking-tight text-text">
        {{ t("schedules.title") }}
      </h1>
      <p class="mt-1 text-sm text-text-2">{{ t("schedules.subtitle") }}</p>
    </header>

    <p v-if="error" class="mt-4 text-sm text-error" data-testid="schedules-error">
      {{ t(error) }}
    </p>

    <div class="mt-5">
      <TimerBar
        :run="run"
        :elapsed-seconds="elapsedSeconds"
        :task-titles="taskTitles"
        :type-name="runningTypeName"
        :category-name="runningCategoryName"
        :client-name="runningClientName"
        :busy="busy"
        @start="onStart"
        @stop="onStop"
      />
    </div>

    <!-- Stat cards (PRD-v4 §8.5). -->
    <div class="mt-5 grid gap-4 sm:grid-cols-3">
      <article class="rounded-[var(--radius)] border border-border bg-surface p-5">
        <p class="text-xs font-medium uppercase tracking-wide text-text-2">
          {{ t("schedules.stats.today") }}
        </p>
        <p class="mt-2 text-2xl font-semibold tabular-nums text-text">
          {{ formatDuration(todaySeconds) }}
        </p>
        <p class="mt-1 text-xs text-text-2">
          <span v-if="isRunning" class="text-accent">
            {{ t("schedules.stats.runningNow") }}
          </span>
          <span v-else>{{ t("schedules.stats.todayHint") }}</span>
        </p>
      </article>

      <article class="rounded-[var(--radius)] border border-border bg-surface p-5">
        <p class="text-xs font-medium uppercase tracking-wide text-text-2">
          {{ t("schedules.stats.week") }}
        </p>
        <p class="mt-2 text-2xl font-semibold tabular-nums text-text">
          {{ formatDuration(weekSeconds) }}
        </p>
        <p class="mt-1 text-xs text-text-2">{{ t("schedules.stats.weekHint") }}</p>
      </article>

      <article class="rounded-[var(--radius)] border border-border bg-surface p-5">
        <p class="text-xs font-medium uppercase tracking-wide text-text-2">
          {{ t("schedules.stats.longest") }}
        </p>
        <p class="mt-2 text-2xl font-semibold tabular-nums text-text">
          {{ longest ? formatDuration(longest.durationSeconds ?? 0) : "0m 00s" }}
        </p>
        <p class="mt-1 truncate text-xs text-text-2">
          {{ longest?.title ?? t("schedules.stats.noRuns") }}
        </p>
      </article>
    </div>

    <!-- Chart: the time of the range by type (PRD-v4 §8.5). -->
    <article class="mt-5 rounded-[var(--radius)] border border-border bg-surface p-6">
      <h2 class="text-base font-semibold text-text">
        {{ t("schedules.chart.title") }}
      </h2>
      <div class="mt-4">
        <TimeDonut :slices="chartSlices" />
      </div>
    </article>

    <!-- Detail by day (PRD-v2 §8.4.3): search + filters by type,
         category and task. -->
    <article class="mt-5 rounded-[var(--radius)] border border-border bg-surface p-6">
      <div class="flex flex-wrap items-center justify-between gap-3">
        <h2 class="text-base font-semibold text-text">
          {{ t("schedules.detail.title") }}
        </h2>
        <div class="flex flex-wrap items-center gap-2">
          <input
            v-model="detailSearch"
            type="search"
            :placeholder="t('schedules.detail.search')"
            class="h-9 w-full max-w-48 rounded-full border border-border bg-surface px-3 text-sm text-text outline-none transition-colors placeholder:text-text-2 focus:border-accent"
            data-testid="detail-search"
          />
          <select
            v-model="detailTypeId"
            class="h-9 rounded-full border border-border bg-surface px-3 text-sm text-text outline-none transition-colors focus:border-accent"
            data-testid="detail-type-filter"
          >
            <option :value="null">{{ t("schedules.detail.allTypes") }}</option>
            <option v-for="[id, name] in typeNames" :key="id" :value="id">
              {{ name }}
            </option>
          </select>
          <select
            v-model="detailCategoryId"
            class="h-9 rounded-full border border-border bg-surface px-3 text-sm text-text outline-none transition-colors focus:border-accent"
            data-testid="detail-category-filter"
          >
            <option :value="null">
              {{ t("schedules.detail.allCategories") }}
            </option>
            <option v-for="[id, name] in categoryNames" :key="id" :value="id">
              {{ name }}
            </option>
          </select>
          <select
            v-model="detailTaskId"
            class="h-9 rounded-full border border-border bg-surface px-3 text-sm text-text outline-none transition-colors focus:border-accent"
            data-testid="detail-task-filter"
          >
            <option :value="null">{{ t("schedules.detail.allTasks") }}</option>
            <option v-for="task in taskList" :key="task.id" :value="task.id">
              {{ task.title }}
            </option>
          </select>
        </div>
      </div>

      <p
        v-if="detailGroups.length === 0"
        class="mt-4 rounded-[var(--radius)] border border-dashed border-border px-4 py-10 text-center text-sm text-text-2"
        data-testid="detail-empty"
      >
        {{ t("schedules.detail.empty") }}
      </p>

      <div v-else class="mt-4 space-y-6">
        <section
          v-for="group in detailGroups"
          :key="group.day"
          data-testid="detail-day"
        >
          <h3 class="text-sm font-semibold text-text">
            {{ formatDay(group.date) }}
          </h3>
          <ul class="mt-2 divide-y divide-border rounded-[var(--radius)] border border-border">
            <li
              v-for="item in group.runs"
              :key="item.id"
              class="flex flex-wrap items-center gap-3 px-4 py-3"
            >
              <div class="min-w-0 flex-1">
                <p class="truncate text-sm font-medium text-text">{{ item.title }}</p>
                <p class="truncate text-xs text-text-2">{{ runSubtitle(item) }}</p>
              </div>
              <span
                class="shrink-0 rounded-full bg-surface-2 px-2 py-0.5 text-xs text-text-2"
                data-testid="detail-origin"
              >
                {{
                  item.origin === "resumed"
                    ? t("schedules.origin.resumed")
                    : t("schedules.origin.manual")
                }}
              </span>
              <span class="shrink-0 text-sm tabular-nums text-text-2">
                {{ formatTimeRange(item) }}
              </span>
              <span class="shrink-0 text-sm font-medium tabular-nums text-text">
                {{ formatDuration(item.durationSeconds ?? 0) }}
              </span>
            </li>
          </ul>
        </section>
      </div>
    </article>

    <!-- History (PRD-v4 §8.5). -->
    <article class="mt-5 rounded-[var(--radius)] border border-border bg-surface p-6">
      <div class="flex flex-wrap items-center justify-between gap-3">
        <h2 class="text-base font-semibold text-text">
          {{ range === "hoy" ? t("schedules.history.today") : t("schedules.history.week") }}
        </h2>
        <div
          class="flex gap-1 rounded-full bg-surface-2 p-1"
          role="group"
          :aria-label="t('schedules.history.range')"
        >
          <button
            v-for="option in RANGES"
            :key="option"
            type="button"
            class="rounded-full px-3 py-1 text-xs transition-colors"
            :class="
              range === option
                ? 'bg-surface font-medium text-accent shadow-sm'
                : 'text-text-2 hover:text-text'
            "
            :aria-pressed="range === option"
            :data-testid="`schedules-range-${option}`"
            @click="range = option"
          >
            {{ t(`schedules.range.${option}`) }}
          </button>
        </div>
      </div>

      <p
        v-if="isLoading"
        class="mt-4 text-sm text-text-2"
        data-testid="schedules-loading"
      >
        {{ t("common.loading") }}
      </p>

      <p
        v-else-if="visibleRuns.length === 0"
        class="mt-4 rounded-[var(--radius)] border border-dashed border-border px-4 py-10 text-center text-sm text-text-2"
        data-testid="schedules-empty"
      >
        {{ t("schedules.history.empty") }}
      </p>

      <ul v-else class="mt-4 divide-y divide-border">
        <li
          v-for="item in visibleRuns"
          :key="item.id"
          class="flex flex-wrap items-center gap-3 py-3"
          data-testid="schedule-row"
        >
          <div class="min-w-0 flex-1">
            <p class="truncate text-sm font-medium text-text">{{ item.title }}</p>
            <p class="truncate text-xs text-text-2">{{ runSubtitle(item) }}</p>
          </div>
          <span class="shrink-0 text-sm tabular-nums text-text-2">
            {{ formatTimeRange(item) }}
          </span>
          <span class="shrink-0 text-sm font-medium tabular-nums text-text">
            {{ formatDuration(item.durationSeconds ?? 0) }}
          </span>
          <button
            type="button"
            :disabled="busy"
            class="grid size-8 shrink-0 place-items-center rounded-full text-text-2 transition-colors hover:bg-surface-2 hover:text-text disabled:opacity-60"
            :aria-label="t('schedules.history.restart')"
            :data-testid="`schedule-restart-${item.id}`"
            @click="onRestart(item)"
          >
            <PhArrowCounterClockwise :size="16" weight="regular" />
          </button>
          <button
            type="button"
            :disabled="busy"
            class="grid size-8 shrink-0 place-items-center rounded-full bg-primary-50 text-primary-700 transition-transform duration-100 ease-out hover:opacity-90 active:scale-95 disabled:opacity-60"
            :aria-label="t('schedules.history.resume')"
            :data-testid="`schedule-resume-${item.id}`"
            @click="onResume(item)"
          >
            <PhPlay :size="14" weight="fill" />
          </button>
        </li>
      </ul>

      <p
        v-if="visibleRuns.length > 0"
        class="mt-4 text-right text-sm font-medium text-accent"
        data-testid="schedules-total"
      >
        {{ t("schedules.history.total", { time: formatDuration(rangeTotalSeconds) }) }}
      </p>
    </article>
  </section>
</template>
