import { computed, ref } from "vue";
import {
  createIncome,
  listIncomes,
  removeIncome,
  updateIncome,
  type IncomeInput,
} from "~/infrastructure/finance/orpc-finance";
import {
  averageAmount,
  countOfMonth,
  distinctCategories,
  totalOfMonth,
  type Income,
} from "~/domain/finance/entities";
import { useFinanceCatalogs } from "~/shared/composables/use-finance-catalogs";

/**
 * useIncomes: el estado de la pantalla /incomes (PRD-v4 §8.7).
 *
 * La lista se carga una vez y se filtra local (el volumen es chico y el
 * buscador se queda instantáneo, mismo criterio que useClients). Las
 * cuentas y las monedas vienen del composable compartido de finanzas.
 */
export function useIncomes() {
  const incomes = ref<Income[]>([]);
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

  const visibleIncomes = computed(() => {
    const needle = search.value.trim().toLowerCase();
    if (!needle) return incomes.value;
    return incomes.value.filter((income) =>
      (income.description ?? "").toLowerCase().includes(needle),
    );
  });

  /** Las tarjetas del header: total del mes, movimientos y ticket promedio. */
  const monthTotal = computed(() => totalOfMonth(incomes.value));
  const monthCount = computed(() => countOfMonth(incomes.value));
  const ticketAverage = computed(() => averageAmount(incomes.value));

  /** Las categorías distintas, para el datalist del drawer. */
  const categories = computed(() => distinctCategories(incomes.value));

  async function load() {
    isLoading.value = true;
    error.value = null;
    try {
      incomes.value = await listIncomes();
    } catch {
      error.value = "incomes.loadError";
    } finally {
      isLoading.value = false;
    }
  }

  async function add(input: IncomeInput): Promise<Income> {
    const created = await createIncome(input);
    incomes.value = [created, ...incomes.value];
    return created;
  }

  async function edit(
    input: Partial<IncomeInput> & { id: string },
  ): Promise<Income> {
    const updated = await updateIncome(input);
    incomes.value = incomes.value.map((income) =>
      income.id === updated.id ? updated : income,
    );
    return updated;
  }

  async function deleteIncome(id: string): Promise<void> {
    await removeIncome(id);
    incomes.value = incomes.value.filter((income) => income.id !== id);
  }

  return {
    incomes,
    accounts,
    currencies,
    search,
    visibleIncomes,
    monthTotal,
    monthCount,
    ticketAverage,
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
    deleteIncome,
    addAccount,
  };
}
