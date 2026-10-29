import { computed, ref } from "vue";
import {
  moveNeighbors,
  tasksByColumn,
  type Task,
  type TaskColumn,
} from "~/domain/task/entities";
import {
  createTask,
  listAllCategories,
  listTaskColumns,
  listTasks,
  listTaskTypes,
  moveTask,
  removeTask,
  updateTask,
  type CategoryOption,
  type ClientOption,
  type TaskUpdateInput,
  type TypeOption,
} from "~/infrastructure/task/orpc-task";
import { listClients } from "~/infrastructure/client/orpc-client";

/**
 * useTasks: the /tasks screen state (PRD-v4 §8.4).
 *
 * Loads the board (columns + tasks) plus the lookup maps the cards and
 * the drawer need (clients, types, categories). The wire task references
 * client/type/category by id only, so the names resolve here.
 *
 * Moves are optimistic: the board updates locally first, and a failed
 * `move` rolls back to the snapshot taken before the drag.
 */
export function useTasks() {
  const tasks = ref<Task[]>([]);
  const columns = ref<TaskColumn[]>([]);
  const clients = ref<ClientOption[]>([]);
  const types = ref<TypeOption[]>([]);
  const categories = ref<CategoryOption[]>([]);
  const isLoading = ref(false);
  const error = ref<string | null>(null);

  const board = computed(() => tasksByColumn(tasks.value, columns.value));

  const clientNameById = computed(
    () => new Map(clients.value.map((client) => [client.id, client.name])),
  );
  const typeNameById = computed(
    () => new Map(types.value.map((type) => [type.id, type.name])),
  );
  const categoryNameById = computed(
    () =>
      new Map(categories.value.map((category) => [category.id, category.name])),
  );

  async function load() {
    isLoading.value = true;
    error.value = null;
    try {
      const [taskList, columnList, clientList, typeList, categoryList] =
        await Promise.all([
          listTasks(),
          listTaskColumns(),
          listClients(),
          listTaskTypes(),
          listAllCategories(),
        ]);
      tasks.value = taskList;
      columns.value = columnList;
      clients.value = clientList.map((client) => ({
        id: client.id,
        name: client.name,
      }));
      types.value = typeList;
      categories.value = categoryList;
    } catch {
      error.value = "tasks.loadError";
    } finally {
      isLoading.value = false;
    }
  }

  /**
   * Creates a task.
   *
   * The API requires the type AND the column (`task_tast_id`): a task is
   * born in the column the user pressed "+" on, or in the first column
   * (Pendiente) when it comes from the header button (PRD-v2 §8.3).
   */
  async function add(input: {
    title: string;
    description: string | null;
    stateId?: string;
    typeId: string;
    categoryId: string | null;
    clientId: string | null;
  }): Promise<Task> {
    const stateId = input.stateId ?? columns.value[0]?.id;
    if (!stateId) {
      throw new Error("no hay columnas: la tarea no puede crearse");
    }
    const created = await createTask({ ...input, stateId });
    tasks.value = [...tasks.value, created];
    return created;
  }

  async function edit(input: TaskUpdateInput): Promise<Task> {
    const updated = await updateTask(input);
    tasks.value = tasks.value.map((task) =>
      task.id === updated.id ? updated : task,
    );
    return updated;
  }

  async function deleteTask(id: string): Promise<void> {
    await removeTask(id);
    tasks.value = tasks.value.filter((task) => task.id !== id);
  }

  /**
   * Moves a task within the board.
   *
   * `columnTasks` is the FULL ordered list of the target column WITHOUT
   * the moved task; the task lands at `index`. The neighbors for the API
   * come from that list, so the persisted order matches what the user
   * saw. On failure the pre-drag snapshot is restored.
   */
  async function move(input: {
    id: string;
    targetStateId: string;
    index: number;
    columnTasks: Task[];
  }): Promise<void> {
    const snapshot = tasks.value;
    const moved = snapshot.find((task) => task.id === input.id);
    if (!moved) return;

    const neighbors = moveNeighbors(input.columnTasks, input.index);

    // Optimistic rebuild: the target column is rebuilt around the moved
    // task and every other task stays in place. The rebuild works by ID
    // (not by column), so a task can never end up in two columns.
    const optimistic: Task = {
      ...moved,
      stateId: input.targetStateId,
      kanbanOrder:
        input.index === 0
          ? (input.columnTasks[0]?.kanbanOrder ?? 2) - 1
          : (input.columnTasks[input.index - 1]?.kanbanOrder ?? 0) + 1,
    };
    const columnIds = new Set(input.columnTasks.map((task) => task.id));
    const rest = snapshot.filter(
      (task) => task.id !== input.id && !columnIds.has(task.id),
    );
    tasks.value = [
      ...input.columnTasks.slice(0, input.index),
      optimistic,
      ...input.columnTasks.slice(input.index),
      ...rest,
    ];

    try {
      const updated = await moveTask({
        id: input.id,
        targetStateId: input.targetStateId,
        ...neighbors,
      });
      tasks.value = tasks.value.map((task) =>
        task.id === updated.id ? updated : task,
      );
    } catch (err) {
      tasks.value = snapshot;
      throw err;
    }
  }

  return {
    tasks,
    columns,
    clients,
    types,
    categories,
    board,
    isLoading,
    error,
    clientNameById,
    typeNameById,
    categoryNameById,
    load,
    add,
    edit,
    deleteTask,
    move,
  };
}
