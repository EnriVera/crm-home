import { computed, ref } from "vue";
import {
  createTransfer,
  listTransfers,
  removeTransfer,
  updateTransfer,
  type TransferInput,
} from "~/infrastructure/finance/orpc-finance";
import {
  countOfMonth,
  totalOfMonth,
  type Transfer,
} from "~/domain/finance/entities";
import { useFinanceCatalogs } from "~/shared/composables/use-finance-catalogs";

/**
 * useTransfers: el estado de la pantalla /transfers (PRD-v4 §8.7).
 *
 * Los saldos que muestra el drawer (el "Disponible" del origen y el "Saldo
 * actual" del destino) salen del balance que calcula la API (PRD-v2 §8.6),
 * así que acá no se suma nada.
 */
export function useTransfers() {
  const transfers = ref<Transfer[]>([]);
  const search = ref("");
  const isLoading = ref(false);
  const error = ref<string | null>(null);

  const {
    accounts,
    currencies,
    error: catalogError,
    loadCatalogs,
    accountOf,
    accountName,
    accountIconOf,
    accountColorOf,
    symbolOf,
    addAccount,
  } = useFinanceCatalogs();

  const visibleTransfers = computed(() => {
    const needle = search.value.trim().toLowerCase();
    if (!needle) return transfers.value;
    return transfers.value.filter((transfer) =>
      (transfer.description ?? "").toLowerCase().includes(needle),
    );
  });

  /** Las tarjetas del header: total, movimientos y último traslado. */
  const monthTotal = computed(() => totalOfMonth(transfers.value));
  const monthCount = computed(() => countOfMonth(transfers.value));

  /** El último traslado (el más reciente por fecha). */
  const lastTransfer = computed<Transfer | null>(() => {
    if (transfers.value.length === 0) return null;
    return [...transfers.value].sort((a, b) =>
      b.date.localeCompare(a.date),
    )[0]!;
  });

  async function load() {
    isLoading.value = true;
    error.value = null;
    try {
      transfers.value = await listTransfers();
    } catch {
      error.value = "transfers.loadError";
    } finally {
      isLoading.value = false;
    }
  }

  async function add(input: TransferInput): Promise<Transfer> {
    const created = await createTransfer(input);
    transfers.value = [created, ...transfers.value];
    return created;
  }

  async function edit(
    input: Partial<TransferInput> & { id: string },
  ): Promise<Transfer> {
    const updated = await updateTransfer(input);
    transfers.value = transfers.value.map((transfer) =>
      transfer.id === updated.id ? updated : transfer,
    );
    return updated;
  }

  async function deleteTransfer(id: string): Promise<void> {
    await removeTransfer(id);
    transfers.value = transfers.value.filter(
      (transfer) => transfer.id !== id,
    );
  }

  return {
    transfers,
    accounts,
    currencies,
    search,
    visibleTransfers,
    monthTotal,
    monthCount,
    lastTransfer,
    isLoading,
    error: computed(() => error.value ?? catalogError.value),
    accountOf,
    accountName,
    accountIconOf,
    accountColorOf,
    symbolOf,
    load,
    loadCatalogs,
    add,
    edit,
    deleteTransfer,
    addAccount,
  };
}
