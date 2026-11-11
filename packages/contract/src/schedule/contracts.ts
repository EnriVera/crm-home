/**
 * Schedule bounded context — request/response zod schemas.
 *
 * Day-of-judgment fix A-001: schemas previously in
 * `@crm/types/contracts/schedules.ts` now live here as the single
 * source of truth. The wire format uses the domain's `sche_*` prefix;
 * the entity in `./index.js` (`Schedule`) is the internal shape.
 */
import { oc } from "@orpc/contract";
import { z } from "zod";
import { uuidSchema } from "../shared/identifiers/index.js";
import {
  calendarDateSchema,
  decimalAmountSchema,
} from "../shared/money/index.js";

export const scheduleFrequencySchema = z.enum([
   "daily",
   "weekly",
   "monthly",
   "yearly",
]);
export const scheduleAmountSchema = decimalAmountSchema("amount", false);
export const scheduleDateSchema = calendarDateSchema();
export const scheduleNameSchema = z.string().min(1).max(100);
export const scheduleDescriptionSchema = z
   .string()
   .max(500)
   .nullable()
   .default(null);

export const scheduleSchema = z.object({
   sche_id: uuidSchema,
   sche_name: z.string(),
   sche_account_id: uuidSchema,
   sche_amount: z.string(),
   sche_currency_id: uuidSchema,
   sche_frequency: scheduleFrequencySchema,
   sche_next_run_date: z.string(),
   sche_is_active: z.boolean(),
   sche_description: z.union([z.string(), z.null()]),
   sche_created_at: z.coerce.date(),
   sche_updated_at: z.coerce.date(),
});

export const createScheduleInputSchema = z.object({
   sche_name: scheduleNameSchema,
   sche_account_id: uuidSchema,
   sche_amount: scheduleAmountSchema,
   sche_currency_id: uuidSchema,
   sche_frequency: scheduleFrequencySchema,
   sche_next_run_date: scheduleDateSchema,
   sche_is_active: z.boolean().default(true),
   sche_description: scheduleDescriptionSchema,
});

export const updateScheduleInputSchema = z.object({
   sche_id: uuidSchema,
   sche_name: scheduleNameSchema.optional(),
   sche_account_id: uuidSchema.optional(),
   sche_amount: scheduleAmountSchema.optional(),
   sche_currency_id: uuidSchema.optional(),
   sche_frequency: scheduleFrequencySchema.optional(),
   sche_next_run_date: scheduleDateSchema.optional(),
   sche_is_active: z.boolean().optional(),
   sche_description: scheduleDescriptionSchema.optional(),
});

export const removeScheduleInputSchema = z.object({
   sche_id: uuidSchema,
});

export const listSchedulesInputSchema = z.object({
   limit: z.number().int().min(1).max(100).default(50),
});

export const schedulesContract = oc
   .errors({
     UNAUTHORIZED: { message: "Authentication required" },
     NOT_FOUND: { message: "Schedule not found" },
     VALIDATION: { message: "Invalid input" },
   })
   .router({
     list: oc.input(listSchedulesInputSchema).output(z.array(scheduleSchema)),
     get: oc.input(z.object({ sche_id: uuidSchema })).output(scheduleSchema),
     create: oc.input(createScheduleInputSchema).output(scheduleSchema),
     update: oc.input(updateScheduleInputSchema).output(scheduleSchema),
     remove: oc
       .input(removeScheduleInputSchema)
       .output(z.object({ ok: z.literal(true) })),
   });

export type ScheduleWire = z.infer<typeof scheduleSchema>;
export type SchedulesContract = typeof schedulesContract;
