import { z } from "zod";

/**
 * Search params live in the URL and are validated per route (PRD-v4 §12.5).
 * Every field is optional so a bare route always parses.
 */
export const configSearchSchema = z.object({
  // The tabs that /config implements against the API (PRD-v4 §8.8).
  tab: z
    .enum(["perfil", "estados", "tipos", "categorias", "apps", "monedas"])
    .optional(),
  // The create/edit drawer lives in the URL (PRD-v4 §9.1):
  // `?tab=tipos&drawer=new` to create, `?tab=tipos&edit=<id>` to edit.
  drawer: z.string().min(1).optional(),
  edit: z.string().min(1).optional(),
});

export const tasksSearchSchema = z.object({
 view: z.enum(["grilla", "lista", "kanban"]).optional(),
 drawer: z.string().min(1).optional(),
 edit: z.string().min(1).optional(),
});

export const schedulesSearchSchema = z.object({
 range: z.enum(["hoy", "semana", "mes"]).optional(),
});

export const clientsSearchSchema = z.object({
  // The create/edit drawer lives in the URL (PRD-v4 §9.1).
  // `delete=1` opens the drawer in delete-confirmation mode (used by the
  // card's delete button).
  // There are NO state filters: the clients table has no state column
  // (the catalog shows them, the DB does not have them).
  drawer: z.string().min(1).optional(),
  edit: z.string().min(1).optional(),
  delete: z.string().optional(),
});

export const financeSearchSchema = z.object({
 drawer: z.string().min(1).optional(),
 edit: z.string().min(1).optional(),
});

export const searchSchemas = {
 config: configSearchSchema,
 tasks: tasksSearchSchema,
 schedules: schedulesSearchSchema,
 clients: clientsSearchSchema,
 incomes: financeSearchSchema,
 expenses: financeSearchSchema,
 transfers: financeSearchSchema,
} as const;

export type SearchSchemaName = keyof typeof searchSchemas;

export type SearchParams<K extends SearchSchemaName> = z.infer<
 (typeof searchSchemas)[K]
>;
