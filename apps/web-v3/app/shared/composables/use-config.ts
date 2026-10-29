import { computed, ref } from "vue";
import {
  filterCategories,
  filterCurrencies,
  filterStates,
  filterTypes,
  reorderStates,
  sortStates,
  type AppModule,
  type Category,
  type Currency,
  type TaskState,
  type TaskType,
  type ThemePreference,
} from "~/domain/config/entities";
import {
  createCategory,
  createCurrency,
  createTaskState,
  createType,
  listApps,
  listCategories,
  listCurrencies,
  listTaskStates,
  listTypes,
  removeCategory,
  removeTaskState,
  removeType,
  reorderTaskStates,
  updateCategory,
  updateTaskState,
  updateType,
} from "~/infrastructure/config/orpc-config";
import { updateUserTheme } from "~/infrastructure/auth/orpc-auth";
import { useAuthStore } from "~/stores/auth";
import { useThemeStore } from "~/stores/theme";

/**
 * useConfig: reads and writes the user's configuration (PRD-v4 §8.8).
 *
 * The tab decides what is loaded: each tab fetches only what it shows, so
 * opening the profile does not pull the types.
 */
export function useConfig() {
  const auth = useAuthStore();
  const theme = useThemeStore();

  const types = ref<TaskType[]>([]);
  const states = ref<TaskState[]>([]);
  const categories = ref<Category[]>([]);
  const apps = ref<AppModule[]>([]);
  const currencies = ref<Currency[]>([]);
  const search = ref("");

  const isLoading = ref(false);
  const error = ref<string | null>(null);

  /** The types that match the search box. */
  const visibleTypes = computed(() => filterTypes(types.value, search.value));

  /** The categories that match the search box. */
  const visibleCategories = computed(() =>
    filterCategories(categories.value, search.value),
  );

  /** The states that match the search box, in board order. */
  const visibleStates = computed(() =>
    filterStates(sortStates(states.value), search.value),
  );

  /** The currencies that match the search box. */
  const visibleCurrencies = computed(() =>
    filterCurrencies(currencies.value, search.value),
  );

  /** The states in the order they are shown. */
  const orderedStates = computed(() => sortStates(states.value));

  async function loadTypes() {
    types.value = await listTypes();
  }

  async function loadStates() {
    states.value = await listTaskStates();
  }

  async function loadCategories() {
    // The categories are shown with the name of their type, so the tab
    // carga ambas listas.
    const [typeList, categoryList] = await Promise.all([
      listTypes(),
      listCategories(),
    ]);
    types.value = typeList;
    categories.value = categoryList;
  }

  async function loadApps() {
    apps.value = await listApps();
  }

  async function loadCurrencies() {
    currencies.value = await listCurrencies();
  }

  async function load(tab: string) {
    isLoading.value = true;
    error.value = null;
    try {
      if (tab === "tipos") await loadTypes();
      else if (tab === "estados") await loadStates();
      else if (tab === "categorias") await loadCategories();
      else if (tab === "apps") await loadApps();
      else if (tab === "monedas") await loadCurrencies();
    } catch {
      error.value = "config.loadError";
    } finally {
      isLoading.value = false;
    }
  }

  async function addType(input: { name: string; modules: TaskType["modules"] }) {
    const created = await createType(input);
    types.value = [...types.value, created];
    return created;
  }

  async function editType(input: {
    id: string;
    name?: string;
    modules?: TaskType["modules"];
  }) {
    const updated = await updateType(input);
    types.value = types.value.map((type) =>
      type.id === updated.id ? updated : type,
    );
    return updated;
  }

  async function deleteType(id: string) {
    await removeType(id);
    types.value = types.value.filter((type) => type.id !== id);
  }

  /**
   * Creates a state at a position of the board sequence.
   *
   * `position` is the index where the column lands (0 = first). The API
   * create only stores the order it is given and the reorder endpoint
   * rejects partial lists, so after creating at the end the whole list
   * is normalized: this keeps orders collision-free when the new column
   * lands in the middle.
   */
  async function addState(input: { name: string; position?: number }) {
    const ordered = sortStates(states.value);
    const created = await createTaskState({
      name: input.name,
      order: ordered.length + 1,
    });
    const sequence = [...ordered];
    const at = Math.min(
      Math.max(input.position ?? sequence.length, 0),
      sequence.length,
    );
    sequence.splice(at, 0, created);
    const orders = sequence.map((state, index) => ({
      tast_id: state.id,
      tast_order: index + 1,
    }));
    await reorderTaskStates(orders);
    states.value = sequence.map((state, index) => ({
      ...state,
      order: index + 1,
    }));
    return created;
  }

  async function editState(input: {
    id: string;
    name?: string;
    order?: number;
  }) {
    const updated = await updateTaskState(input);
    states.value = states.value.map((state) =>
      state.id === updated.id ? updated : state,
    );
    return updated;
  }

  async function deleteState(id: string) {
    await removeTaskState(id);
    states.value = states.value.filter((state) => state.id !== id);
  }

  async function addCategory(input: { name: string; typeId: string }) {
    const created = await createCategory(input);
    categories.value = [...categories.value, created];
    return created;
  }

  async function editCategory(input: {
    id: string;
    name?: string;
    typeId?: string;
  }) {
    const updated = await updateCategory(input);
    categories.value = categories.value.map((category) =>
      category.id === updated.id ? updated : category,
    );
    return updated;
  }

  async function deleteCategory(id: string) {
    await removeCategory(id);
    categories.value = categories.value.filter(
      (category) => category.id !== id,
    );
  }

  async function addCurrency(input: {
    name: string;
    symbol: string;
    decimals: number;
  }) {
    const created = await createCurrency(input);
    currencies.value = [...currencies.value, created];
    return created;
  }

  /**
   * Moves a state to another position.
   *
   * The API rejects a partial reorder (it wants every state of the user), so
   * the whole list goes back with the new order.
   */
  async function moveState(id: string, targetIndex: number) {
    const orders = reorderStates(states.value, id, targetIndex);
    await reorderTaskStates(orders);
    states.value = states.value
      .map((state) => {
        const order = orders.find((entry) => entry.tast_id === state.id);
        return order ? { ...state, order: order.tast_order } : state;
      })
      .sort((a, b) => a.order - b.order);
  }

  /**
   * Saves the theme in the account (PRD-v2 §8.7) and applies it right away.
   *
   * The account is the source of truth: the local copy is only a cache for
   * the moment before the session is known.
   */
  async function setTheme(preference: ThemePreference) {
    theme.setTheme(preference);
    try {
      await updateUserTheme(preference);
    } catch {
      // The preference is applied locally even if the account rejects it: the
      // screen must not freeze on a failed save.
      error.value = "config.themeError";
    }
  }

  /** Ends the session and clears the local state (PRD-v2 §8.1). */
  async function logout() {
    const { logout: endSession } = await import(
      "~/infrastructure/auth/orpc-auth"
    );
    await endSession();
    auth.clear();
    theme.setTheme("system");
    await navigateTo("/login");
  }

  return {
    types,
    states,
    categories,
    apps,
    currencies,
    search,
    visibleTypes,
    visibleCategories,
    visibleStates,
    visibleCurrencies,
    orderedStates,
    isLoading,
    error,
    load,
    addType,
    editType,
    deleteType,
    addState,
    editState,
    deleteState,
    moveState,
    addCategory,
    editCategory,
    deleteCategory,
    addCurrency,
    setTheme,
    logout,
  };
}
