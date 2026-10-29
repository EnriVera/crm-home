<script setup lang="ts">
import { computed, onMounted, ref } from "vue";
import { stateNameOf } from "~/domain/task/dashboard";
import { formatRelativeTime, recentActivity } from "~/domain/dashboard/summary";
import { PhCheckSquare, PhTimer } from "~/shared/vendor/icons";
import { useDashboard } from "~/shared/composables/use-dashboard";
import { useTimer } from "~/shared/composables/use-timer";
import TimerBar from "~/ui/molecules/timer-bar.vue";

const { t, locale } = useI18n();
const {
  tallies,
  recentTasks,
  totalTasks,
  states,
  clients,
  types,
  categories,
  isEmpty,
  isLoading,
  error,
  load,
  currencySymbol,
  monthIncome,
  monthExpense,
  formatMoney,
} = useDashboard();

// The timer: the same composable as /schedules, so the dashboard clock
// cannot drift from the timer screen (PRD-v4 §8.3: the "Timer activo" card).
const { run, history, elapsedSeconds, sync, stop } = useTimer();
const activity = computed(() => recentActivity(history.value));

const stopping = ref(false);

onMounted(async () => {
  await Promise.all([load(), sync()]);
});

const today = computed(() =>
  new Intl.DateTimeFormat(locale.value, { dateStyle: "long" }).format(new Date()),
);

function stateName(stateId: string) {
  return stateNameOf(states.value, stateId) ?? "";
}

const clientNameById = computed(
  () => new Map(clients.value.map((client) => [client.id, client.name])),
);
const typeNameById = computed(
  () => new Map(types.value.map((type) => [type.id, type.name])),
);
const categoryNameById = computed(
  () => new Map(categories.value.map((category) => [category.id, category.name])),
);

async function onStop() {
  stopping.value = true;
  try {
    await stop();
    await load();
  } finally {
    stopping.value = false;
  }
}
</script>

