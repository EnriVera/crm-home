/**
 * Timer bounded context (el /schedules del PRD-v4 §8.5) — schemas de
 * request/response.
 *
 * OJO: este NO es el módulo `schedule` de las reglas recurrentes de cobro
 * (`contracts.ts` de este mismo archivo). El timer es lo que se ve en
 * /schedules: barra de timer, historial y gráfica.
 *
 * Wire en snake_case (`timer_*`), el dominio en camelCase.
 */
import { oc } from "@orpc/contract";
import { z } from "zod";
import { uuidSchema } from "../shared/identifiers/index.js";

export const timerTitleSchema = z
  .string()
  .min(1, { message: "timerTitle is required" })
  .max(255, { message: "timerTitle exceeds 255 chars" });

export const timerRunSchema = z.object({
  timer_id: uuidSchema,
  timer_title: z.string(),
  timer_task_id: uuidSchema.nullable(),
  timer_client_id: uuidSchema.nullable(),
  timer_type_id: uuidSchema.nullable(),
  timer_category_id: uuidSchema.nullable(),
  timer_start: z.coerce.date(),
  timer_end: z.coerce.date().nullable(),
  timer_duration_seconds: z.number().int().nullable(),
  timer_origin: z.enum(["manual", "resumed"]),
  timer_last_heartbeat: z.coerce.date().nullable(),
});

export const startTimerInputSchema = z.object({
  timer_title: timerTitleSchema,
  timer_task_id: uuidSchema.nullable().default(null),
  timer_client_id: uuidSchema.nullable().default(null),
  timer_type_id: uuidSchema.nullable().default(null),
  timer_category_id: uuidSchema.nullable().default(null),
  /** 'resumed' cuando se reinicia una corrida del historial. */
  timer_origin: z.enum(["manual", "resumed"]).default("manual"),
});

export const stopTimerInputSchema = z.object({ timer_id: uuidSchema });

export const heartbeatTimerInputSchema = z.object({
  timer_id: uuidSchema,
  timer_at: z.coerce.date().optional(),
});

export const listTimerRunsInputSchema = z.object({
  timer_from: z.coerce.date().optional(),
  timer_to: z.coerce.date().optional(),
  timer_type_id: uuidSchema.optional(),
  timer_category_id: uuidSchema.optional(),
  timer_task_id: uuidSchema.optional(),
  timer_search: z.string().max(100).optional(),
  timer_limit: z.number().int().min(1).max(500).default(100),
});

export const timerContract = oc
  .errors({
    UNAUTHORIZED: { message: "Authentication required" },
    NOT_FOUND: { message: "Timer not found" },
    VALIDATION: { message: "Invalid input" },
  })
  .router({
    /** The run that is running right now (null when there is none). */
    current: oc.output(timerRunSchema.nullable()),
    start: oc.input(startTimerInputSchema).output(timerRunSchema),
    stop: oc.input(stopTimerInputSchema).output(timerRunSchema),
    heartbeat: oc.input(heartbeatTimerInputSchema).output(timerRunSchema),
    history: oc.input(listTimerRunsInputSchema).output(z.array(timerRunSchema)),
  });

export type TimerRunWire = z.infer<typeof timerRunSchema>;
export type TimerContract = typeof timerContract;
