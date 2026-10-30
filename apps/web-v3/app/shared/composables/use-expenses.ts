import { computed, ref } from "vue";
import {
  createExpense,
  listExpenses,
  removeExpense,
  updateExpense,
  type ExpenseInput,
} from "~/infrastructure/finance/orpc-finance";
import {
  countOfMonth,
  distinctCategories,
  largestCategory,
  totalOfMonth,
  type Expense,
} from "~/domain/finance/entities";
import { useFinanceCatalogs } from "~/shared/composables/use-finance-catalogs";

/**
 * useExpenses: el estado de la pantalla /expenses (PRD-v4 §8.7).
 *
 * Mismo criterio que /incomes: la lista se filtra local y las cuentas
 * y las monedas vienen del composable compartido de finanzas.
 */
export function useExpenses() {
  const expenses = ref<Expense[]>([]);
  const search = ref("");
  const isLoading = ref(false);
  const error = ref<string | null>(null);

  const {
    accounts,
    currencies,
    error: catalogError,
    loadCatalogs,
    accountName,
    accountIconOf,
    accountColorOf,
    symbolOf,
    addAccount,
  } = useFinanceCatalogs();

  const visibleExpenses = computed(() => {
    const needle = search.value.trim().toLowerCase();
    if (!needle) return expenses.value;
    return expenses.value.filter((expense) =>
      [
        expense.description ?? "",
        expense.category ?? "",
      ]
        .join(" ")
        .toLowerCase()
        .includes(needle),
    );
  });

  /** Las tarjetas del header: total, movimientos y mayor categoría. */
  const monthTotal = computed(() => totalOfMonth(expenses.value));
  const monthCount = computed(() => countOfMonth(expenses.value));
  const topCategory = computed(() => largestCategory(expenses.value));

  /** Las categorías distintas, para el datalist del drawer. */
  const categories = computed(() => distinctCategories(expenses.value));

  async function load() {
    isLoading.value = true;
    error.value = null;
    try {
      expenses.value = await listExpenses();
    } catch {
      error.value = "expenses.loadError";
    } finally {
      isLoading.value = false;
    }
  }

  async function add(input: ExpenseInput): Promise<Expense> {
    const created = await createExpense(input);
    expenses.value = [created, ...expenses.value];
    return created;
  }

  async function edit(
    input: Partial<ExpenseInput> & { id: string },
  ): Promise<Expense> {
    const updated = await updateExpense(input);
    expenses.value = expenses.value.map((expense) =>
      expense.id === updated.id ? updated : expense,
    );
    return updated;
  }

  async function deleteExpense(id: string): Promise<void> {
    await removeExpense(id);
    expenses.value = expenses.value.filter((expense) => expense.id !== id);
  }

  return {
    expenses,
    accounts,
    currencies,
    search,
    visibleExpenses,
    monthTotal,
    monthCount,
    topCategory,
    categories,
    isLoading,
    error: computed(() => error.value ?? catalogError.value),
    accountName,
    accountIconOf,
    accountColorOf,
    symbolOf,
    load,
    loadCatalogs,
    add,
    edit,
    deleteExpense,
    addAccount,
  };
}
