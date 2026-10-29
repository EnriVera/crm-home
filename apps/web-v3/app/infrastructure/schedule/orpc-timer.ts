/**
 * Timer adapter: the only place that talks to the API about the timer
 * (PRD-v4 §8.5).
 *
 * OJO: el contexto `schedules` de la API es el de las reglas recurrentes
 * de cobro; el timer vive en `timers/*`.
 */
import type { TimerRun } from "~/domain/schedule/entities";
import { callTimers, type TimerWire } from "~/shared/vendor/orpc";

function toTimerRun(wire: TimerWire): TimerRun {
  return {
    id: wire.timer_id,
    title: wire.timer_title,
    taskId: wire.timer_task_id,
    clientId: wire.timer_client_id,
    typeId: wire.timer_type_id,
    categoryId: wire.timer_category_id,
    start: new Date(wire.timer_start),
    end: wire.timer_end ? new Date(wire.timer_end) : null,
    durationSeconds: wire.timer_duration_seconds,
    origin: wire.timer_origin,
    lastHeartbeat: wire.timer_last_heartbeat
      ? new Date(wire.timer_last_heartbeat)
      : null,
  };
}

/** The run that is running right now (null when there is none). */
export async function getCurrentTimer(): Promise<TimerRun | null> {
  const wire = await callTimers("current", undefined);
  return wire ? toTimerRun(wire) : null;
}

export interface StartTimerInput {
  title: string;
  taskId: string | null;
  clientId: string | null;
  typeId: string | null;
  categoryId: string | null;
  origin?: "manual" | "resumed";
}

export async function startTimer(input: StartTimerInput): Promise<TimerRun> {
  const wire = await callTimers("start", {
    timer_title: input.title,
    timer_task_id: input.taskId,
    timer_client_id: input.clientId,
    timer_type_id: input.typeId,
    timer_category_id: input.categoryId,
    timer_origin: input.origin ?? "manual",
  });
  return toTimerRun(wire);
}

export async function stopTimer(timerId: string): Promise<TimerRun> {
  const wire = await callTimers("stop", { timer_id: timerId });
  return toTimerRun(wire);
}

export async function heartbeatTimer(timerId: string): Promise<TimerRun> {
  const wire = await callTimers("heartbeat", { timer_id: timerId });
  return toTimerRun(wire);
}

export interface TimerHistoryInput {
  from?: Date;
  to?: Date;
  typeId?: string;
  categoryId?: string;
  taskId?: string;
  search?: string;
  limit?: number;
}

export async function listTimerRuns(
  input: TimerHistoryInput = {},
): Promise<TimerRun[]> {
  const wire = await callTimers("history", {
    ...(input.from ? { timer_from: input.from.toISOString() } : {}),
    ...(input.to ? { timer_to: input.to.toISOString() } : {}),
    ...(input.typeId ? { timer_type_id: input.typeId } : {}),
    ...(input.categoryId ? { timer_category_id: input.categoryId } : {}),
    ...(input.taskId ? { timer_task_id: input.taskId } : {}),
    ...(input.search ? { timer_search: input.search } : {}),
    timer_limit: input.limit ?? 200,
  });
  return wire.map(toTimerRun);
}
