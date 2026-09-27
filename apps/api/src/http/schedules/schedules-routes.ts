import type { H3Event } from "h3";
import { readValidatedBody } from "h3";
import { z } from "zod";
import { ListSchedules } from "../../application/schedules/list-schedules";
import { CreateSchedule } from "../../application/schedules/create-schedule";
import { UpdateSchedule } from "../../application/schedules/update-schedule";
import { RemoveSchedule } from "../../application/schedules/remove-schedule";
import {
  InvalidScheduleInput,
  ScheduleNotFound,
} from "../../application/schedules/errors";
import { mapTaskErrorToStatus } from "../tasks/error-mapping";
import { readUserId } from "../tasks/tasks-routes";

export interface SchedulesRouteDependencies {
  listSchedules: ListSchedules;
  createSchedule: CreateSchedule;
  updateSchedule: UpdateSchedule;
  removeSchedule: RemoveSchedule;
}

const amountSchema = z
  .string()
  .regex(/^\d+(\.\d{1,4})?$/, { message: "amount must be decimal" })
  .refine((v) => Number(v) > 0, { message: "amount must be > 0" });

const dateSchema = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, { message: "date must be YYYY-MM-DD" });

const frequencySchema = z.enum(["daily", "weekly", "monthly", "yearly"]);

const listSchedulesInputSchema = z.object({
  limit: z.number().int().min(1).max(100).default(50),
});

const getScheduleInputSchema = z.object({
  sche_id: z.string().uuid(),
});

const createScheduleInputSchema = z.object({
  sche_name: z.string().min(1).max(100),
  sche_account_id: z.string().uuid(),
  sche_amount: amountSchema,
  sche_currency_id: z.string().uuid(),
  sche_frequency: frequencySchema,
  sche_next_run_date: dateSchema,
  sche_is_active: z.boolean().default(true),
  sche_description: z.string().max(500).nullable().default(null),
});

const updateScheduleInputSchema = z.object({
  sche_id: z.string().uuid(),
  sche_name: z.string().min(1).max(100).optional(),
  sche_account_id: z.string().uuid().optional(),
  sche_amount: amountSchema.optional(),
  sche_currency_id: z.string().uuid().optional(),
  sche_frequency: frequencySchema.optional(),
  sche_next_run_date: dateSchema.optional(),
  sche_is_active: z.boolean().optional(),
  sche_description: z.string().max(500).nullable().optional(),
});

const removeScheduleInputSchema = z.object({
  sche_id: z.string().uuid(),
});

function mapScheduleRowToContract(row: {
  id: string;
  name: string;
  accountId: string;
  amount: string;
  currencyId: string;
  frequency: string;
  nextRunDate: string;
  isActive: boolean;
  description: string | null;
  createdAt: Date;
  updatedAt: Date;
}) {
  return {
    sche_id: row.id,
    sche_name: row.name,
    sche_account_id: row.accountId,
    sche_amount: row.amount,
    sche_currency_id: row.currencyId,
    sche_frequency: row.frequency,
    sche_next_run_date: row.nextRunDate,
    sche_is_active: row.isActive,
    sche_description: row.description,
    sche_created_at: row.createdAt,
    sche_updated_at: row.updatedAt,
  };
}

export function createListSchedulesHandler(deps: SchedulesRouteDependencies) {
  return async (event: H3Event): Promise<Response> => {
    try {
      const userId = readUserId(event);
      const body = await readValidatedBody(event, listSchedulesInputSchema.parse);
      const rows = await deps.listSchedules.execute({
        userId,
        limit: body.limit,
      });
      return Response.json(rows.map(mapScheduleRowToContract));
    } catch (err) {
      const { status, body } = mapTaskErrorToStatus(err);
      return Response.json(body, { status });
    }
  };
}

export function createGetScheduleHandler(deps: SchedulesRouteDependencies) {
  return async (event: H3Event): Promise<Response> => {
    try {
      const userId = readUserId(event);
      const body = await readValidatedBody(event, getScheduleInputSchema.parse);
      const result = await deps.listSchedules.execute({
        userId,
        limit: 100,
      });
      const found = result.find((row) => row.id === body.sche_id);
      if (!found) {
        return Response.json(
          { defined: true, code: "SCHEDULE_NOT_FOUND", message: "Schedule not found" },
          { status: 404 },
        );
      }
      return Response.json(mapScheduleRowToContract(found));
    } catch (err) {
      const { status, body } = mapTaskErrorToStatus(err);
      return Response.json(body, { status });
    }
  };
}

export function createScheduleHandler(deps: SchedulesRouteDependencies) {
  return async (event: H3Event): Promise<Response> => {
    try {
      const userId = readUserId(event);
      const body = await readValidatedBody(event, createScheduleInputSchema.parse);
      const row = await deps.createSchedule.execute({
        userId,
        name: body.sche_name,
        accountId: body.sche_account_id,
        amount: body.sche_amount,
        currencyId: body.sche_currency_id,
        frequency: body.sche_frequency,
        nextRunDate: body.sche_next_run_date,
        isActive: body.sche_is_active ?? true,
        description: body.sche_description ?? null,
      });
      return Response.json(mapScheduleRowToContract(row), { status: 201 });
    } catch (err) {
      if (err instanceof InvalidScheduleInput) {
        return Response.json(
          { defined: true, code: "INVALID_SCHEDULE_INPUT", message: err.message },
          { status: 400 },
        );
      }
      const { status, body } = mapTaskErrorToStatus(err);
      return Response.json(body, { status });
    }
  };
}

export function updateScheduleHandler(deps: SchedulesRouteDependencies) {
  return async (event: H3Event): Promise<Response> => {
    try {
      const userId = readUserId(event);
      const body = await readValidatedBody(event, updateScheduleInputSchema.parse);
      const row = await deps.updateSchedule.execute({
        userId,
        scheduleId: body.sche_id,
        name: body.sche_name,
        accountId: body.sche_account_id,
        amount: body.sche_amount,
        currencyId: body.sche_currency_id,
        frequency: body.sche_frequency,
        nextRunDate: body.sche_next_run_date,
        isActive: body.sche_is_active,
        description: body.sche_description,
      });
      return Response.json(mapScheduleRowToContract(row));
    } catch (err) {
      if (err instanceof InvalidScheduleInput) {
        return Response.json(
          { defined: true, code: "INVALID_SCHEDULE_INPUT", message: err.message },
          { status: 400 },
        );
      }
      if (err instanceof ScheduleNotFound) {
        return Response.json(
          { defined: true, code: "SCHEDULE_NOT_FOUND", message: err.message },
          { status: 404 },
        );
      }
      const { status, body } = mapTaskErrorToStatus(err);
      return Response.json(body, { status });
    }
  };
}

export function removeScheduleHandler(deps: SchedulesRouteDependencies) {
  return async (event: H3Event): Promise<Response> => {
    try {
      const userId = readUserId(event);
      const body = await readValidatedBody(event, removeScheduleInputSchema.parse);
      await deps.removeSchedule.execute({
        userId,
        scheduleId: body.sche_id,
      });
      return Response.json({ ok: true });
    } catch (err) {
      if (err instanceof ScheduleNotFound) {
        return Response.json(
          { defined: true, code: "SCHEDULE_NOT_FOUND", message: err.message },
          { status: 404 },
        );
      }
      const { status, body } = mapTaskErrorToStatus(err);
      return Response.json(body, { status });
    }
  };
}
