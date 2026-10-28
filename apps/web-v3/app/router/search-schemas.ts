import { z } from "zod";

/**
 * Search params live in the URL and are validated per route (PRD-v4 §12.5).
 * Every field is optional so a bare route always parses.
 */
export const configSearchSchema = z.object({
  // Los tabs que /config implementa contra la API actual (PRD-v4 §8.8).
  // Categorías y cuentas no tienen endpoints: entran cuando la API los tenga.
  tab: z
    .enum(["perfil", "estados", "tipos", "apps", "monedas"])
    .optional(),
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
 filter: z.enum(["todos", "activos", "inactivos"]).optional(),
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
