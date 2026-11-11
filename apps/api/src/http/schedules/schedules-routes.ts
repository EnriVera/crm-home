import type { H3Event } from "h3";
import { readValidatedBody } from "h3";
import {
  createScheduleInputSchema,
  removeScheduleInputSchema,
  updateScheduleInputSchema,
} from "@crm/contract/schedule";
import { z } from "zod";
import { ListSchedules } from "../../application/schedules/list-schedules";
import { CreateSchedule } from "../../application/schedules/create-schedule";
import { UpdateSchedule } from "../../application/schedules/update-schedule";
import { RemoveSchedule } from "../../application/schedules/remove-schedule";
import {
  InvalidScheduleInput,
  ScheduleNotFound,
} from "../../application/schedules/errors";
import { mapDomainErrorToStatus } from "../error-mapping";
import { readUserId } from "../request-user";

export interface SchedulesRouteDependencies {
  listSchedules: ListSchedules;
  createSchedule: CreateSchedule;
  updateSchedule: UpdateSchedule;
  removeSchedule: RemoveSchedule;
}

const frequencySchema = z.enum(["daily", "weekly", "monthly", "yearly"]);

const listSchedulesInputSchema = z.object({
  limit: z.number().int().min(1).max(100).default(50),
});

const getScheduleInputSchema = z.object({
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
      const body = await readValidatedBody(
        event,
        listSchedulesInputSchema.parse,
      );
      const rows = await deps.listSchedules.execute({
        userId,
        limit: body.limit,
      });
      return Response.json(rows.map(mapScheduleRowToContract));
    } catch (err) {
      const { status, body } = mapDomainErrorToStatus(err);
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
          {
            defined: true,
            code: "SCHEDULE_NOT_FOUND",
            message: "Schedule not found",
          },
          { status: 404 },
        );
      }
      return Response.json(mapScheduleRowToContract(found));
    } catch (err) {
      const { status, body } = mapDomainErrorToStatus(err);
      return Response.json(body, { status });
    }
  };
}

export function createScheduleHandler(deps: SchedulesRouteDependencies) {
  return async (event: H3Event): Promise<Response> => {
    try {
      const userId = readUserId(event);
      const body = await readValidatedBody(
        event,
        createScheduleInputSchema.parse,
      );
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
      const { status, body } = mapDomainErrorToStatus(err);
      return Response.json(body, { status });
    }
  };
}

export function updateScheduleHandler(deps: SchedulesRouteDependencies) {
  return async (event: H3Event): Promise<Response> => {
    try {
      const userId = readUserId(event);
      const body = await readValidatedBody(
        event,
        updateScheduleInputSchema.parse,
      );
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
      const { status, body } = mapDomainErrorToStatus(err);
      return Response.json(body, { status });
    }
  };
}

export function removeScheduleHandler(deps: SchedulesRouteDependencies) {
  return async (event: H3Event): Promise<Response> => {
    try {
      const userId = readUserId(event);
      const body = await readValidatedBody(
        event,
        removeScheduleInputSchema.parse,
      );
      await deps.removeSchedule.execute({
        userId,
        scheduleId: body.sche_id,
      });
      return Response.json({ ok: true });
    } catch (err) {
      const { status, body } = mapDomainErrorToStatus(err);
      return Response.json(body, { status });
    }
  };
}
