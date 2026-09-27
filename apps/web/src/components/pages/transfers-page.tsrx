import { useEffect, useState } from "octane";
import { t } from "../vendor/i18n/core";
import { createRpcClient, type RpcClient } from "../../lib/api/rpc";
import { Button } from "../atoms/button.tsrx";
import { Icon } from "../vendor/icons";
import { DataList } from "../molecules/data-list.tsrx";
import { EmptyState } from "../molecules/empty-state.tsrx";
import { TransferListItem } from "../molecules/transfer-list-item.tsrx";
import { useFetch } from "../../hooks/use-fetch";
import type { Transfer } from "@crm/types";

/**
 * Página `/transfers` (PR-8 — módulo transfers, MVP read + delete).
 *
 * Mismo patrón que `IncomesPage` / `ExpensesPage`. Diferencia: en lugar de
 * accountId + currencyId (que son UUIDs del user), el form pide
 * from_account_id y to_account_id (transfer entre dos cuentas distintas).
 *
 * MVP: accountId son TEXT inputs (UUIDs) — el listado + selección vendría
 * cuando se sume el endpoint público de accounts. Ver /incomes comment.
 */

const RPC = createRpcClient(import.meta.env.VITE_API_URL ?? "/rpc");

export function TransfersPage() @{
  const [search, setSearch] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [deletingId, setDeletingId] = useState<string | null>(null);

  // Carga vía useFetch (centraliza cancelled+finally).
  const transfersFetch = useFetch<Transfer[]>(
    () =>
      (RPC as RpcClient).transfers.list({
        search,
        date_from: dateFrom.length === 0 ? null : dateFrom,
        date_to: dateTo.length === 0 ? null : dateTo,
        limit: 100,
      }) as Promise<Transfer[]>,
    [search, dateFrom, dateTo],
  );
  const transfers = transfersFetch.data ?? [];
  const loading = transfersFetch.loading;
  const loadError = transfersFetch.error;

  const handleDelete = async (transferId: string) => {
    setDeletingId(transferId);
    try {
      await (RPC as RpcClient).transfers.remove({ tran_id: transferId });
      setDeletingId(null);
      transfersFetch.refetch();
    } catch {
      setDeletingId(null);
      setDeleteError(t("transfers.loadError"));
    }
  };

  <section data-page="transfers" class="mx-auto w-full max-w-4xl px-6 py-8 sm:py-10">
    <header class="mb-8 flex flex-wrap items-end justify-between gap-4">
      <div class="min-w-0">
        <h1 class="text-2xl font-bold text-text-primary tracking-tight sm:text-3xl">
          {t("transfers.page.title")}
        </h1>
        {transfers.length > 0 && (
          <p class="mt-1 text-sm text-text-secondary">
            {transfers.length === 1 ? "1 transferencia" : `${transfers.length} transferencias`}
          </p>
        )}
      </div>
    </header>

    <div class="mb-6 grid grid-cols-1 gap-3 sm:grid-cols-3">
      <input
        type="search"
        value={search}
        onInput={(e: Event) => {
          const target = e.currentTarget as HTMLInputElement;
          setSearch(target.value);
        }}
        placeholder={t("transfers.search.placeholder")}
        aria-label={t("transfers.search.label")}
        class="rounded-md border border-border bg-background px-3 py-2 text-sm text-text-primary placeholder:text-text-secondary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus"
      />
      <input
        type="date"
        value={dateFrom}
        onInput={(e: Event) => {
          const target = e.currentTarget as HTMLInputElement;
          setDateFrom(target.value);
        }}
        aria-label={t("transfers.fields.dateFrom")}
        class="rounded-md border border-border bg-background px-3 py-2 text-sm text-text-primary placeholder:text-text-secondary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus"
      />
      <input
        type="date"
        value={dateTo}
        onInput={(e: Event) => {
          const target = e.currentTarget as HTMLInputElement;
          setDateTo(target.value);
        }}
        aria-label={t("transfers.fields.dateTo")}
        class="rounded-md border border-border bg-background px-3 py-2 text-sm text-text-primary placeholder:text-text-secondary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus"
      />
    </div>

    <DataList
      loading={loading}
      error={loadError}
      isEmpty={transfers.length === 0}
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
        <EmptyState
          icon={<Icon name="arrows-left-right" size={48} />}
          title={t("transfers.listEmpty.noTransfers")}
          description={t("transfers.listEmpty.noTransfersBody")}
        />
      }
    >
      <ul class="flex flex-col gap-3">
        {transfers.map((transfer) => (
          <li
            key={transfer.tran_id}
            data-component="transfer-row"
            class="rounded-md border border-border bg-surface transition-colors hover:bg-background"
          >
            <div class="flex items-stretch gap-3">
              <div class="min-w-0 flex-1">
                <TransferListItem
                  tran_id={transfer.tran_id}
                  tran_amount={transfer.tran_amount}
                  tran_currency_symbol="$"
                  tran_date={transfer.tran_date}
                  tran_description={transfer.tran_description}
                  tran_from_account_name={null}
                  tran_to_account_name={null}
                />
              </div>
              <Button
                variant="ghost"
                type="button"
                disabled={deletingId === transfer.tran_id}
                onClick={(event: Event) => {
                  event.preventDefault();
                  event.stopPropagation();
                  void handleDelete(transfer.tran_id);
                }}
                aria-label={t("transfers.detail.delete")}
                title={t("transfers.detail.delete")}
                class="m-2 shrink-0 px-3 py-1 text-sm text-error hover:bg-error/10"
              >
                {deletingId === transfer.tran_id ? "..." : t("transfers.detail.delete")}
              </Button>
            </div>
          </li>
        ))}
      </ul>
    </DataList>
  </section>
}
