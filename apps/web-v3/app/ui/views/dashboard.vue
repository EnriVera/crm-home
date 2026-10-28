<script setup lang="ts">
import { computed, onMounted } from "vue";
import { stateNameOf } from "~/domain/task/dashboard";
import { PhCheckSquare, PhClock } from "~/shared/vendor/icons";
import { useDashboard } from "~/shared/composables/use-dashboard";

const { t } = useI18n();
const { tallies, recentTasks, totalTasks, isEmpty, isLoading, error, load, states } =
  useDashboard();

onMounted(() => {
  void load();
});

const today = computed(() =>
  new Intl.DateTimeFormat("es", { dateStyle: "long" }).format(new Date()),
);

function stateName(stateId: string) {
  return stateNameOf(states.value, stateId) ?? "";
}

function updatedAt(date: Date) {
  return new Intl.DateTimeFormat("es", { dateStyle: "medium" }).format(date);
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
        class="rounded bg-accent px-4 py-2 text-sm font-semibold text-accent-fg transition duration-100 ease-out hover:bg-accent-hover active:scale-[0.97]"
      >
        {{ t("dashboard.newTask") }}
      </NuxtLink>
    </header>

    <!-- The timer card is conditional in the catalogue (PRD-v4 §8.3): there is
         no timer in the API, so it renders as the empty CTA that PRD-v2 §8.2
         asks for instead of inventing a running timer. -->
    <article
      class="mt-6 rounded-lg border border-border bg-surface p-5"
      data-testid="dashboard-timer"
    >
      <h2 class="text-sm font-medium text-text-2">{{ t("dashboard.timerTitle") }}</h2>
      <p class="mt-2 text-sm text-text-2">{{ t("dashboard.timerIdle") }}</p>
      <NuxtLink
        to="/schedules"
        class="mt-3 inline-flex items-center gap-2 text-sm font-medium text-accent hover:underline"
      >
        <span
          class="grid size-8 place-items-center rounded-full bg-primary-50 text-primary-700"
          aria-hidden="true"
        >
          <PhClock :size="16" weight="bold" />
        </span>
        {{ t("dashboard.timerCta") }}
      </NuxtLink>
    </article>

    <!-- Task counts per column: the MVP dashboard of PRD-v2 §8.2. -->
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
          class="rounded-lg border border-border bg-surface p-5"
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

    <!-- Latest tasks (PRD-v2 §8.2: the five most recently updated ones). -->
    <section class="mt-6" aria-labelledby="dashboard-recent-title">
      <div class="flex items-baseline justify-between gap-4">
        <h2
          id="dashboard-recent-title"
          class="text-sm font-semibold uppercase tracking-wide text-text-2"
        >
          {{ t("dashboard.recentTitle") }}
        </h2>
        <NuxtLink
          to="/tasks"
          class="text-sm font-medium text-accent hover:underline"
        >
          {{ t("dashboard.viewAll") }}
        </NuxtLink>
      </div>

      <div
        class="mt-3 rounded-lg border border-border bg-surface"
        data-testid="dashboard-recent"
      >
        <p v-if="isLoading" class="px-5 py-4 text-sm text-text-2">
          {{ t("common.loading") }}
        </p>
        <p v-else-if="error" class="px-5 py-4 text-sm text-error">
          {{ t(error) }}
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
              <p class="mt-0.5 text-xs text-text-2">
                {{ t("dashboard.updatedAt", { date: updatedAt(task.updatedAt) }) }}
              </p>
            </div>
            <span
              class="shrink-0 rounded-full bg-surface-2 px-2 py-0.5 text-xs font-medium text-text-2"
            >
              {{ stateName(task.stateId) }}
            </span>
          </li>
        </ul>
      </div>
    </section>

    <!-- Empty state (PRD-v2 §8.2: never a blank screen). -->
    <div
      v-if="!isLoading && isEmpty"
      class="mt-6 rounded-lg border border-border bg-surface p-8 text-center"
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
          class="rounded bg-accent px-4 py-2 text-sm font-semibold text-accent-fg transition duration-100 ease-out hover:bg-accent-hover"
        >
          {{ t("dashboard.emptyCreateTask") }}
        </NuxtLink>
        <NuxtLink
          to="/schedules"
          class="rounded border border-border px-4 py-2 text-sm font-medium text-text transition-colors hover:bg-surface-2"
        >
          {{ t("dashboard.emptyStartTimer") }}
        </NuxtLink>
      </div>
    </div>
  </section>
</template>
