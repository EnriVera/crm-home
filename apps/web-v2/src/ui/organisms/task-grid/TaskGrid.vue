<script setup lang="ts">
/**
 * TaskGrid — simple HTML table view of the task list. No sort,
 * no filter, no virtualization (phase 2). Row click emits `select`
 * with the task id so the parent can open the EditTaskDrawer.
 *
 * The Task entity is camelCase and only carries ids, so the table
 * shows short id prefixes for client / type / category / state.
 */
import type { Task } from "@crm/contract/task";

defineProps<{
  tasks: Task[];
}>();

const emit = defineEmits<{
  select: [taskId: Task["id"]];
}>();

function shortId(id: string): string {
  return id.slice(0, 8);
}

function formatUpdated(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return iso;
  return date.toLocaleString();
}
</script>

<template>
  <div class="overflow-hidden rounded-lg border border-zinc-200 bg-surface dark:border-zinc-800">
    <table class="w-full text-sm">
      <thead class="bg-bg text-xs uppercase tracking-wide text-text-2">
        <tr>
          <th class="px-3 py-2 text-left font-medium">Title</th>
          <th class="px-3 py-2 text-left font-medium">Client</th>
          <th class="px-3 py-2 text-left font-medium">Type</th>
          <th class="px-3 py-2 text-left font-medium">Category</th>
          <th class="px-3 py-2 text-left font-medium">State</th>
          <th class="px-3 py-2 text-left font-medium">Updated</th>
        </tr>
      </thead>
      <tbody>
        <tr
          v-for="task in tasks"
          :key="task.id"
          class="cursor-pointer border-t border-zinc-200 hover:bg-zinc-50 focus:bg-zinc-50 focus:outline-none dark:border-zinc-800 dark:hover:bg-zinc-800/40 dark:focus:bg-zinc-800/40"
          tabindex="0"
          @click="emit('select', task.id)"
          @keydown.enter="emit('select', task.id)"
        >
          <td class="px-3 py-2 font-medium">{{ task.title }}</td>
          <td class="px-3 py-2 text-text-2">
            {{ task.clientId ? shortId(task.clientId) : "—" }}
          </td>
          <td class="px-3 py-2 text-text-2">{{ shortId(task.typeId) }}</td>
          <td class="px-3 py-2 text-text-2">
            {{ task.categoryId ? shortId(task.categoryId) : "—" }}
          </td>
          <td class="px-3 py-2 text-text-2">{{ shortId(task.taskStateId) }}</td>
          <td class="px-3 py-2 text-text-2">{{ formatUpdated(task.updatedAt) }}</td>
        </tr>
        <tr v-if="tasks.length === 0">
          <td colspan="6" class="px-3 py-8 text-center text-sm text-text-2">
            No tasks
          </td>
        </tr>
      </tbody>
    </table>
  </div>
</template>