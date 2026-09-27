import { useEffect, useState } from "octane";
import { t } from "../vendor/i18n/core";
import { createRpcClient, type RpcClient } from "../../lib/api/rpc";
import { Icon } from "../vendor/icons";

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
  const [incomeMonth, setIncomeMonth] = useState<TotalCount | null>(null);
  const [expenseMonth, setExpenseMonth] = useState<TotalCount | null>(null);
  const [transferMonth, setTransferMonth] = useState<TotalCount | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    const dateFrom = startOfMonthIso();

    const compute = (rows: Array<{ amount: string }>) => {
      const count = rows.length;
      const total = rows
        .reduce((acc, r) => acc + Number(r.amount), 0)
        .toFixed(2);
      return { count, total };
    };

    const load = async () => {
      setLoading(true);
      try {
        const [incomeRes, expenseRes, transferRes] = await Promise.allSettled([
          (RPC as RpcClient).incomes.list({ search: "", date_from: dateFrom, date_to: null, limit: 100 }),
          (RPC as RpcClient).expenses.list({ search: "", date_from: dateFrom, date_to: null, limit: 100 }),
          (RPC as RpcClient).transfers.list({ search: "", date_from: dateFrom, date_to: null, limit: 100 }),
        ]);

        if (cancelled) return;
        if (incomeRes.status === "fulfilled") {
          setIncomeMonth(compute(incomeRes.value as Array<{ amount: string }>));
        }
        if (expenseRes.status === "fulfilled") {
          setExpenseMonth(compute(expenseRes.value as Array<{ amount: string }>));
        }
        if (transferRes.status === "fulfilled") {
          setTransferMonth(compute(transferRes.value as Array<{ amount: string }>));
        }
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

  <section data-page="dashboard" class="mx-auto w-full max-w-5xl px-6 py-8 sm:py-10">
    <header class="mb-8">
      <h1 class="text-2xl font-bold text-text-primary tracking-tight sm:text-3xl">
        {t("dashboard.title")}
      </h1>
      <p class="mt-1 text-sm text-text-secondary">
        {t("dashboard.subtitle")}
      </p>
    </header>

    <div class="grid grid-cols-1 gap-4 sm:grid-cols-3">
      <SummaryCard
        title={t("dashboard.incomesThisMonth")}
        icon={<Icon name="arrow-up-circle" size={32} />}
        iconColor="text-success"
        data={incomeMonth}
        loading={loading}
      />
      <SummaryCard
        title={t("dashboard.expensesThisMonth")}
        icon={<Icon name="arrow-down-circle" size={32} />}
        iconColor="text-error"
        data={expenseMonth}
        loading={loading}
      />
      <SummaryCard
        title={t("dashboard.transfersThisMonth")}
        icon={<Icon name="arrows-left-right" size={32} />}
        iconColor="text-text-secondary"
        data={transferMonth}
        loading={loading}
      />
    </div>
  </section>
}

function SummaryCard(props: {
  title: string;
  icon: OctaneNode;
  iconColor: string;
  data: TotalCount | null;
  loading: boolean;
}) {
  return (
    <div class="rounded-md border border-border bg-surface p-5">
      <div class="mb-3 flex items-center justify-between">
        <h2 class="text-xs font-medium text-text-secondary">{props.title}</h2>
        <div class={props.iconColor}>{props.icon}</div>
      </div>
      {props.loading && props.data === null ? (
        <div aria-hidden="true" class="h-8 w-20 animate-pulse rounded bg-background" />
      ) : props.data !== null ? (
        <>
          <p class="text-2xl font-semibold text-text-primary">
            ${props.data.total}
          </p>
          <p class="mt-1 text-xs text-text-secondary">
            {props.data.count === 1
              ? "1 transacción"
              : `${props.data.count} transacciones`}
          </p>
        </>
      ) : (
        <p class="text-sm text-text-secondary">—</p>
      )}
    </div>
  );
}
