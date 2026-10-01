import type { OctaneNode } from "octane";
import { useEffect, useState } from "octane";
import type { Expense, Income, Transfer } from "@crm/types";
import { useT } from "../vendor/i18n";
import { Icon } from "../vendor/icons";
import { PageHeader } from "../molecules/page-header/page-header.tsrx";
import { createRpcClient, type RpcClient } from "../../lib/api/rpc";

/**
 * Página `/dashboard` — Resumen del estado financiero del user.
 *
 * MVP: muestra 3 counters simples (ingresos / gastos / transfers del mes)
 * con totales agregados. Llama 3 RPCs en paralelo y muestra resultados
 * parciales si alguno falla.
 *
 * No hay un endpoint /dashboard agregado porque cada módulo tiene su
 * propia lista. Cuando los volúmenes crezcan, conviene un endpoint
 * /stats que devuelva counters pre-calculados server-side.
 *
 * Layout (rediseño 2026-Q4): breadcrumb `Home / Dashboard` + título
 * grande + acción primaria "Nuevo" + grid de 3 stats cards + lista de
 * actividad reciente (placeholder vacío por ahora; los datos reales
 * llegan cuando el módulo de auditoría exista).
 */

interface TotalCount {
  count: number;
  total: string;
}

const RPC = createRpcClient(import.meta.env.VITE_API_URL ?? "/rpc");

function startOfMonthIso(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-01`;
}

export function DashboardPage() @{
  const t = useT();
  const [incomeMonth, setIncomeMonth] = useState<TotalCount | null>(null);
  const [expenseMonth, setExpenseMonth] = useState<TotalCount | null>(null);
  const [transferMonth, setTransferMonth] = useState<TotalCount | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    const dateFrom = startOfMonthIso();

    const compute = (
      rows: Array<{ inco_amount: string } | { expe_amount: string } | { tran_amount: string }>,
    ): TotalCount => {
      const count = rows.length;
      const total = rows
        .reduce((acc, r) => {
          const amount = "inco_amount" in r
            ? r.inco_amount
            : "expe_amount" in r
              ? r.expe_amount
              : (r as { tran_amount: string }).tran_amount;
          return acc + Number(amount);
        }, 0)
        .toFixed(2);
      return { count, total };
    };

    const load = async () => {
      setLoading(true);
      try {
        const [incomeRes, expenseRes, transferRes] = await Promise.all([
          (RPC as RpcClient).incomes.list({ search: "", date_from: dateFrom, date_to: null, limit: 100 }),
          (RPC as RpcClient).expenses.list({ search: "", date_from: dateFrom, date_to: null, limit: 100 }),
          (RPC as RpcClient).transfers.list({ search: "", date_from: dateFrom, date_to: null, limit: 100 }),
        ]);

        if (cancelled) return;
        setIncomeMonth(compute(incomeRes as unknown as Array<Income>));
        setExpenseMonth(compute(expenseRes as unknown as Array<Expense>));
        setTransferMonth(compute(transferRes as unknown as Array<Transfer>));
        setLoading(false);
      } catch {
        if (!cancelled) setLoading(false);
      }
    };
    void load();
    return () => {
      cancelled = true;
    };
  }, []);

  <section data-page="dashboard" class="mx-auto w-full max-w-5xl px-2 py-2">
    <PageHeader
      breadcrumb={[
        { href: "/dashboard", label: t("common.breadcrumbHome") },
        { label: t("nav.dashboard") },
      ]}
      title={t("dashboard.title")}
      subtitle={t("dashboard.subtitle")}
      action={{
        label: t("dashboard.newAction"),
        icon: "plus",
      }}
    />

    <div class="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-3">
      <SummaryCard
        title={t("dashboard.incomesThisMonth")}
        icon={<Icon name="arrow-up-circle" size={20} />}
        tone="success"
        data={incomeMonth}
        loading={loading}
      />
      <SummaryCard
        title={t("dashboard.expensesThisMonth")}
        icon={<Icon name="arrow-down-circle" size={20} />}
        tone="error"
        data={expenseMonth}
        loading={loading}
      />
      <SummaryCard
        title={t("dashboard.transfersThisMonth")}
        icon={<Icon name="arrows-left-right" size={20} />}
        tone="neutral"
        data={transferMonth}
        loading={loading}
      />
    </div>

    <section class="mt-6" aria-labelledby="recent-activity-heading">
      <h2
        id="recent-activity-heading"
        class="mb-2 font-mono text-[10px] text-text-secondary uppercase tracking-[0.25em]"
      >
        {t("dashboard.recentActivity")}
      </h2>
      <div class="rounded-lg border border-border bg-surface">
        <div class="px-4 py-6 text-center text-sm text-text-secondary">
          {t("dashboard.recentActivityEmpty")}
        </div>
      </div>
    </section>
  </section>
}

type SummaryTone = "success" | "error" | "neutral";

const TONE_CLASS: Record<SummaryTone, string> = {
  success: "text-success",
  error: "text-error",
  neutral: "text-text-secondary",
};

function SummaryCard(props: {
  title: string;
  icon: OctaneNode;
  tone: SummaryTone;
  data: TotalCount | null;
  loading: boolean;
}) {
  return (
    <article class="rounded-lg border border-border bg-surface p-4">
      <div class="flex items-center justify-between">
        <h3 class="font-mono text-[10px] text-text-secondary uppercase tracking-[0.25em]">
          {props.title}
        </h3>
        <div class={TONE_CLASS[props.tone]}>{props.icon}</div>
      </div>
      {props.loading === true && props.data === null ? (
        <div
          aria-hidden="true"
          class="mt-3 h-8 w-24 animate-pulse rounded bg-background"
        />
      ) : props.data !== null ? (
        <>
          <p class="mt-3 font-semibold text-2xl text-text-primary">
            ${props.data.total}
          </p>
          <p class="mt-1 text-text-secondary text-xs">
            {props.data.count === 1
              ? "1 transacción"
              : `${props.data.count} transacciones`}
          </p>
        </>
      ) : (
        <p class="mt-3 text-sm text-text-secondary">—</p>
      )}
    </article>
  );
}
