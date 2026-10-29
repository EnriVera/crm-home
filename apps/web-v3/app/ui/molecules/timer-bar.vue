<script setup lang="ts">
import { computed, ref, watch } from "vue";
import type { TimerRun } from "~/domain/schedule/entities";
import { formatDuration } from "~/domain/schedule/entities";
import { PhClock, PhPlay, PhSquare } from "~/shared/vendor/icons";

/**
 * Barra de timer (PRD-v4 §8.5).
 *
 * En reposo es un campo para escribir qué estás haciendo (timer libre) con
 * las tareas del usuario como autocompletado; corriendo muestra el
 * título, los chips de tipo/categoría, el reloj grande y el botón de
 * parar. El borde verde de 2px marca el estado activo.
 */
const props = defineProps<{
  run: TimerRun | null;
  elapsedSeconds: number;
  /** Titles of the user's tasks (native autocomplete for the free timer). */
  taskTitles: string[];
  typeName: string | null;
  categoryName: string | null;
  clientName: string | null;
  busy?: boolean | undefined;
}>();

const emit = defineEmits<{
  start: [title: string];
  stop: [];
}>();

const { t } = useI18n();

const title = ref("");

watch(
  () => props.run?.id,
  () => {
    if (!props.run) title.value = "";
  },
);

const isRunning = computed(() => props.run !== null);

/** "01:24:36" — the big clock of the bar. */
const clock = computed(() => {
  const total = Math.max(0, props.elapsedSeconds);
  const hours = String(Math.floor(total / 3600)).padStart(2, "0");
  const minutes = String(Math.floor((total % 3600) / 60)).padStart(2, "0");
  const seconds = String(total % 60).padStart(2, "0");
  return `${hours}:${minutes}:${seconds}`;
});

function onStart() {
  const trimmed = title.value.trim();
  if (!trimmed) return;
  emit("start", trimmed);
}
</script>

<template>
  <div
    class="flex flex-wrap items-center gap-3 rounded-full border-2 bg-surface px-5 py-3 transition-colors"
    :class="isRunning ? 'border-accent' : 'border-border'"
    data-testid="timer-bar"
  >
    <PhClock
      :size="20"
      weight="regular"
      class="shrink-0 text-text-2"
      aria-hidden="true"
    />

    <!-- Corriendo: el título y sus chips. -->
    <template v-if="isRunning">
      <p class="min-w-0 flex-1 truncate text-sm font-medium text-text">
        {{ run?.title }}
        <span v-if="clientName" class="text-text-2">· {{ clientName }}</span>
      </p>
      <span
        v-if="typeName"
        class="shrink-0 rounded-full bg-primary-50 px-2.5 py-1 text-xs font-medium text-primary-700"
        data-testid="timer-type-chip"
      >
        {{ typeName }}
      </span>
      <span
        v-if="categoryName"
        class="shrink-0 rounded-full bg-surface-2 px-2.5 py-1 text-xs font-medium text-text-2"
        data-testid="timer-category-chip"
      >
        {{ categoryName }}
      </span>
      <span
        class="shrink-0 font-semibold tabular-nums text-accent"
        data-testid="timer-clock"
      >
        {{ clock }}
      </span>
      <button
        type="button"
        :disabled="busy"
        class="grid size-10 shrink-0 place-items-center rounded-full bg-accent text-accent-fg transition-transform duration-100 ease-out hover:opacity-90 active:scale-95 disabled:opacity-60"
        :aria-label="t('schedules.stop')"
        data-testid="timer-stop"
        @click="emit('stop')"
      >
        <PhSquare :size="16" weight="fill" />
      </button>
    </template>

    <!-- En reposo: qué vas a hacer. -->
    <template v-else>
      <label class="min-w-0 flex-1">
        <span class="sr-only">{{ t("schedules.start") }}</span>
        <input
          v-model="title"
          type="text"
          list="timer-task-titles"
          :placeholder="t('schedules.startPlaceholder')"
          class="h-9 w-full rounded-full border border-border bg-surface px-4 text-sm text-text outline-none transition-colors placeholder:text-text-2 focus:border-accent"
          data-testid="timer-title-input"
          @keydown.enter.prevent="onStart"
        />
      </label>
      <datalist id="timer-task-titles">
        <option v-for="taskTitle in taskTitles" :key="taskTitle" :value="taskTitle" />
      </datalist>
      <button
        type="button"
        :disabled="busy || title.trim().length === 0"
        class="grid size-10 shrink-0 place-items-center rounded-full bg-accent text-accent-fg transition-transform duration-100 ease-out hover:opacity-90 active:scale-95 disabled:opacity-60"
        :aria-label="t('schedules.start')"
        data-testid="timer-start"
        @click="onStart"
      >
        <PhPlay :size="16" weight="fill" />
      </button>
    </template>
  </div>
</template>
