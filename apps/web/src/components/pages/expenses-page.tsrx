import { useEffect, useState } from "octane";
import { t } from "../vendor/i18n/core";
import { createRpcClient, type RpcClient } from "../../lib/api/rpc";
import { Button } from "../atoms/button.tsrx";
import { Icon } from "../vendor/icons";
import { DataList } from "../molecules/data-list.tsrx";
import { ExpenseListItem } from "../molecules/expense-list-item.tsrx";
import { ExpenseForm } from "../organisms/expense-form/expense-form.tsrx";
import type { Expense } from "@crm/types";

/**
 * Página `/expenses` (PR-8 — módulo expenses, MVP read + create + delete).
 *
 * Idéntico patrón a `IncomesPage` (gastos en lugar de ingresos):
 * - Header con title + count + "+ Nuevo gasto" button.
 * - Date filters (from / to) — opcionales.
 * - DataList con `<ExpenseListItem>` (color rojo para diferenciar de income).
 */

const RPC = createRpcClient(import.meta.env.VITE_API_URL ?? "/rpc");

export function ExpensesPage() @{
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [search, setSearch] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [refreshKey, setRefreshKey] = useState(0);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      setLoading(true);
      setLoadError(null);
      try {
        const result = (await (RPC as RpcClient).expenses.list({
          search,
          date_from: dateFrom.length === 0 ? null : dateFrom,
          date_to: dateTo.length === 0 ? null : dateTo,
          limit: 100,
        })) as Expense[];
        if (!cancelled) {
          setExpenses(result);
          setLoading(false);
        }
      } catch {
        if (!cancelled) {
          setLoadError(t("expenses.loadError"));
          setLoading(false);
        }
      }
    };
    void load();
    return () => {
      cancelled = true;
    };
  }, [search, dateFrom, dateTo, refreshKey]);

  const handleCreate = async (payload: {
    expe_account_id: string;
    expe_amount: string;
    expe_currency_id: string;
    expe_description: string | null;
    expe_category: string | null;
    expe_date: string;
    expe_receipt_url: string | null;
  }) => {
    await (RPC as RpcClient).expenses.create(payload);
    setCreateOpen(false);
    setRefreshKey((k) => k + 1);
  };

  const handleDelete = async (expenseId: string) => {
    setDeletingId(expenseId);
    setDeleteError(null);
    try {
      await (RPC as RpcClient).expenses.remove({ expe_id: expenseId });
      setDeletingId(null);
      setRefreshKey((k) => k + 1);
    } catch {
      setDeletingId(null);
      setDeleteError(t("expenses.loadError"));
    }
  };

  <section data-page="expenses" class="mx-auto w-full max-w-4xl px-6 py-8 sm:py-10">
    <header class="mb-8 flex flex-wrap items-end justify-between gap-4">
      <div class="min-w-0">
        <h1 class="text-2xl font-bold text-text-primary tracking-tight sm:text-3xl">
          {t("expenses.page.title")}
        </h1>
        {expenses.length > 0 && (
          <p class="mt-1 text-sm text-text-secondary">
            {expenses.length === 1 ? "1 gasto" : `${expenses.length} gastos`}
          </p>
        )}
      </div>
      <Button variant="primary" onClick={() => setCreateOpen(true)}>
        {t("expenses.page.add")}
      </Button>
    </header>

    <div class="mb-6 grid grid-cols-1 gap-3 sm:grid-cols-3">
      <input
        type="search"
        value={search}
        onInput={(e: Event) => {
          const target = e.currentTarget as HTMLInputElement;
          setSearch(target.value);
        }}
        placeholder={t("expenses.search.placeholder")}
        aria-label={t("expenses.search.label")}
        class="rounded-md border border-border bg-background px-3 py-2 text-sm text-text-primary placeholder:text-text-secondary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus"
      />
      <input
        type="date"
        value={dateFrom}
        onInput={(e: Event) => {
          const target = e.currentTarget as HTMLInputElement;
          setDateFrom(target.value);
        }}
        aria-label={t("expenses.fields.dateFrom")}
        class="rounded-md border border-border bg-background px-3 py-2 text-sm text-text-primary placeholder:text-text-secondary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus"
      />
      <input
        type="date"
        value={dateTo}
        onInput={(e: Event) => {
          const target = e.currentTarget as HTMLInputElement;
          setDateTo(target.value);
        }}
        aria-label={t("expenses.fields.dateTo")}
        class="rounded-md border border-border bg-background px-3 py-2 text-sm text-text-primary placeholder:text-text-secondary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus"
      />
    </div>

    {deleteError !== null && (
      <div
        role="alert"
        class="mb-4 rounded-md border border-error bg-surface px-4 py-2 text-sm text-error"
      >
        {deleteError}
      </div>
    )}

    <DataList
      loading={loading}
      error={loadError}
      isEmpty={expenses.length === 0}
      className="flex flex-col gap-3"
      skeleton={
        <>
          <div aria-hidden="true" class="rounded-md border border-border bg-surface px-4 py-3">
            <div class="h-4 w-1/3 animate-pulse rounded bg-background" />
            <div class="mt-2 h-3 w-1/2 animate-pulse rounded bg-background" />
          </div>
        </>
      }
      emptyState={
        <div
          data-component="expenses-list-empty"
          class="flex flex-col items-center rounded-lg border border-dashed border-border bg-surface px-6 py-16 text-center"
        >
          <div class="mb-4 text-text-secondary">
            <Icon name="wallet" size={48} />
          </div>
          <h2 class="text-lg font-semibold text-text-primary">
            {search || dateFrom || dateTo
              ? t("expenses.listEmpty.noResults")
              : t("expenses.listEmpty.noExpenses")}
          </h2>
          <p class="mt-2 max-w-sm text-sm text-text-secondary">
            {search || dateFrom || dateTo
              ? t("expenses.listEmpty.noResultsBody")
              : t("expenses.listEmpty.noExpensesBody")}
          </p>
          {!(search || dateFrom || dateTo) && (
            <Button
              variant="primary"
              class="mt-6"
              onClick={() => setCreateOpen(true)}
            >
              {t("expenses.page.add")}
            </Button>
          )}
        </div>
      }
    >
      <ul class="flex flex-col gap-3">
        {expenses.map((expense) => (
          <li
            key={expense.expe_id}
            data-component="expense-row"
            class="flex items-stretch gap-3 rounded-md border border-border bg-surface transition-colors hover:bg-background"
          >
            <div class="min-w-0 flex-1">
              <ExpenseListItem
                expe_id={expense.expe_id}
                expe_amount={expense.expe_amount}
                expe_currency_symbol="$"
                expe_date={expense.expe_date}
                expe_description={expense.expe_description}
                expe_category={expense.expe_category}
                expe_account_name={null}
                expe_receipt_url={expense.expe_receipt_url}
              />
            </div>
            <Button
              variant="ghost"
              type="button"
              disabled={deletingId === expense.expe_id}
              onClick={(event: Event) => {
                event.preventDefault();
                event.stopPropagation();
                void handleDelete(expense.expe_id);
              }}
              aria-label={t("expenses.detail.delete")}
              title={t("expenses.detail.delete")}
              class="m-2 shrink-0 px-3 py-1 text-sm text-error hover:bg-error/10"
            >
              {deletingId === expense.expe_id
                ? t("expenses.form.submitting")
                : t("expenses.detail.delete")}
            </Button>
          </li>
        ))}
      </ul>
    </DataList>

    {createOpen ? (
      <ExpenseForm
        mode="create"
        onSubmit={handleCreate}
        onClose={() => setCreateOpen(false)}
      />
    ) : null}
  </section>
}
