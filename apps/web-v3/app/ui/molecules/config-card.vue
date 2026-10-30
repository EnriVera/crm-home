<script setup lang="ts">
import { PhPencilSimple } from "~/shared/vendor/icons";
import ConfigDeleteAction from "~/ui/molecules/config-delete-action.vue";

/**
 * Entity card of the /config grids (PRD-v4 §8.8: tipos / categorías /
 * estados / monedas). Name + secondary line + edit/delete actions.
 *
 * The catalogue draws a colored dot and a "⋯" menu; the API stores no
 * color, and a destructive action hidden behind a menu is worse than two
 * explicit icon buttons, so the card shows what the data supports.
 */
defineProps<{
  name: string;
  /** Secondary line (modules, parent type, decimals…). */
  subtitle: string;
  /** The label of the edit action; undefined hides it (read-only records). */
  editLabel?: string | undefined;
  /** The labels of the delete confirmation; undefined hides the delete. */
  deleteLabels?: DeleteLabels | undefined;
}>();

export interface DeleteLabels {
  action: string;
  confirm: string;
  question: string;
  cancel: string;
}

const emit = defineEmits<{
  edit: [];
  remove: [];
}>();
</script>

<template>
  <article
    class="flex flex-col rounded-[var(--radius)] border border-border bg-surface p-5 transition-[border-color,transform] duration-150 ease-out hover:-translate-y-px hover:border-primary-300"
    data-testid="config-card"
  >
    <div class="flex items-start justify-between gap-2">
      <div class="min-w-0">
        <p class="truncate text-sm font-medium text-text">{{ name }}</p>
        <p class="mt-1 truncate text-xs text-text-2">{{ subtitle }}</p>
      </div>
      <div v-if="editLabel || deleteLabels" class="flex shrink-0 gap-1">
        <button
          v-if="editLabel"
          type="button"
          class="rounded p-1 text-text-2 transition-colors hover:bg-surface-2 hover:text-text"
          :aria-label="editLabel"
          data-testid="config-card-edit"
          @click="emit('edit')"
        >
          <PhPencilSimple :size="15" weight="regular" aria-hidden="true" />
        </button>
        <ConfigDeleteAction
          v-if="deleteLabels"
          :delete-label="deleteLabels.action"
          :delete-confirm="deleteLabels.question"
          :confirm-label="deleteLabels.confirm"
          :cancel-label="deleteLabels.cancel"
          @remove="emit('remove')"
        />
      </div>
    </div>
    <slot />
  </article>
</template>

