<script setup lang="ts">
/**
 * TaskCard — compact card for the Kanban column. Displays the task
 * title, optional client chip, and type / category chips. Emits
 * `click` so the parent (KanbanBoard) can open the EditTaskDrawer
 * in edit mode.
 *
 * The Task entity is camelCase and only carries ids for type /
 * category / client (no name fields), so the chips show a short id
 * prefix. Phase 2 will swap the id-only chips for named lookups
 * once the form listers are reused on the read side.
 */
import type { Task } from "@crm/contract/task";

defineProps<{
  task: Task;
}>();

defineEmits<{
  click: [];
}>();

function shortId(id: string): string {
  return id.slice(0, 6);
}
</script>

<template>
  <article
    class="flex cursor-pointer flex-col gap-2 rounded-md border border-zinc-200 bg-surface p-3 text-left transition hover:border-accent dark:border-zinc-800"
    role="button"
    tabindex="0"
    @click="$emit('click')"
    @keydown.enter="$emit('click')"
    @keydown.space.prevent="$emit('click')"
  >
    <h3 class="line-clamp-2 text-sm font-medium leading-snug text-text">
      {{ task.title }}
    </h3>
    <p
      v-if="task.description"
      class="line-clamp-2 text-xs text-text-2"
    >
      {{ task.description }}
    </p>
    <div class="flex flex-wrap items-center gap-1.5">
      <span
        v-if="task.clientId"
        class="inline-flex items-center rounded-md border border-zinc-200 bg-bg px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wide text-text-2 dark:border-zinc-800"
        title="Client id"
      >
        Client · {{ shortId(task.clientId) }}
      </span>
      <span
        class="inline-flex items-center rounded-md border border-zinc-200 bg-bg px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wide text-text-2 dark:border-zinc-800"
        title="Type id"
      >
        Type · {{ shortId(task.typeId) }}
      </span>
      <span
        v-if="task.categoryId"
        class="inline-flex items-center rounded-md border border-zinc-200 bg-bg px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wide text-text-2 dark:border-zinc-800"
        title="Category id"
      >
        Category · {{ shortId(task.categoryId) }}
      </span>
    </div>
  </article>
</template>