/**
 * Dashboard derivations — pure TypeScript (PRD-v4 §11.4).
 *
 * The dashboard shows real numbers (money, tasks, hours, activity); these
 * helpers turn the raw lists into what the cards display.
 */
import type { Movement } from "~/infrastructure/finance/orpc-finance";
import type { TimerRun } from "~/domain/schedule/entities";

/** The movements of the current month (the wire dates are "YYYY-MM-DD"). */
export function monthMovements(
  movements: Movement[],
  now: Date = new Date(),
): Movement[] {
  const month = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  return movements.filter((movement) => movement.date.startsWith(month));
}

/** The sum of the amounts of a list of movements. */
export function sumAmount(movements: Movement[]): number {
  return movements.reduce((total, movement) => total + movement.amount, 0);
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
