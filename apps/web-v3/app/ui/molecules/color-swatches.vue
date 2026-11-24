<script setup lang="ts">
import { computed } from "vue";
import {
  DATA_COLOR_TOKENS,
  dataColorVar,
  type DataColorToken,
} from "~/domain/config/entities";

/**
 * Los 8 swatches de color de dato (PRD-v4 §9.2: "Color (8 swatches; el
 * seleccionado con ring verde)").
 *
 * El color es un TOKEN del design system, no un hex: el swatch dibuja
 * `var(--color-data-*)` y el valor que viaja al API es el token
 * ("data-blue"), que el contrato zod valida contra el mismo set cerrado.
 */
const props = defineProps<{
  /** El token elegido; null = sin color. */
  modelValue: string | null;
  /** Si el usuario puede dejar el registro sin color. */
  nullable?: boolean;
}>();

const emit = defineEmits<{
  "update:modelValue": [value: string | null];
}>();

const { t } = useI18n();

const tokens = computed(() => DATA_COLOR_TOKENS);

function isSelected(token: DataColorToken): boolean {
  return props.modelValue === token;
}

function select(token: DataColorToken): void {
  emit("update:modelValue", isSelected(token) ? null : token);
}

function clear(): void {
  emit("update:modelValue", null);
}
</script>

<template>
  <div>
    <span class="mb-1.5 block text-sm font-medium text-text">
      {{ t("config.drawer.color") }}
    </span>
    <div class="flex flex-wrap items-center gap-2" role="group" :aria-label="t('config.drawer.color')">
      <button
        v-for="token in tokens"
        :key="token"
        type="button"
        class="size-7 rounded-full border-2 transition-transform duration-150 ease-out hover:scale-110 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
        :class="isSelected(token) ? 'border-accent ring-2 ring-accent ring-offset-2' : 'border-transparent'"
        :style="{ backgroundColor: dataColorVar(token) }"
        :aria-pressed="isSelected(token)"
        :aria-label="t('config.drawer.colorOption', { color: token })"
        :data-testid="`color-swatch-${token}`"
        @click="select(token)"
      />
      <button
        v-if="nullable && modelValue"
        type="button"
        class="rounded-full border border-border px-2 py-1 text-xs text-text-2 transition-colors hover:bg-surface-2 hover:text-text focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
        data-testid="color-clear"
        @click="clear"
      >
        {{ t("config.drawer.colorNone") }}
      </button>
    </div>
  </div>
</template>
