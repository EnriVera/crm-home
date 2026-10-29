export * from "./contracts.js";
export * from "./timer-contracts.js";

import { z } from "zod";
import {
  ScheduleId,
  ScheduleItemId,
  UserId,
  TaskId,
  ClientId,
  TypeId,
  CategoryId,
} from "../shared/identifiers/index.js";

/** Schedule — PRD-v2 §11 `schedule` table. */
export const Schedule = z.object({
  id: ScheduleId,
  userId: UserId,
  title: z.string().min(1).max(255),
  clientId: ClientId.nullable(),
  taskId: TaskId.nullable(),
  typeId: TypeId.nullable(),
  categoryId: CategoryId.nullable(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
  deletedAt: z.string().datetime().nullable(),
});
export type Schedule = z.infer<typeof Schedule>;

/** ScheduleItem — PRD-v2 §11 `schedule_items` table. */
export const ScheduleItem = z.object({
  id: ScheduleItemId,
  scheduleId: ScheduleId,
  start: z.string().datetime(),
  end: z.string().datetime().nullable(),
  duration: z.string().nullable(), // ISO 8601 interval as text
  origin: z.enum(["manual", "resumed"]),
  lastHeartbeat: z.string().datetime().nullable(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
  deletedAt: z.string().datetime().nullable(),
});
export type ScheduleItem = z.infer<typeof ScheduleItem>;

export const StartTimerInput = z.object({
  title: z.string().min(1).max(255),
  taskId: TaskId.nullable().default(null),
  clientId: ClientId.nullable().default(null),
  typeId: TypeId.nullable().default(null),
  categoryId: CategoryId.nullable().default(null),
});
export type StartTimerInput = z.infer<typeof StartTimerInput>;

export const StopTimerInput = z.object({
  scheduleId: ScheduleId,
});
export type StopTimerInput = z.infer<typeof StopTimerInput>;

export const HeartbeatInput = z.object({
  scheduleId: ScheduleId,
  at: z.string().datetime(),
});
export type HeartbeatInput = z.infer<typeof HeartbeatInput>;

export const ListScheduleHistoryQuery = z.object({
  fromDate: z.string().datetime().optional(),
  toDate: z.string().datetime().optional(),
  typeId: TypeId.optional(),
  categoryId: CategoryId.optional(),
  taskId: TaskId.optional(),
  search: z.string().optional(),
});
export type ListScheduleHistoryQuery = z.infer<typeof ListScheduleHistoryQuery>;
