/**
 * Dashboard derivations — pure TypeScript (PRD-v4 §11.4).
 *
 * The dashboard shows real numbers (money, tasks, hours, activity); these
 * helpers turn the raw lists into what the cards display.
 */
import type { Currency } from "~/domain/config/entities";
import type { MoneyRecord } from "~/domain/finance/entities";
import type { TimerRun } from "~/domain/schedule/entities";

/** A window of wire dates ("YYYY-MM-DD"), inclusive on both ends. */
export interface DateWindow {
  dateFrom: string;
  dateTo: string;
}

/** The total of ONE currency: two currencies are never added together. */
export interface CurrencyTotal {
  currencyId: string;
  symbol: string;
  amount: number;
}

/**
 * The window of the current month, as the API expects it.
 *
 * The API filters by date, so the dashboard asks for the month instead of
 * downloading every movement and filtering in the browser.
 */
export function monthWindow(now: Date = new Date()): DateWindow {
  const year = now.getFullYear();
  const month = now.getMonth();
  // El último día del mes: el día 0 del mes siguiente.
  const lastDay = new Date(Date.UTC(year, month + 1, 0)).getUTCDate();
  const prefix = `${year}-${String(month + 1).padStart(2, "0")}`;
  return {
    dateFrom: `${prefix}-01`,
    dateTo: `${prefix}-${String(lastDay).padStart(2, "0")}`,
  };
}

/**
 * The totals of a list of movements, one figure per currency.
 *
 * Two currencies are never added together: 950 pesos and 2500 euros are
 * two totals, not a 3450 that means nothing.
 */
export function totalsByCurrency(
  movements: MoneyRecord[],
  currencies: Currency[],
): CurrencyTotal[] {
  const totals = new Map<string, number>();
  for (const movement of movements) {
    totals.set(
      movement.currencyId,
      (totals.get(movement.currencyId) ?? 0) + movement.amount,
    );
  }
  return [...totals.entries()].map(([currencyId, amount]) => ({
    currencyId,
    symbol:
      currencies.find((currency) => currency.id === currencyId)?.symbol ?? "",
    amount,
  }));
}



/** An item of the "actividad reciente" feed. */
export interface ActivityItem {
  id: string;
  title: string;
  /** "Hace 2 horas" — the relative time. */
  when: Date;
}

/**
 * The latest activity of the user: the timer runs (the only thing with a
 * timestamp we can narrate today).
 */
export function recentActivity(runs: TimerRun[], limit = 5): ActivityItem[] {
  return [...runs]
    .sort((a, b) => b.start.getTime() - a.start.getTime())
    .slice(0, limit)
    .map((run) => ({ id: run.id, title: run.title, when: run.start }));
}

/** "Hace 2 horas" — the relative time of the feed. */
export function formatRelativeTime(
  date: Date,
  now: Date = new Date(),
): string {
  const minutes = Math.floor((now.getTime() - date.getTime()) / 60000);
  if (minutes < 1) return "recién";
  if (minutes < 60) return `hace ${minutes} min`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `hace ${hours} h`;
  const days = Math.floor(hours / 24);
  if (days === 1) return "ayer";
  if (days < 30) return `hace ${days} días`;
  const months = Math.floor(days / 30);
  return `hace ${months} ${months === 1 ? "mes" : "meses"}`;
}
