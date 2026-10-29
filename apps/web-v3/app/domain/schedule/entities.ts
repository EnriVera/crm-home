/**
 * Schedule (timer) read model — pure TypeScript (PRD-v4 §11.4).
 *
 * The wire format is snake_case (`timer_*`); the domain speaks camelCase.
 * The mapping lives in the infrastructure adapter.
 *
 * The clock belongs to the server: the run is computed from `start`, so
 * closing the browser does not lose the time (PRD-v2 §8.4 criterion).
 */

/** A run of the timer. */
export interface TimerRun {
  id: string;
  title: string;
  taskId: string | null;
  clientId: string | null;
  typeId: string | null;
  categoryId: string | null;
  start: Date;
  /** null = the run is still open. */
  end: Date | null;
  /** Seconds, computed when the run closes. */
  durationSeconds: number | null;
  origin: "manual" | "resumed";
  lastHeartbeat: Date | null;
}

/** The seconds elapsed by a run that is still open. */
export function elapsedSeconds(run: TimerRun, now: Date): number {
  if (run.end) return run.durationSeconds ?? 0;
  return Math.max(0, Math.floor((now.getTime() - run.start.getTime()) / 1000));
}

/**
 * The duration of a run, closed or open.
 */
export function runDurationSeconds(run: TimerRun, now: Date): number {
  return elapsedSeconds(run, now);
}

/**
 * "1h 05m" / "12m 30s" — the format the catalogue uses for the timer.
 *
 * The seconds only show when the run is under a minute (the big timer in
 * the bar counts seconds; the history shows minutes).
 */
export function formatDuration(seconds: number, withSeconds = false): string {
  const safe = Math.max(0, Math.floor(seconds));
  const hours = Math.floor(safe / 3600);
  const minutes = Math.floor((safe % 3600) / 60);
  const secs = safe % 60;
  if (hours > 0) {
    return `${hours}h ${String(minutes).padStart(2, "0")}m`;
  }
  if (minutes > 0 || !withSeconds) {
    return `${minutes}m ${String(secs).padStart(2, "0")}s`;
  }
  return `${secs}s`;
}

/** "09:12 – 10:50" — the time range of a run in the history. */
export function formatTimeRange(run: TimerRun): string {
  const start = formatClock(run.start);
  const end = run.end ? formatClock(run.end) : "";
  return end ? `${start} – ${end}` : start;
}

/** "09:12" in the local timezone. */
export function formatClock(date: Date): string {
  const hours = String(date.getHours()).padStart(2, "0");
  const minutes = String(date.getMinutes()).padStart(2, "0");
  return `${hours}:${minutes}`;
}

/** "28 jun" — the day a run happened. */
export function formatDay(date: Date): string {
  const months = [
    "ene",
    "feb",
    "mar",
    "abr",
    "may",
    "jun",
    "jul",
    "ago",
    "sep",
    "oct",
    "nov",
    "dic",
  ];
  return `${date.getDate()} ${months[date.getMonth()]}`;
}

/** The local day key of a date: "2026-06-28". */
export function dayKey(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

/** The start of the day, for the "hoy" filters. */
export function startOfDay(date: Date): Date {
  const copy = new Date(date);
  copy.setHours(0, 0, 0, 0);
  return copy;
}

/** The start of the week (Monday), for the "esta semana" filters. */
export function startOfWeek(date: Date): Date {
  const copy = startOfDay(date);
  const weekday = (copy.getDay() + 6) % 7;
  copy.setDate(copy.getDate() - weekday);
  return copy;
}

/**
 * The total seconds of the runs that overlap a period.
 *
 * A run that started before the period counts the part that falls inside
 * it, so the "total of today" does not get inflated with yesterday's timers.
 *
 * A CLOSED run has its own `end` (the server's truth): if the browser
 * clock is a second behind, the `to` does not trim it. Only the open runs
 * are cut at `to`.
 */
export function totalSeconds(
  runs: TimerRun[],
  from: Date,
  to: Date,
  now: Date = new Date(),
): number {
  return runs.reduce((total, run) => {
    const start = run.start.getTime();
    const end = run.end ? run.end.getTime() : now.getTime();
    const fromMs = from.getTime();
    const toMs = to.getTime();
    const effectiveStart = Math.max(start, fromMs);
    const effectiveEnd = run.end ? end : Math.min(end, toMs);
    return total + Math.max(0, Math.floor((effectiveEnd - effectiveStart) / 1000));
  }, 0);
}

/**
 * The time by type, for the donut of PRD-v4 §8.5.
 *
 * A free timer has no type: it goes to the "Sin tipo" slice (it IS a
 * meaningful slice — the time you did not link to anything).
 */
export function groupByType(
  runs: TimerRun[],
  typeNames: Map<string, string>,
  now: Date = new Date(),
): { id: string; label: string; seconds: number }[] {
  const totals = new Map<string, number>();
  for (const run of runs) {
    const key = run.typeId ?? "";
    const end = run.end ? run.end.getTime() : now.getTime();
    const seconds = Math.max(0, Math.floor((end - run.start.getTime()) / 1000));
    totals.set(key, (totals.get(key) ?? 0) + seconds);
  }
  return [...totals.entries()]
    .map(([id, seconds]) => ({
      id,
      label: id === "" ? "Sin tipo" : (typeNames.get(id) ?? "Sin tipo"),
      seconds,
    }))
    .sort((a, b) => b.seconds - a.seconds);
}

/**
 * The runs that match the filters of the detail table (PRD-v2 §8.4.3:
 * search + filters by type, category and task).
 */
export function filterRuns(
  runs: TimerRun[],
  filters: {
    search?: string;
    typeId?: string | null;
    categoryId?: string | null;
    taskId?: string | null;
  },
): TimerRun[] {
  const needle = filters.search?.trim().toLowerCase() ?? "";
  return runs.filter((run) => {
    if (filters.typeId && run.typeId !== filters.typeId) return false;
    if (filters.categoryId && run.categoryId !== filters.categoryId)
      return false;
    if (filters.taskId && run.taskId !== filters.taskId) return false;
    if (needle && !run.title.toLowerCase().includes(needle)) return false;
    return true;
  });
}

/**
 * The runs grouped by day (the "detalle por día" of PRD-v2 §8.4.3).
 */
export function groupByDay(
  runs: TimerRun[],
): { day: string; date: Date; runs: TimerRun[] }[] {
  const groups = new Map<string, { day: string; date: Date; runs: TimerRun[] }>();
  for (const run of runs) {
    const key = dayKey(run.start);
    const group = groups.get(key) ?? {
      day: key,
      date: run.start,
      runs: [],
    };
    group.runs.push(run);
    groups.set(key, group);
  }
  return [...groups.values()].sort((a, b) => b.date.getTime() - a.date.getTime());
}

/**
 * The run with the most hours in the period (the "tarea con más horas"
 * stat of the catalogue).
 */
export function longestRun(
  runs: TimerRun[],
  from: Date,
  to: Date,
  now: Date = new Date(),
): TimerRun | null {
  let best: TimerRun | null = null;
  let bestSeconds = 0;
  for (const run of runs) {
    const start = run.start.getTime();
    const end = run.end ? run.end.getTime() : now.getTime();
    const effectiveStart = Math.max(start, from.getTime());
    const effectiveEnd = run.end ? end : Math.min(end, to.getTime());
    const seconds = Math.max(0, Math.floor((effectiveEnd - effectiveStart) / 1000));
    if (seconds > bestSeconds) {
      best = run;
      bestSeconds = seconds;
    }
  }
  return best;
}
