<script setup lang="ts">
/**
 * BaseView — generic page chrome used by list pages. Renders a
 * header with a title, an actions slot (for buttons like "+ New"),
 * a kanban/grid view switcher bound via v-model:viewMode, an
 * optional filter slot, and a body slot for the page content.
 *
 * Props:
 *   - title: page title shown in the header
 *   - viewMode: 'kanban' | 'grid' bound through v-model:viewMode
 *
 * Slots:
 *   - actions: right-aligned header buttons
 *   - filter: thin row between header and body
 *   - default: page body
 *
 * Design tokens only; no raw hex.
 */
type ViewMode = "kanban" | "grid";

defineProps<{
  title: string;
  viewMode: ViewMode;
}>();

const emit = defineEmits<{
  "update:viewMode": [mode: ViewMode];
}>();

function setMode(mode: ViewMode) {
  emit("update:viewMode", mode);
}
</script>

<template>
  <div class="flex h-full flex-col">
    <header class="flex flex-wrap items-center justify-between gap-3 border-b border-zinc-200 pb-4 dark:border-zinc-800">
      <div class="flex min-w-0 flex-col gap-1">
        <h1 class="text-2xl font-semibold tracking-tight">{{ title }}</h1>
      </div>
      <div class="flex items-center gap-2">
        <slot name="actions" />
        <div
          class="inline-flex rounded-md border border-zinc-200 bg-surface p-0.5 dark:border-zinc-800"
          role="group"
          aria-label="View mode"
        >
          <button
            type="button"
            class="rounded-md px-2.5 py-1 text-xs font-medium transition"
            :class="
              viewMode === 'kanban'
                ? 'bg-zinc-100 text-text dark:bg-zinc-800'
                : 'text-text-2 hover:text-text'
            "
            :aria-pressed="viewMode === 'kanban'"
            @click="setMode('kanban')"
          >
            Kanban
          </button>
          <button
            type="button"
            class="rounded-md px-2.5 py-1 text-xs font-medium transition"
            :class="
              viewMode === 'grid'
                ? 'bg-zinc-100 text-text dark:bg-zinc-800'
                : 'text-text-2 hover:text-text'
            "
            :aria-pressed="viewMode === 'grid'"
            @click="setMode('grid')"
          >
            Grid
          </button>
        </div>
      </div>
    </header>
    <div
      v-if="$slots.filter"
      class="border-b border-zinc-200 py-3 dark:border-zinc-800"
    >
      <slot name="filter" />
    </div>
    <div class="min-h-0 flex-1 pt-4">
      <slot />
    </div>
  </div>
</template>