<template>
  <section class="mx-auto w-full max-w-5xl">
    <header class="flex flex-wrap items-start justify-between gap-4">
      <div>
        <h1 class="text-2xl font-semibold tracking-tight text-text">
          {{ t("dashboard.title") }}
        </h1>
        <p class="mt-1 text-sm text-text-2">
          {{ t("dashboard.subtitle", { date: today }) }}
        </p>
      </div>
      <NuxtLink
        to="/tasks"
        class="rounded-[var(--radius)] bg-accent px-4 py-2 text-sm font-semibold text-accent-fg transition duration-100 ease-out hover:bg-accent-hover active:scale-[0.97]"
      >
        {{ t("dashboard.newTask") }}
      </NuxtLink>
    </header>

    <p v-if="error" class="mt-4 text-sm text-error" data-testid="dashboard-error">
      {{ t(error) }}
    </p>

    <!-- An empty dashboard explains what to do (PRD-v2 §8.2). -->
    <div
      v-if="!isLoading && isEmpty"
      class="mt-6 rounded-[var(--radius)] border border-border bg-surface p-8 text-center"
      data-testid="dashboard-empty"
    >
      <span
        class="mx-auto grid size-12 place-items-center rounded-full bg-primary-50 text-primary-700"
        aria-hidden="true"
      >
        <PhCheckSquare :size="24" weight="bold" />
      </span>
      <h2 class="mt-4 text-base font-semibold text-text">
        {{ t("dashboard.emptyTitle") }}
      </h2>
      <div class="mt-4 flex flex-wrap justify-center gap-3">
        <NuxtLink
          to="/tasks"
          class="rounded-[var(--radius)] bg-accent px-4 py-2 text-sm font-semibold text-accent-fg transition duration-100 ease-out hover:bg-accent-hover"
        >
          {{ t("dashboard.emptyCreateTask") }}
        </NuxtLink>
        <NuxtLink
          to="/schedules"
          class="rounded-[var(--radius)] border border-border px-4 py-2 text-sm font-medium text-text transition-colors hover:bg-surface-2"
        >
          {{ t("dashboard.emptyStartTimer") }}
        </NuxtLink>
      </div>
    </div>
    <!-- The timer card only shows when there is a running timer,
         PRD-v4 §8.3 — absence of data, not a placeholder). -->
    <article
      v-if="run"
      class="mt-6"
      data-testid="dashboard-timer"
    >
      <h2 class="mb-2 text-sm font-medium uppercase tracking-wide text-text-2">
        {{ t("dashboard.timerTitle") }}
      </h2>
      <TimerBar
        :run="run"
        :elapsed-seconds="elapsedSeconds"
        :type-name="run.typeId ? (typeNameById.get(run.typeId) ?? null) : null"
        :category-name="run.categoryId ? (categoryNameById.get(run.categoryId) ?? null) : null"
        :client-name="run.clientId ? (clientNameById.get(run.clientId) ?? null) : null"
        :busy="stopping"
        @stop="onStop"
      />
    </article>

    <!-- The month in numbers (PRD-v4 §8.3). -->
    <section
      class="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4"
      :aria-label="t('dashboard.stats.ariaLabel')"
      data-testid="dashboard-stats"
    >
      <article class="rounded-[var(--radius)] border border-border bg-surface p-5">
        <p class="text-xs font-medium uppercase tracking-wide text-text-2">
          {{ t("dashboard.stats.income") }}
        </p>
        <p class="mt-2 text-2xl font-semibold tabular-nums text-text">
          {{ formatMoney(monthIncome, currencySymbol) }}
        </p>
        <p class="mt-1 text-xs text-text-2">
          {{ t("dashboard.stats.incomeHint") }}
        </p>
      </article>

      <article class="rounded-[var(--radius)] border border-border bg-surface p-5">
        <p class="text-xs font-medium uppercase tracking-wide text-text-2">
          {{ t("dashboard.stats.expense") }}
        </p>
        <p class="mt-2 text-2xl font-semibold tabular-nums text-text">
          {{ formatMoney(monthExpense, currencySymbol) }}
        </p>
        <p class="mt-1 text-xs text-text-2">
          {{ t("dashboard.stats.expenseHint") }}
        </p>
      </article>

      <article class="rounded-[var(--radius)] border border-border bg-surface p-5">
        <p class="text-xs font-medium uppercase tracking-wide text-text-2">
          {{ t("dashboard.stats.activeTasks") }}
        </p>
        <p class="mt-2 text-2xl font-semibold tabular-nums text-text">
          {{ totalTasks }}
        </p>
        <p class="mt-1 text-xs text-text-2">
          {{ t("dashboard.stats.tasksHint") }}
        </p>
      </article>

      <article class="rounded-[var(--radius)] border border-border bg-surface p-5">
        <p class="text-xs font-medium uppercase tracking-wide text-text-2">
          {{ t("dashboard.stats.clients") }}
        </p>
        <p class="mt-2 text-2xl font-semibold tabular-nums text-text">
          {{ clients.length }}
        </p>
        <p class="mt-1 text-xs text-text-2">
          {{ t("dashboard.stats.clientsHint") }}
        </p>
      </article>
    </section>

    <div class="mt-6 grid gap-4 lg:grid-cols-3">
      <!-- The tasks that come next (2/3 of the width). -->
      <section class="lg:col-span-2" aria-labelledby="dashboard-recent-title">
        <div class="flex items-baseline justify-between gap-4">
          <h2
            id="dashboard-recent-title"
            class="text-sm font-semibold uppercase tracking-wide text-text-2"
          >
            {{ t("dashboard.upcomingTitle") }}
          </h2>
          <NuxtLink
            to="/tasks"
            class="text-sm font-medium text-accent hover:underline"
          >
            {{ t("dashboard.viewAll") }}
          </NuxtLink>
        </div>

        <div
          class="mt-3 rounded-[var(--radius)] border border-border bg-surface"
          data-testid="dashboard-recent"
        >
          <p v-if="isLoading" class="px-5 py-4 text-sm text-text-2">
            {{ t("common.loading") }}
          </p>
          <p v-else-if="recentTasks.length === 0" class="px-5 py-4 text-sm text-text-2">
            {{ t("dashboard.recentEmpty") }}
          </p>
          <ul v-else>
            <li
              v-for="task in recentTasks"
              :key="task.id"
              class="flex items-center justify-between gap-4 border-b border-border px-5 py-3 last:border-b-0"
            >
              <div class="min-w-0">
                <p class="truncate text-sm font-medium text-text">{{ task.title }}</p>
                <p class="mt-0.5 truncate text-xs text-text-2">
                  {{ task.clientId ? (clientNameById.get(task.clientId) ?? "") : "" }}
                  <span v-if="task.clientId && task.typeId"> · </span>
                  {{ task.typeId ? (typeNameById.get(task.typeId) ?? "") : "" }}
                </p>
              </div>
              <span
                v-if="task.categoryId"
                class="shrink-0 rounded-full bg-primary-50 px-2 py-0.5 text-xs font-medium text-primary-700"
              >
                {{ categoryNameById.get(task.categoryId) }}
              </span>
              <span
                class="shrink-0 rounded-full bg-surface-2 px-2 py-0.5 text-xs font-medium text-text-2"
              >
                {{ stateName(task.stateId) }}
              </span>
            </li>
          </ul>
        </div>
      </section>

      <!-- The last movements of the timer (1/3 of the width). -->
      <section aria-labelledby="dashboard-activity-title">
        <h2
          id="dashboard-activity-title"
          class="text-sm font-semibold uppercase tracking-wide text-text-2"
        >
          {{ t("dashboard.activityTitle") }}
        </h2>
        <div
          class="mt-3 rounded-[var(--radius)] border border-border bg-surface p-5"
          data-testid="dashboard-activity"
        >
          <p v-if="activity.length === 0" class="text-sm text-text-2">
            {{ t("dashboard.activityEmpty") }}
          </p>
          <ul v-else class="space-y-4">
            <li
              v-for="item in activity"
              :key="item.id"
              class="flex items-start gap-3"
            >
              <span
                class="grid size-8 shrink-0 place-items-center rounded-full bg-primary-50 text-primary-700"
                aria-hidden="true"
              >
                <PhTimer :size="15" weight="bold" />
              </span>
              <div class="min-w-0">
                <p class="truncate text-sm text-text">
                  {{ t("dashboard.activityTimer", { title: item.title }) }}
                </p>
                <p class="mt-0.5 text-xs text-text-2">
                  {{ formatRelativeTime(item.when) }}
                </p>
              </div>
            </li>
          </ul>
        </div>
      </section>
    </div>

    <!-- How many tasks each column has (PRD-v2 §8.2). -->
    <section class="mt-6" aria-labelledby="dashboard-states-title">
      <div class="flex items-baseline justify-between gap-4">
        <h2
          id="dashboard-states-title"
          class="text-sm font-semibold uppercase tracking-wide text-text-2"
        >
          {{ t("dashboard.statesTitle") }}
        </h2>
        <p class="text-sm text-text-2">
          {{ t("dashboard.totalTasks", { count: totalTasks }) }}
        </p>
      </div>

      <div
        class="mt-3 grid gap-4 sm:grid-cols-2 lg:grid-cols-3"
        data-testid="dashboard-tallies"
      >
        <article
          v-for="tally in tallies"
          :key="tally.state.id"
          class="rounded-[var(--radius)] border border-border bg-surface p-5"
        >
          <p class="text-xs font-medium uppercase tracking-wide text-text-2">
            {{ tally.state.name }}
          </p>
          <p class="mt-2 text-2xl font-semibold tabular-nums text-text">
            {{ tally.count }}
          </p>
        </article>
      </div>
    </section>

  </section>
</template>
