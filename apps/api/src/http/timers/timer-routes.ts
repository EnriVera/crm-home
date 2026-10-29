import type { H3Event } from "h3";
import { readValidatedBody } from "h3";
import { z } from "zod";
import type { StartTimer } from "../../application/timers/start-timer";
import type { StopTimer } from "../../application/timers/stop-timer";
import type { HeartbeatTimer } from "../../application/timers/heartbeat-timer";
import type { GetCurrentTimer } from "../../application/timers/get-current-timer";
import type { ListTimerRuns } from "../../application/timers/list-timer-runs";
import type { TimerRunRow } from "../../domain/ports/timer-run-repository";
import { InvalidTimerInput, TimerNotFound } from "../../application/timers/errors";
import { TimerAlreadyRunningError } from "../../domain/timers/errors";
import { mapTaskErrorToStatus } from "../tasks/error-mapping";
import { readUserId } from "../tasks/tasks-routes";

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

const startTimerInputSchema = z.object({
  timer_title: z.string().min(1).max(255),
  timer_task_id: z.string().uuid().nullable().default(null),
  timer_client_id: z.string().uuid().nullable().default(null),
  timer_type_id: z.string().uuid().nullable().default(null),
  timer_category_id: z.string().uuid().nullable().default(null),
  timer_origin: z.enum(["manual", "resumed"]).default("manual"),
});

const stopTimerInputSchema = z.object({ timer_id: z.string().uuid() });

const heartbeatTimerInputSchema = z.object({
  timer_id: z.string().uuid(),
  timer_at: z.coerce.date().optional(),
});

const listTimerRunsInputSchema = z.object({
  timer_from: z.coerce.date().optional(),
  timer_to: z.coerce.date().optional(),
  timer_type_id: z.string().uuid().optional(),
  timer_category_id: z.string().uuid().optional(),
  timer_task_id: z.string().uuid().optional(),
  timer_search: z.string().max(100).optional(),
  timer_limit: z.number().int().min(1).max(500).default(100),
});

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
      const { status, body } = mapTaskErrorToStatus(err);
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
      if (err instanceof InvalidTimerInput) {
        return Response.json(
          {
            defined: true,
            code: "INVALID_TIMER_INPUT",
            message: err.message,
          },
          { status: 400 },
        );
      }
      if (err instanceof TimerAlreadyRunningError) {
        // El arranque perdió la carrera contra otro simultáneo y agotó
        // los reintentos: es un conflicto, no un server roto.
        return Response.json(
          {
            defined: true,
            code: "TIMER_ALREADY_RUNNING",
            message: err.message,
          },
          { status: 409 },
        );
      }
      const { status, body } = mapTaskErrorToStatus(err);
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
      if (err instanceof TimerNotFound) {
        return Response.json(
          { defined: true, code: "TIMER_NOT_FOUND", message: err.message },
          { status: 404 },
        );
      }
      const { status, body } = mapTaskErrorToStatus(err);
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
        ...(body.timer_at ? { at: body.timer_at } : {}),
      });
      return Response.json(mapTimerRunToContract(row));
    } catch (err) {
      if (err instanceof TimerNotFound) {
        return Response.json(
          { defined: true, code: "TIMER_NOT_FOUND", message: err.message },
          { status: 404 },
        );
      }
      const { status, body } = mapTaskErrorToStatus(err);
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
      const { status, body } = mapTaskErrorToStatus(err);
      return Response.json(body, { status });
    }
  };
}
