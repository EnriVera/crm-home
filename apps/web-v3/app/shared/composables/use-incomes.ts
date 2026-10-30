import { computed, ref } from "vue";
import {
  createAccount,
  createIncome,
  listAccounts,
  listIncomes,
  removeIncome,
  updateIncome,
  type AccountInput,
  type IncomeInput,
} from "~/infrastructure/finance/orpc-finance";
import { listCurrencies } from "~/infrastructure/config/orpc-config";
import type { Currency } from "~/domain/config/entities";
import {
  averageAmount,
  countOfMonth,
  distinctCategories,
  totalOfMonth,
  type Account,
  type Income,
} from "~/domain/finance/entities";

/**
 * useIncomes: el estado de la pantalla /incomes (PRD-v4 §8.7).
 *
 * La lista se carga una vez y se filtra local (el volumen es chico y el
 * buscador se queda instantáneo, mismo criterio que useClients). Las
 * cuentas viajan acá porque el drawer de alta/edición necesita el select
 * de "Cuenta destino" y el alta de una cuenta nueva recarga la lista.
 */
export function useIncomes() {
  const incomes = ref<Income[]>([]);
  const accounts = ref<Account[]>([]);
  const currencies = ref<Currency[]>([]);
  const search = ref("");
  const isLoading = ref(false);
  const error = ref<string | null>(null);

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

  /** Nombre de una cuenta (para la columna Cuenta de la tabla). */
  function accountName(accountId: string): string | null {
    return (
      accounts.value.find((account) => account.id === accountId)?.name ?? null
    );
  }

  /** El ícono de una cuenta (para el punto de color de la tabla). */
  function accountIconOf(accountId: string): string | null {
    return (
      accounts.value.find((account) => account.id === accountId)?.icon ?? null
    );
  }

  /** El color de una cuenta. */
  function accountColorOf(accountId: string): string | null {
    return (
      accounts.value.find((account) => account.id === accountId)?.color ?? null
    );
  }

  async function load() {
    isLoading.value = true;
    error.value = null;
    try {
      [incomes.value, accounts.value] = await Promise.all([
        listIncomes(),
        listAccounts(),
      ]);
    } catch {
      error.value = "incomes.loadError";
    } finally {
      isLoading.value = false;
    }
  }

  /** Las monedas salen del endpoint global de currencies (config). */
  async function loadCurrencies() {
    try {
      currencies.value = await listCurrencies();
    } catch {
      // Sin monedas no se puede crear nada: el error ya está en pantalla.
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

  async function addAccount(input: AccountInput): Promise<Account> {
    const created = await createAccount(input);
    accounts.value = [...accounts.value, created];
    return created;
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
    error,
    accountName,
    accountIconOf,
    accountColorOf,
    load,
    loadCurrencies,
    add,
    edit,
    deleteIncome,
    addAccount,
  };
}
