import { computed, ref } from "vue";
import {
  listAllCategories,
  listTaskTypes,
  listTasks,
} from "~/infrastructure/task/orpc-task";
import { listClients } from "~/infrastructure/client/orpc-client";

/**
 * useScheduleFilters: the catalogs the /schedules screen needs (PRD-v4 §8.5).
 *
 * The screen shows the task, type, category and client names of every run,
 * and offers them as filters. The data is loaded once and kept in maps:
 * the view only reads them.
 */
export function useScheduleFilters() {
  const taskList = ref<{ id: string; title: string }[]>([]);
  const typeNames = ref(new Map<string, string>());
  const categoryNames = ref(new Map<string, string>());
  const clientNames = ref(new Map<string, string>());
  const isLoading = ref(false);
  const error = ref<string | null>(null);

  /** The titles the timer bar offers as autocomplete. */
  const taskTitles = computed(() => taskList.value.map((task) => task.title));

  async function load() {
    isLoading.value = true;
    error.value = null;
    try {
      const [tasks, types, categories, clients] = await Promise.all([
        listTasks(),
        listTaskTypes(),
        listAllCategories(),
        listClients(),
      ]);
      taskList.value = tasks.map((task) => ({ id: task.id, title: task.title }));
      typeNames.value = new Map(types.map((type) => [type.id, type.name]));
      categoryNames.value = new Map(
        categories.map((category) => [category.id, category.name]),
      );
      clientNames.value = new Map(clients.map((client) => [client.id, client.name]));
    } catch {
      // Los nombres no llegan: la pantalla los muestra vacíos y el error
      // queda a la vista (no se traga la excepción).
      error.value = "schedules.loadError";
    } finally {
      isLoading.value = false;
    }
  }

  return {
    taskList,
    taskTitles,
    typeNames,
    categoryNames,
    clientNames,
    isLoading,
    error,
    load,
  };
}
