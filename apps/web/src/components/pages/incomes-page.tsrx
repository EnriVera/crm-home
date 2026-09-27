import { useEffect, useState } from "octane";
import { t } from "../vendor/i18n/core";
import { createRpcClient, type RpcClient } from "../../lib/api/rpc";
import { Button } from "../atoms/button.tsrx";
import { Icon } from "../vendor/icons";
import { DataList } from "../molecules/data-list.tsrx";
import { IncomeListItem } from "../molecules/income-list-item.tsrx";
import { IncomeForm } from "../organisms/income-form/income-form.tsrx";
import type { Income } from "@crm/types";

/**
 * Página `/incomes` (PR-8 — módulo incomes, MVP read + create + delete).
 *
 * Render plan:
 * - Header con title + count + "+ Nuevo income" button (abre drawer con
 *   `IncomeForm mode="create"`).
 * - Date filters (from / to) — opcionales.
 * - DataList con `<IncomeListItem>` — cada item es un `<a>` que navega
 *   a `/incomes/:id` (futuro) o abre el drawer de edit.
 *
 * El campo accountId/currencyId son inputs del form (text, UUID) porque no
 * hay endpoints públicos para listarlos todavía — ver IncomeForm.
 */

const RPC = createRpcClient(import.meta.env.VITE_API_URL ?? "/rpc");

export function IncomesPage() @{
  const [incomes, setIncomes] = useState<Income[]>([]);
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
        const result = (await (RPC as RpcClient).incomes.list({
          search,
          date_from: dateFrom.length === 0 ? null : dateFrom,
          date_to: dateTo.length === 0 ? null : dateTo,
          limit: 100,
        })) as Income[];
        if (!cancelled) {
          setIncomes(result);
        }
      } catch {
        if (!cancelled) {
          setLoadError(t("incomes.loadError"));
        }
      } finally {
        // `finally` SIEMPRE corre (success, error, o early return por cancelled).
        // Si el componente se unmounteó antes de la respuesta, React ignora
        // el setState silenciosamente — sin warning. Esto evita que la
        // animación de loading quede atascada para siempre en errores
        // que llegan después del navigate.
        if (!cancelled) setLoading(false);
      }
    };
    void load();
    return () => {
      cancelled = true;
    };
  }, [search, dateFrom, dateTo, refreshKey]);

  const handleCreate = async (payload: {
    inco_account_id: string;
    inco_amount: string;
    inco_currency_id: string;
    inco_description: string | null;
    inco_category: string | null;
    inco_date: string;
  }) => {
    await (RPC as RpcClient).incomes.create(payload);
    setCreateOpen(false);
    setRefreshKey((k) => k + 1);
  };

  const handleDelete = async (incomeId: string) => {
    setDeletingId(incomeId);
    setDeleteError(null);
    try {
      await (RPC as RpcClient).incomes.remove({ inco_id: incomeId });
      setDeletingId(null);
      setRefreshKey((k) => k + 1);
    } catch {
      setDeletingId(null);
      setDeleteError(t("incomes.loadError"));
    }
  };

  <section data-page="incomes" class="mx-auto w-full max-w-4xl px-6 py-8 sm:py-10">
    <header class="mb-8 flex flex-wrap items-end justify-between gap-4">
      <div class="min-w-0">
        <h1 class="text-2xl font-bold text-text-primary tracking-tight sm:text-3xl">
          {t("incomes.page.title")}
        </h1>
        {incomes.length > 0 && (
          <p class="mt-1 text-sm text-text-secondary">
            {incomes.length === 1 ? "1 ingreso" : `${incomes.length} ingresos`}
          </p>
        )}
      </div>
      <Button variant="primary" onClick={() => setCreateOpen(true)}>
        {t("incomes.page.add")}
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
        placeholder={t("incomes.search.placeholder")}
        aria-label={t("incomes.search.label")}
        class="rounded-md border border-border bg-background px-3 py-2 text-sm text-text-primary placeholder:text-text-secondary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus"
      />
      <input
        type="date"
        value={dateFrom}
        onInput={(e: Event) => {
          const target = e.currentTarget as HTMLInputElement;
          setDateFrom(target.value);
        }}
        aria-label={t("incomes.fields.dateFrom")}
        class="rounded-md border border-border bg-background px-3 py-2 text-sm text-text-primary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus"
      />
      <input
        type="date"
        value={dateTo}
        onInput={(e: Event) => {
          const target = e.currentTarget as HTMLInputElement;
          setDateTo(target.value);
        }}
        aria-label={t("incomes.fields.dateTo")}
        class="rounded-md border border-border bg-background px-3 py-2 text-sm text-text-primary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus"
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
      isEmpty={incomes.length === 0}
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
          data-component="incomes-list-empty"
          class="flex flex-col items-center rounded-lg border border-dashed border-border bg-surface px-6 py-16 text-center"
        >
          <div class="mb-4 text-text-secondary">
            <Icon name="wallet" size={48} />
          </div>
          <h2 class="text-lg font-semibold text-text-primary">
            {search || dateFrom || dateTo
              ? t("incomes.listEmpty.noResults")
              : t("incomes.listEmpty.noIncomes")}
          </h2>
          <p class="mt-2 max-w-sm text-sm text-text-secondary">
            {search || dateFrom || dateTo
              ? t("incomes.listEmpty.noResultsBody")
              : t("incomes.listEmpty.noIncomesBody")}
          </p>
          {!(search || dateFrom || dateTo) && (
            <Button
              variant="primary"
              class="mt-6"
              onClick={() => setCreateOpen(true)}
            >
              {t("incomes.page.add")}
            </Button>
          )}
        </div>
      }
    >
      <ul class="flex flex-col gap-3">
        {incomes.map((income) => (
          <li
            key={income.inco_id}
            data-component="income-row"
            class="flex items-stretch gap-3 rounded-md border border-border bg-surface transition-colors hover:bg-background"
          >
            <div class="min-w-0 flex-1">
              <IncomeListItem
                inco_id={income.inco_id}
                inco_amount={income.inco_amount}
                inco_currency_symbol="$"
                inco_date={income.inco_date}
                inco_description={income.inco_description}
                inco_category={income.inco_category}
                inco_account_name={null}
              />
            </div>
            <Button
              variant="ghost"
              type="button"
              disabled={deletingId === income.inco_id}
              onClick={(event: Event) => {
                event.preventDefault();
                event.stopPropagation();
                void handleDelete(income.inco_id);
              }}
              aria-label={t("incomes.detail.delete")}
              title={t("incomes.detail.delete")}
              class="m-2 shrink-0 px-3 py-1 text-sm text-error hover:bg-error/10"
            >
              {deletingId === income.inco_id
                ? t("incomes.form.submitting")
                : t("incomes.detail.delete")}
            </Button>
          </li>
        ))}
      </ul>
    </DataList>

    {createOpen ? (
      <IncomeForm
        mode="create"
        onSubmit={handleCreate}
        onClose={() => setCreateOpen(false)}
      />
    ) : null}
  </section>
}
