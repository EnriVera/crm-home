import { oc } from "@orpc/contract";
import { z } from "zod";
import { uuidSchema } from "./_shared";

/* ---------- Schemas atómicos (D3, D6 del design) ---------- */

export const taskTitleSchema = z
  .string()
  .min(1, { message: "taskTitle is required" })
  .max(200, { message: "taskTitle exceeds 200 chars" });

export const taskDescriptionSchema = z
  .union([z.string().max(50_000), z.null()])
  .default(null);

export const kanbanOrderSchema = z
  .number()
  .refine((n) => Number.isFinite(n), {
    message: "kanbanOrder must be a finite number",
  });

export const taskStateTitleSchema = z
  .string()
  .min(1, { message: "taskStateTitle is required" })
  .max(50, { message: "taskStateTitle exceeds 50 chars" });

export const tastOrderSchema = z.number().int().min(0);

/* ---------- Schemas entidad ---------- */

export const taskSchema = z.object({
  task_id: uuidSchema,
  task_title: z.string(),
  task_description: z.union([z.string(), z.null()]),
  task_tast_id: uuidSchema,
  task_type_id: uuidSchema.nullable(),
  task_cate_id: uuidSchema.nullable(),
  task_clie_id: uuidSchema.nullable(),
  task_kanban_order: z.number(),
  task_created_at: z.coerce.date(),
  task_updated_at: z.coerce.date(),
});
export type Task = z.infer<typeof taskSchema>;

export const taskStateSchema = z.object({
  tast_id: uuidSchema,
  tast_name: z.string(),
  tast_order: tastOrderSchema,
});
export type TaskState = z.infer<typeof taskStateSchema>;

/* ---------- Schemas cliente (búsqueda) ---------- */

export const clientListItemSchema = z.object({
  clie_id: uuidSchema,
  clie_name: z.string(),
});
export type ClientListItem = z.infer<typeof clientListItemSchema>;

export const listClientsSearchInputSchema = z.object({
  query: z.string().min(1),
  limit: z.number().int().min(1).max(50).default(20),
});
export const listClientsSearchOutputSchema = z.array(clientListItemSchema);

/* ---------- Schemas operación: tasks ---------- */

export const listTasksInputSchema = z.object({
  search: z.string().optional(),
});
export const listTasksOutputSchema = z.array(taskSchema);

export const getTaskInputSchema = z.object({ task_id: uuidSchema });
export const getTaskOutputSchema = taskSchema;

export const createTaskInputSchema = z.object({
  task_title: taskTitleSchema,
  task_description: taskDescriptionSchema.optional(),
  task_tast_id: uuidSchema.optional(),
  task_type_id: uuidSchema.nullable().optional(),
  task_cate_id: uuidSchema.nullable().optional(),
  task_clie_id: uuidSchema.nullable().optional(),
});
export const createTaskOutputSchema = taskSchema;

export const updateTaskInputSchema = z
  .object({
    task_id: uuidSchema,
    task_title: taskTitleSchema.optional(),
    task_description: z.union([z.string().max(50_000), z.null()]).optional(),
    task_type_id: uuidSchema.nullable().optional(),
    task_cate_id: uuidSchema.nullable().optional(),
    task_clie_id: uuidSchema.nullable().optional(),
  })
  .strict();
export const updateTaskOutputSchema = taskSchema;

export const moveTaskInputSchema = z.object({
  task_id: uuidSchema,
  target_state_id: uuidSchema,
  prev_task_id: uuidSchema.optional(),
  next_task_id: uuidSchema.optional(),
});
export const moveTaskOutputSchema = taskSchema;

export const deleteTaskInputSchema = z.object({ task_id: uuidSchema });
export const deleteTaskOutputSchema = z.object({ ok: z.literal(true) });

/* ---------- Schemas operación: states ---------- */

export const listTaskStatesOutputSchema = z.array(taskStateSchema);

export const createTaskStateInputSchema = z.object({
  tast_name: taskStateTitleSchema,
  tast_order: tastOrderSchema,
});
export const createTaskStateOutputSchema = taskStateSchema;

export const updateTaskStateInputSchema = z
  .object({
    tast_id: uuidSchema,
    tast_name: taskStateTitleSchema.optional(),
    tast_order: tastOrderSchema.optional(),
  })
  .strict();
export const updateTaskStateOutputSchema = taskStateSchema;

export const deleteTaskStateInputSchema = z.object({ tast_id: uuidSchema });
export const deleteTaskStateOutputSchema = z.object({ ok: z.literal(true) });

export const reorderTaskStatesItemSchema = z.object({
  tast_id: uuidSchema,
  tast_order: tastOrderSchema,
});
export const reorderTaskStatesInputSchema = z
  .array(reorderTaskStatesItemSchema)
  .min(1);
export const reorderTaskStatesOutputSchema = z.object({ ok: z.literal(true) });

/* ---------- Router (TRIANGULATE: prefijo /tasks estable) ---------- */

export const tasksContract = oc.prefix("/tasks").router({
  list: oc
    .route({ method: "POST", path: "/list" })
    .input(listTasksInputSchema)
    .output(listTasksOutputSchema),
  get: oc
    .route({ method: "POST", path: "/get" })
    .input(getTaskInputSchema)
    .output(getTaskOutputSchema),
  create: oc
    .route({ method: "POST", path: "/create" })
    .input(createTaskInputSchema)
    .output(createTaskOutputSchema),
  update: oc
    .route({ method: "POST", path: "/update" })
    .input(updateTaskInputSchema)
    .output(updateTaskOutputSchema),
  move: oc
    .route({ method: "POST", path: "/move" })
    .input(moveTaskInputSchema)
    .output(moveTaskOutputSchema),
  remove: oc
    .route({ method: "POST", path: "/remove" })
    .input(deleteTaskInputSchema)
    .output(deleteTaskOutputSchema),
  states: oc.prefix("/states").router({
    list: oc
      .route({ method: "POST", path: "/list" })
      .output(listTaskStatesOutputSchema),
    create: oc
      .route({ method: "POST", path: "/create" })
      .input(createTaskStateInputSchema)
      .output(createTaskStateOutputSchema),
    update: oc
      .route({ method: "POST", path: "/update" })
      .input(updateTaskStateInputSchema)
      .output(updateTaskStateOutputSchema),
    remove: oc
      .route({ method: "POST", path: "/remove" })
      .input(deleteTaskStateInputSchema)
      .output(deleteTaskStateOutputSchema),
    reorder: oc
      .route({ method: "POST", path: "/reorder" })
      .input(reorderTaskStatesInputSchema)
      .output(reorderTaskStatesOutputSchema),
  }),
  clients: oc.router({
    search: oc
      .route({ method: "POST", path: "/clients/search" })
      .input(listClientsSearchInputSchema)
      .output(listClientsSearchOutputSchema),
  }),
});
