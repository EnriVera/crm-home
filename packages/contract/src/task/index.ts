export * from "./contracts.js";

import { z } from "zod";
import {
   TaskId,
   TaskStateId,
   ClientId,
   TypeId,
   CategoryId,
   UserId,
} from "../shared/identifiers/index.js";
import { PageQuery, Page } from "../shared/pagination/index.js";

/** Task — PRD-v2 §11 `task` table. */
export const Task = z.object({
   id: TaskId,
   userId: UserId,
   title: z.string().min(1).max(255),
   description: z.string().nullable(),
   clientId: ClientId.nullable(),
   typeId: TypeId,
   categoryId: CategoryId.nullable(),
   taskStateId: TaskStateId,
   kanbanOrder: z.number().finite(),
   createdAt: z.string().datetime(),
   updatedAt: z.string().datetime(),
   deletedAt: z.string().datetime().nullable(),
});
export type Task = z.infer<typeof Task>;

/** TaskState — PRD-v2 §11 `task_state` table. */
export const TaskState = z.object({
   id: TaskStateId,
   userId: UserId,
   title: z.string().min(1).max(255),
   color: z.string().nullable(),
   icon: z.string().nullable(),
   order: z.number().int(),
});
export type TaskState = z.infer<typeof TaskState>;

export const TaskInput = z.object({
   title: z.string().min(1).max(255),
   description: z.string().nullable().default(null),
   clientId: ClientId.nullable().default(null),
   typeId: TypeId,
   categoryId: CategoryId.nullable().default(null),
   taskStateId: TaskStateId,
});
export type TaskInput = z.infer<typeof TaskInput>;

export const TaskPatch = TaskInput.partial();
export type TaskPatch = z.infer<typeof TaskPatch>;

/** TaskMoved — domain event emitted on kanban drop. */
export const TaskMoved = z.object({
   taskId: TaskId,
   fromColumnId: TaskStateId,
   toColumnId: TaskStateId,
   toIndex: z.number().int().nonnegative(),
   newKanbanOrder: z.number().finite(),
});
export type TaskMoved = z.infer<typeof TaskMoved>;

export const ListTasksQuery = PageQuery.extend({
   taskStateId: TaskStateId.optional(),
   clientId: ClientId.optional(),
   typeId: TypeId.optional(),
   categoryId: CategoryId.optional(),
});
export type ListTasksQuery = z.infer<typeof ListTasksQuery>;

export const TaskPage = Page(Task);
export type TaskPage = z.infer<typeof TaskPage>;
