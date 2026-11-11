import type { H3Event } from "h3";
import { readValidatedBody } from "h3";
import {
  startTimerInputSchema,
  stopTimerInputSchema,
  heartbeatTimerInputSchema,
  listTimerRunsInputSchema,
} from "@crm/contract/schedule";
import type { StartTimer } from "../../application/timers/start-timer";
import type { StopTimer } from "../../application/timers/stop-timer";
import type { HeartbeatTimer } from "../../application/timers/heartbeat-timer";
import type { GetCurrentTimer } from "../../application/timers/get-current-timer";
import type { ListTimerRuns } from "../../application/timers/list-timer-runs";
import type { TimerRunRow } from "../../domain/ports/timer-run-repository";
import { mapDomainErrorToStatus } from "../error-mapping";
import { readUserId } from "../request-user";

/**
 * Entry HTTP del TIMER de /schedules (PRD-v4 §8.5).
 *
 * No confundir con `/schedules/*` (reglas recurrentes de cobro): el timer
 * vive bajo `/timers/*`.
 */
export interface TimerRouteDependencies {
  startTimer: StartTimer;
  stopTimer: StopTimer;
  heartbeatTimer: HeartbeatTimer;
  getCurrentTimer: GetCurrentTimer;
  listTimerRuns: ListTimerRuns;
}

// Los schemas de entrada vienen del contrato (`@crm/contract/schedule`): la
// API no re-declara lo que el contrato ya define.

function mapTimerRunToContract(row: TimerRunRow) {
  return {
    timer_id: row.id,
    timer_title: row.title,
    timer_task_id: row.taskId,
    timer_client_id: row.clientId,
    timer_type_id: row.typeId,
    timer_category_id: row.categoryId,
    timer_start: row.start,
    timer_end: row.end,
    timer_duration_seconds: row.durationSeconds,
    timer_origin: row.origin,
    timer_last_heartbeat: row.lastHeartbeat,
  };
}

export function createGetCurrentTimerHandler(deps: TimerRouteDependencies) {
  return async (event: H3Event): Promise<Response> => {
    try {
      const userId = readUserId(event);
      const current = await deps.getCurrentTimer.execute({ userId });
      return Response.json(current ? mapTimerRunToContract(current) : null);
    } catch (err) {
      const { status, body } = mapDomainErrorToStatus(err);
      return Response.json(body, { status });
    }
  };
}

export function createStartTimerHandler(deps: TimerRouteDependencies) {
  return async (event: H3Event): Promise<Response> => {
    try {
      const userId = readUserId(event);
      const body = await readValidatedBody(event, startTimerInputSchema.parse);
      const row = await deps.startTimer.execute({
        userId,
        title: body.timer_title,
        taskId: body.timer_task_id,
        clientId: body.timer_client_id,
        typeId: body.timer_type_id,
        categoryId: body.timer_category_id,
        origin: body.timer_origin,
      });
      return Response.json(mapTimerRunToContract(row), { status: 201 });
    } catch (err) {
      const { status, body } = mapDomainErrorToStatus(err);
      return Response.json(body, { status });
    }
  };
}

export function createStopTimerHandler(deps: TimerRouteDependencies) {
  return async (event: H3Event): Promise<Response> => {
    try {
      const userId = readUserId(event);
      const body = await readValidatedBody(event, stopTimerInputSchema.parse);
      const row = await deps.stopTimer.execute({
        userId,
        timerId: body.timer_id,
      });
      return Response.json(mapTimerRunToContract(row));
    } catch (err) {
      const { status, body } = mapDomainErrorToStatus(err);
      return Response.json(body, { status });
    }
  };
}

export function createHeartbeatTimerHandler(deps: TimerRouteDependencies) {
  return async (event: H3Event): Promise<Response> => {
    try {
      const userId = readUserId(event);
      const body = await readValidatedBody(event, heartbeatTimerInputSchema.parse);
      const row = await deps.heartbeatTimer.execute({
        userId,
        timerId: body.timer_id,
      });
      return Response.json(mapTimerRunToContract(row));
    } catch (err) {
      const { status, body } = mapDomainErrorToStatus(err);
      return Response.json(body, { status });
    }
  };
}

export function createListTimerRunsHandler(deps: TimerRouteDependencies) {
  return async (event: H3Event): Promise<Response> => {
    try {
      const userId = readUserId(event);
      const body = await readValidatedBody(event, listTimerRunsInputSchema.parse);
      const rows = await deps.listTimerRuns.execute({
        userId,
        ...(body.timer_from ? { from: body.timer_from } : {}),
        ...(body.timer_to ? { to: body.timer_to } : {}),
        ...(body.timer_type_id ? { typeId: body.timer_type_id } : {}),
        ...(body.timer_category_id ? { categoryId: body.timer_category_id } : {}),
        ...(body.timer_task_id ? { taskId: body.timer_task_id } : {}),
        ...(body.timer_search ? { search: body.timer_search } : {}),
        limit: body.timer_limit,
      });
      return Response.json(rows.map(mapTimerRunToContract));
    } catch (err) {
      const { status, body } = mapDomainErrorToStatus(err);
      return Response.json(body, { status });
    }
  };
}
