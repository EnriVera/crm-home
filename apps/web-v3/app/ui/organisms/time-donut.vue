<script setup lang="ts">
import { computed } from "vue";

/**
 * Donut de tiempo por tipo (PRD-v4 §8.5).
 *
 * Implementado en SVG propio y no con unovis: el wrapper Vue de unovis
 * (v1.7) no renderizaba los arcos del donut en esta app (quedaba el
 * anillo de fondo vacío). El SVG propio se controla entero, usa la paleta
 * de datos de los tokens (PRD-v4 §11.3) y no depende de la librería.
 */
const props = defineProps<{
  /** Una porción por tipo: { id, label, seconds, color }. */
  slices: { id: string; label: string; seconds: number; color: string }[];
}>();

const { t } = useI18n();

const SIZE = 100;
const STROKE = 18;
const RADIUS = (SIZE - STROKE) / 2;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

const total = computed(() =>
  props.slices.reduce((sum, slice) => sum + slice.seconds, 0),
);

/**
 * Cada porción como un tramo del anillo: el `stroke-dasharray` recorta
 * el círculo y el `stroke-dashoffset` lo desplaza al lugar que le toca.
 */
const arcs = computed(() => {
  let consumed = 0;
  return props.slices
    .filter((slice) => slice.seconds > 0)
    .map((slice) => {
      const portion = total.value > 0 ? slice.seconds / total.value : 0;
      const arc = {
        id: slice.id,
        label: slice.label,
        seconds: slice.seconds,
        color: slice.color,
        dasharray: `${portion * CIRCUMFERENCE} ${CIRCUMFERENCE}`,
        dashoffset: -consumed * CIRCUMFERENCE,
      };
      consumed += portion;
      return arc;
    });
});

/** "2h 10m" — el tiempo de la porción. */
function formatSlice(seconds: number): string {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  if (hours > 0) return `${hours}h ${String(minutes).padStart(2, "0")}m`;
  return `${minutes}m`;
}
</script>

<template>
  <div class="flex flex-wrap items-center gap-6">
    <div class="relative size-48 shrink-0" data-testid="time-donut">
      <svg
        viewBox="0 0 100 100"
        class="size-full -rotate-90"
        role="img"
        :aria-label="t('schedules.chart.title')"
      >
        <circle
          :cx="SIZE / 2"
          :cy="SIZE / 2"
          :r="RADIUS"
          fill="none"
          stroke="var(--color-surface-2)"
          :stroke-width="STROKE"
        />
        <circle
          v-for="arc in arcs"
          :key="arc.id"
          :cx="SIZE / 2"
          :cy="SIZE / 2"
          :r="RADIUS"
          fill="none"
          :stroke="arc.color"
          :stroke-width="STROKE"
          stroke-linecap="butt"
          :stroke-dasharray="arc.dasharray"
          :stroke-dashoffset="arc.dashoffset"
          data-testid="donut-arc"
        />
      </svg>
      <span
        class="absolute inset-0 grid place-items-center text-center text-sm font-semibold tabular-nums text-text"
        data-testid="donut-total"
      >
        {{ formatSlice(total) }}
      </span>
    </div>

    <!-- Leyenda propia: el tiempo real de cada porción. -->
    <ul class="min-w-0 flex-1 space-y-2" data-testid="time-donut-legend">
      <li
        v-for="slice in slices"
        :key="slice.id"
        class="flex items-center gap-2 text-sm"
      >
        <span
          class="size-2.5 shrink-0 rounded-full"
          :style="{ backgroundColor: slice.color }"
          aria-hidden="true"
        />
        <span class="min-w-0 flex-1 truncate text-text">{{ slice.label }}</span>
        <span class="shrink-0 tabular-nums text-text-2">
          {{ formatSlice(slice.seconds) }}
        </span>
      </li>
      <li
        v-if="slices.length === 0"
        class="text-sm text-text-2"
        data-testid="time-donut-empty"
      >
        {{ t("schedules.chart.empty") }}
      </li>
    </ul>
  </div>
</template>
