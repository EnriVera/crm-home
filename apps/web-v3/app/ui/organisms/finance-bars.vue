<script setup lang="ts">
import { computed } from "vue";
import {
  axisCeiling,
  formatCompact,
  monthOverMonth,
  type FinanceSeries,
} from "~/domain/dashboard/finance-chart";
import { formatAmount } from "~/domain/finance/entities";

/**
 * Ingresos vs gastos por mes (PRD-v2 §8.2 Fase 2; catálogo del
 * dashboard: "+12% vs. mayo").
 *
 * SVG propio, no unovis: el wrapper de unovis v1.7 no dibujaba los arcos
 * en esta app (ver `time-donut.vue`), y un gráfico de barras son rectángulos
 * que se controlan enteros.
 *
 * Los colores son los tokens SEMÁNTICOS (`--color-accent` y
 * `--color-error`), no los de la paleta de datos: la paleta de datos es
 * para los colores de tipos/categorías/estados (PRD-v4 §11.3), y el verde
 * de datos (#22c55e) sólo da 2.28:1 sobre superficie clara, por debajo
 * del 3:1 que exige WCAG 1.4.11 para elementos gráficos. Los tokens
 * semánticos cambian con el tema, así que el gráfico funciona en los dos.
 */
const props = defineProps<{
  /** Una serie por moneda; la pantalla elige cuál se mira. */
  series: FinanceSeries;
}>();

const { t } = useI18n();

const WIDTH = 320;
const HEIGHT = 170;
const PADDING_TOP = 12;
const PADDING_BOTTOM = 24;
const PADDING_LEFT = 40;
const PADDING_RIGHT = 8;

const PLOT_WIDTH = WIDTH - PADDING_LEFT - PADDING_RIGHT;
const PLOT_HEIGHT = HEIGHT - PADDING_TOP - PADDING_BOTTOM;

const months = computed(() => props.series.months);

/** El techo del eje: el mayor de los dos montos del período. */
const ceiling = computed(() =>
  axisCeiling(
    Math.max(
      0,
      ...props.series.months.flatMap((month) => [month.income, month.expense]),
    ),
  ),
);

/** Las líneas de guía (0, 25%, 50%, 75%, 100%). */
const gridLines = computed(() =>
  [0, 0.25, 0.5, 0.75, 1].map((portion) => ({
    y: PADDING_TOP + PLOT_HEIGHT * (1 - portion),
    label: formatCompact(ceiling.value * portion),
  })),
);

/**
 * Las barras de un mes: dos, juntas (ingreso y gasto).
 *
 * El ancho sale del espacio del mes menos el hueco entre las dos barras:
 * con seis meses la barra tiene que ser fina, pero legible.
 */
const bars = computed(() => {
  const slot = PLOT_WIDTH / Math.max(months.value.length, 1);
  const gap = Math.min(4, slot * 0.16);
  const barWidth = Math.max(3, Math.min(10, (slot - gap * 3) / 2));
  const height = (value: number) =>
    ceiling.value > 0 ? (value / ceiling.value) * PLOT_HEIGHT : 0;
  return months.value.map((month, index) => {
    const x = PADDING_LEFT + index * slot + (slot - (barWidth * 2 + gap)) / 2;
    const incomeHeight = height(month.income);
    const expenseHeight = height(month.expense);
    return {
      key: month.key,
      label: month.label,
      width: barWidth,
      income: {
        x,
        y: PADDING_TOP + PLOT_HEIGHT - incomeHeight,
        height: incomeHeight,
        value: month.income,
      },
      expense: {
        x: x + barWidth + gap,
        y: PADDING_TOP + PLOT_HEIGHT - expenseHeight,
        height: expenseHeight,
        value: month.expense,
      },
    };
  });
});

const incomeChange = computed(() => monthOverMonth(props.series, "income"));

/** "+12%" / "−8%": el cambio contra el mes anterior. */
function formatChange(value: number | null): string {
  if (value === null) return "";
  const rounded = Math.round(value);
  if (rounded === 0) return "0%";
  return `${rounded > 0 ? "+" : "−"}${Math.abs(rounded)}%`;
}
</script>

<template>
  <div class="space-y-4" data-testid="finance-chart">
    <div class="flex flex-wrap items-center gap-x-5 gap-y-2">
      <span class="flex items-center gap-2 text-sm text-text-2">
        <span
          class="size-2.5 rounded-full bg-[var(--color-accent)]"
          aria-hidden="true"
        />
        {{ t("dashboard.chart.income") }}
      </span>
      <span class="flex items-center gap-2 text-sm text-text-2">
        <span
          class="size-2.5 rounded-full bg-[var(--color-error)]"
          aria-hidden="true"
        />
        {{ t("dashboard.chart.expense") }}
      </span>
      <span
        v-if="incomeChange !== null"
        class="ml-auto text-sm tabular-nums text-text-2"
        data-testid="finance-chart-change"
      >
        {{ t("dashboard.chart.vsPrevious") }}
        <span class="font-medium text-text">
          {{ formatChange(incomeChange) }}
        </span>
      </span>
    </div>

    <svg
      :viewBox="`0 0 ${WIDTH} ${HEIGHT}`"
      class="w-full"
      role="img"
      :aria-label="
        t('dashboard.chart.ariaLabel', {
          currency: series.symbol,
          income: formatAmount(series.totalIncome),
          expense: formatAmount(series.totalExpense),
        })
      "
    >
      <!-- Gridlines: the reading aid of the axis. -->
      <g>
        <line
          v-for="line in gridLines"
          :key="`grid-${line.y}`"
          :x1="PADDING_LEFT"
          :x2="WIDTH - PADDING_RIGHT"
          :y1="line.y"
          :y2="line.y"
          stroke="var(--color-border)"
          stroke-width="1"
        />
        <text
          v-for="line in gridLines"
          :key="`label-${line.y}`"
          :x="PADDING_LEFT - 6"
          :y="line.y + 3"
          text-anchor="end"
          class="fill-[var(--color-text-2)] text-[8px]"
        >
          {{ line.label }}
        </text>
      </g>

      <!-- Bars: income and expense of every month, side by side. -->
      <g>
        <g v-for="month in bars" :key="month.key">
          <rect
            :x="month.income.x"
            :y="month.income.y"
            :height="month.income.height"
            :width="month.width"
            rx="2"
            fill="var(--color-accent)"
            data-testid="finance-bar-income"
          >
            <title>
              {{ month.label }} · {{ t("dashboard.chart.income") }}:
              {{ formatAmount(month.income.value) }}
            </title>
          </rect>
          <rect
            :x="month.expense.x"
            :y="month.expense.y"
            :height="month.expense.height"
            :width="month.width"
            rx="2"
            fill="var(--color-error)"
            data-testid="finance-bar-expense"
          >
            <title>
              {{ month.label }} · {{ t("dashboard.chart.expense") }}:
              {{ formatAmount(month.expense.value) }}
            </title>
          </rect>
          <text
            :x="month.income.x + month.width"
            :y="HEIGHT - 8"
            text-anchor="middle"
            class="fill-[var(--color-text-2)] text-[8px]"
          >
            {{ month.label }}
          </text>
        </g>
      </g>
    </svg>
  </div>
</template>
