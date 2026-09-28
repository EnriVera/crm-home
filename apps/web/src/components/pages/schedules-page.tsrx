import { useState } from "octane";
import { t } from "../vendor/i18n/core";
import { createRpcClient, type RpcClient } from "../../lib/api/rpc";
import { Icon } from "../vendor/icons";
import { DataList } from "../molecules/data-list.tsrx";
import { EmptyState } from "../molecules/empty-state.tsrx";
import { ScheduleListItem } from "../molecules/schedule-list-item.tsrx";
import { useOctaneQuery } from "../../hooks/use-octane-query";
import type { Schedule } from "@crm/types";

/**
 * Página `/schedules` (PR-8 — reglas recurrentes).
 *
 * Mismo patrón que `IncomesPage` / `ExpensesPage`. Diferencia: no hay
 * form de creación en MVP (es compleja: accountId, currencyId, frequency,
 * nextRunDate). La regla se crea via API directa (curl) o desde un futuro
 * flujo. La página solo lista + delete + toggle pause.
 */
const RPC = createRpcClient(import.meta.env.VITE_API_URL ?? "/rpc");

export function SchedulesPage() @{
  const [deletingId, setDeletingId] = useState<string | null>(null);

  // Carga vía useOctaneQuery (deduplicación + cancelled + finally vía
  // QueryObserver; misma contract surface que useFetch).
  const schedulesQuery = useOctaneQuery<Schedule[]>(
    () =>
      (RPC as RpcClient).schedules.list({ limit: 50 }) as Promise<Schedule[]>,
    [],
  );
  const schedules = schedulesQuery.data ?? [];
  const loading = schedulesQuery.loading;
  const loadError = schedulesQuery.error;

  const handleDelete = async (scheduleId: string) => {
    setDeletingId(scheduleId);
    try {
      await (RPC as RpcClient).schedules.remove({ sche_id: scheduleId });
      setDeletingId(null);
      schedulesQuery.refetch();
    } catch {
      setDeletingId(null);
      setLoadError(t("schedules.loadError"));
    }
  };

  <section data-page="schedules" class="mx-auto w-full max-w-4xl px-6 py-8 sm:py-10">
    <header class="mb-8">
      <h1 class="text-2xl font-bold text-text-primary tracking-tight sm:text-3xl">
        {t("schedules.page.title")}
      </h1>
      <p class="mt-1 text-sm text-text-secondary">
        {t("schedules.page.subtitle")}
      </p>
    </header>

    <DataList
      loading={loading}
      error={loadError}
      isEmpty={schedules.length === 0}
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
          icon={<Icon name="calendar" size={48} />}
          title={t("schedules.listEmpty.noSchedules")}
          description={t("schedules.listEmpty.noSchedulesBody")}
        />
      }
    >
      <ul class="flex flex-col gap-3">
        {schedules.map((schedule) => (
          <li
            key={schedule.sche_id}
            data-component="schedule-row"
            class="rounded-md border border-border bg-surface transition-colors hover:bg-background"
          >
            <div class="flex items-stretch gap-3">
              <div class="min-w-0 flex-1">
                <ScheduleListItem
                  sche_id={schedule.sche_id}
                  sche_name={schedule.sche_name}
                  sche_amount={schedule.sche_amount}
                  sche_currency_symbol="$"
                  sche_frequency={schedule.sche_frequency}
                  sche_next_run_date={schedule.sche_next_run_date}
                  sche_is_active={schedule.sche_is_active}
                  sche_description={schedule.sche_description}
                />
              </div>
              <button
                type="button"
                disabled={deletingId === schedule.sche_id}
                onClick={(event: Event) => {
                  event.preventDefault();
                  void handleDelete(schedule.sche_id);
                }}
                aria-label={t("schedules.detail.delete")}
                class="m-2 shrink-0 rounded-md px-3 py-1 text-sm text-error transition-colors hover:bg-error/10 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {deletingId === schedule.sche_id ? "..." : t("schedules.detail.delete")}
              </button>
            </div>
          </li>
        ))}
      </ul>
    </DataList>
  </section>
}
