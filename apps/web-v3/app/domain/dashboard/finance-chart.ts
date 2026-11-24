/**
 * Ingresos vs gastos — read model puro (PRD-v4 §11.4).
 *
 * PRD-v2 §8.2 (Fase 2) pide el gráfico de ingresos vs gastos del mes
 * corriente; el catálogo del dashboard muestra el delta contra el mes
 * anterior ("+12% vs. mayo"), así que la serie son los últimos meses,
 * no un único mes.
 *
 * Regla que no se negocia: **dos monedas nunca se suman**. Cada moneda
 * tiene su propia serie y su propio eje; la pantalla deja elegir cuál
 * se mira.
 */
import type { Currency } from "~/domain/config/entities";

/** Un movimiento con la moneda en la que se registró. */
export interface ChartMovement {
  amount: number;
  /** "2026-06-28" */
  date: string;
  currencyId: string;
}

/** Un mes de la serie. */
export interface FinanceMonth {
  /** "2026-06" */
  key: string;
  /** "jun" */
  label: string;
  income: number;
  expense: number;
}

/** La serie de UNA moneda (eje propio, cifras propias). */
export interface FinanceSeries {
  currencyId: string;
  symbol: string;
  months: FinanceMonth[];
  totalIncome: number;
  totalExpense: number;
}

/** Cuántos meses mira el gráfico por defecto. */
export const FINANCE_CHART_MONTHS = 6;

/**
 * Las claves de los últimos `count` meses, del más viejo al más nuevo.
 *
 * El mes corriente va último: el gráfico se lee hacia adelante.
 */
export function monthKeys(
  count: number,
  now: Date = new Date(),
): string[] {
  const keys: string[] = [];
  for (let back = count - 1; back >= 0; back -= 1) {
    const first = new Date(now.getFullYear(), now.getMonth() - back, 1);
    keys.push(
      `${first.getFullYear()}-${String(first.getMonth() + 1).padStart(2, "0")}`,
    );
  }
  return keys;
}

/**
 * La ventana de los últimos `count` meses, como la API la espera.
 *
 * La API filtra por fecha: el gráfico pide el período completo y no
 * descarga todos los movimientos para filtrarlos en el navegador.
 */
export function chartWindow(
  count: number = FINANCE_CHART_MONTHS,
  now: Date = new Date(),
): { dateFrom: string; dateTo: string } {
  const first = new Date(now.getFullYear(), now.getMonth() - (count - 1), 1);
  const lastDay = new Date(
    Date.UTC(now.getFullYear(), now.getMonth() + 1, 0),
  ).getUTCDate();
  const prefix = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  return {
    dateFrom: `${first.getFullYear()}-${String(first.getMonth() + 1).padStart(2, "0")}-01`,
    dateTo: `${prefix}-${String(lastDay).padStart(2, "0")}`,
  };
}

/** "jun" — la etiqueta corta del mes de una clave "YYYY-MM". */
export function monthLabel(key: string, locale = "es"): string {
  const [year, month] = key.split("-").map(Number);
  const label = new Intl.DateTimeFormat(locale, { month: "short" }).format(
    new Date(year ?? 2026, (month ?? 1) - 1, 1),
  );
  // "jun." con punto no es "jun": el punto de abreviatura se va.
  return label.replace(/\.$/, "");
}

/**
 * Arma una serie por moneda.
 *
 * Los meses sin movimiento van con cero (una barra en cero es información:
 * ese mes no movió plata), y los movimientos fuera de la ventana se
 * ignoran (el período es el que muestra el gráfico).
 *
 * Las series vienen ordenadas por volumen: la moneda con más plata es la
 * que se mira primero.
 */
export function buildFinanceSeries(
  incomes: ChartMovement[],
  expenses: ChartMovement[],
  currencies: Currency[],
  count: number = FINANCE_CHART_MONTHS,
  now: Date = new Date(),
): FinanceSeries[] {
  const keys = monthKeys(count, now);
  const labels = new Map(keys.map((key) => [key, monthLabel(key)]));

  const series = new Map<string, FinanceSeries>();
  const ensure = (currencyId: string): FinanceSeries => {
    const existing = series.get(currencyId);
    if (existing) return existing;
    const created: FinanceSeries = {
      currencyId,
      symbol:
        currencies.find((currency) => currency.id === currencyId)?.symbol ?? "",
      months: keys.map((key) => ({
        key,
        label: labels.get(key) ?? key,
        income: 0,
        expense: 0,
      })),
      totalIncome: 0,
      totalExpense: 0,
    };
    series.set(currencyId, created);
    return created;
  };

  const add = (
    movements: ChartMovement[],
    field: "income" | "expense",
  ): void => {
    for (const movement of movements) {
      const key = movement.date.slice(0, 7);
      if (!keys.includes(key)) continue;
      const target = ensure(movement.currencyId);
      const month = target.months.find((entry) => entry.key === key);
      if (!month) continue;
      month[field] += movement.amount;
      if (field === "income") target.totalIncome += movement.amount;
      else target.totalExpense += movement.amount;
    }
  };

  add(incomes, "income");
  add(expenses, "expense");

  return [...series.values()].sort(
    (a, b) =>
      b.totalIncome + b.totalExpense - (a.totalIncome + a.totalExpense),
  );
}

/** El neto del período: lo que entró menos lo que salió. */
export function netOf(series: FinanceSeries): number {
  return series.totalIncome - series.totalExpense;
}

/**
 * "1,2 M" — el monto corto del eje del gráfico.
 *
 * El eje de las barras necesita poco ancho: la cifra completa ("$ 1.840.000")
 * no entra en una etiqueta de eje sin que se vuelva ilegible.
 */
export function formatCompact(amount: number): string {
  const absolute = Math.abs(amount);
  if (absolute >= 1_000_000) {
    return `${new Intl.NumberFormat("es-AR", {
      maximumFractionDigits: 1,
    }).format(amount / 1_000_000)} M`;
  }
  if (absolute >= 1_000) {
    return `${new Intl.NumberFormat("es-AR", {
      maximumFractionDigits: 0,
    }).format(amount / 1_000)} k`;
  }
  return new Intl.NumberFormat("es-AR", { maximumFractionDigits: 0 }).format(
    amount,
  );
}

/**
 * El techo del eje: el valor más alto redondeado hacia arriba.
 *
 * Redondear hacia arriba (y no al valor exacto) deja el eje en números
 * redondos: 100, 200, 500… y la lectura del gráfico es inmediata.
 */
export function axisCeiling(max: number): number {
  if (max <= 0) return 100;
  const magnitude = 10 ** Math.floor(Math.log10(max));
  const normalized = max / magnitude;
  const step = normalized <= 1 ? 1 : normalized <= 2 ? 2 : normalized <= 5 ? 5 : 10;
  return step * magnitude;
}

/**
 * El cambio porcentual contra el mes anterior.
 *
 * `null` cuando no hay mes anterior con qué comparar (o cuando el mes
 * anterior fue cero: un porcentaje sobre cero no dice nada).
 */
export function monthOverMonth(
  series: FinanceSeries,
  field: "income" | "expense",
): number | null {
  const last = series.months[series.months.length - 1];
  const previous = series.months[series.months.length - 2];
  if (!last || !previous) return null;
  const current = last[field];
  const before = previous[field];
  if (before === 0) return null;
  return ((current - before) / before) * 100;
}
