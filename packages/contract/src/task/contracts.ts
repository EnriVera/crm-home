/**
 * Task bounded context — request/response zod schemas.
 *
 * Day-of-judgment fix A-001: schemas previously in
 * `@crm/types/contracts/tasks.ts` now live here as the single source
 * of truth. The wire format uses the domain's `task_*` prefix; the
 * entity in `./index.js` (`Task`, `TaskState`) is the internal shape.
 */
import { oc } from "@orpc/contract";
import { z } from "zod";
import { uuidSchema } from "../shared/identifiers/index.js";

/* ============================================================== */
/*  Atomic (shared) schemas                                        */
/* ============================================================== */

export const taskTitleSchema = z
   .string()
   .min(1, { message: "taskTitle is required" })
   .max(200, { message: "taskTitle exceeds 200 chars" });

export const taskDescriptionSchema = z
   .union([z.string().max(50_000), z.null()])
   .default(null);

export const taskStateTitleSchema = z
   .string()
   .min(1, { message: "taskStateTitle is required" })
   .max(50, { message: "taskStateTitle exceeds 50 chars" });

export const tastOrderSchema = z.number().int().min(0);

/* ============================================================== */
/*  Entity (read-side) schemas — wire format (snake_case)          */
/* ============================================================== */

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
/** Wire shape (snake_case). Distinct from the entity `Task`
 *  re-exported from the barrel (camelCase). */
export type TaskWire = z.infer<typeof taskSchema>;

export const taskStateSchema = z.object({
   tast_id: uuidSchema,
   tast_name: z.string(),
   tast_order: tastOrderSchema,
});
/** Wire shape (snake_case). */
export type TaskStateWire = z.infer<typeof taskStateSchema>;

/* ============================================================== */
/*  Form list item (client search-as-you-type)                    */
/* ============================================================== */

export const clientListItemSchema = z.object({
   clie_id: uuidSchema,
   clie_name: z.string(),
});
/** Named without `Wire` suffix because the original API code uses
 *  `ClientListItem` directly. */
export type ClientListItem = z.infer<typeof clientListItemSchema>;

/* ============================================================== */
/*  Form list items (type / category cascade)                     */
/* ============================================================== */

export const typeForFormSchema = z.object({
   type_id: uuidSchema,
   type_name: z.string(),
   type_modules: z.array(z.string()),
});
export type TypeForForm = z.infer<typeof typeForFormSchema>;

export const categoryForFormSchema = z.object({
   cate_id: uuidSchema,
   cate_name: z.string(),
   cate_type_id: uuidSchema,
});
export type CategoryForForm = z.infer<typeof categoryForFormSchema>;

/* ============================================================== */
/*  Inputs (write-side)                                            */
/* ============================================================== */

export const listClientsSearchInputSchema = z.object({
   query: z.string().min(1),
   limit: z.number().int().min(1).max(50).default(20),
});
export const listClientsSearchOutputSchema = z.array(clientListItemSchema);

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

/* ============================================================== */
/*  Task states                                                    */
/* ============================================================== */

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

/* ============================================================== */
/*  Form listers (type / category cascade)                        */
/* ============================================================== */

export const listTypesForFormInputSchema = z.object({
   module: z.string().min(1).optional(),
   clie_id: uuidSchema.optional(),
});
export const listTypesForFormOutputSchema = z.array(typeForFormSchema);

export const listCategoriesByTypeInputSchema = z.object({
   type_id: uuidSchema,
});
export const listCategoriesByTypeOutputSchema = z.array(categoryForFormSchema);

/* ============================================================== */
/*  Contract router                                                */
/* ============================================================== */

export const tasksContract = oc.prefix("/tasks").router({
   list: oc.input(listTasksInputSchema).output(listTasksOutputSchema),
   get: oc.input(getTaskInputSchema).output(getTaskOutputSchema),
   create: oc.input(createTaskInputSchema).output(createTaskOutputSchema),
   update: oc.input(updateTaskInputSchema).output(updateTaskOutputSchema),
   move: oc.input(moveTaskInputSchema).output(moveTaskOutputSchema),
   remove: oc.input(deleteTaskInputSchema).output(deleteTaskOutputSchema),
   states: oc.prefix("/states").router({
     list: oc.output(listTaskStatesOutputSchema),
     create: oc
       .input(createTaskStateInputSchema)
       .output(createTaskStateOutputSchema),
     update: oc
       .input(updateTaskStateInputSchema)
       .output(updateTaskStateOutputSchema),
     remove: oc
       .input(deleteTaskStateInputSchema)
       .output(deleteTaskStateOutputSchema),
     reorder: oc
       .input(reorderTaskStatesInputSchema)
       .output(reorderTaskStatesOutputSchema),
   }),
   clients: oc.router({
     search: oc
       .input(listClientsSearchInputSchema)
       .output(listClientsSearchOutputSchema),
   }),
   types: oc.router({
     listForForm: oc
       .input(listTypesForFormInputSchema)
       .output(listTypesForFormOutputSchema),
   }),
   categories: oc.router({
     listByType: oc
       .input(listCategoriesByTypeInputSchema)
       .output(listCategoriesByTypeOutputSchema),
   }),
});

export type TasksContract = typeof tasksContract;
