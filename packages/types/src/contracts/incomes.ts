import { oc } from "@orpc/contract";
import { z } from "zod";
import { uuidSchema } from "./_shared";

/* ---------- Schemas atómicos ---------- */

/** NUMERIC(19,4) en Postgres: string decimal-safe para no perder precisión. */
export const incomeAmountSchema = z
 .string()
 .regex(/^\d+(\.\d{1,4})?$/, {
  message: "amount must be a decimal string with up to 4 fraction digits",
 })
 .refine((v) => Number(v) > 0, { message: "amount must be > 0" });

/** YYYY-MM-DD (Postgres DATE). */
export const incomeDateSchema = z
 .string()
 .regex(/^\d{4}-\d{2}-\d{2}$/, { message: "date must be YYYY-MM-DD" });

export const incomeDescriptionSchema = z
 .string()
 .max(500, { message: "description exceeds 500 chars" })
 .nullable()
 .default(null);

export const incomeCategorySchema = z
 .string()
 .max(100, { message: "category exceeds 100 chars" })
 .nullable()
 .default(null);

/** Filtros de búsqueda: rango de fechas + search libre. */
export const incomeSearchSchema = z.string().max(100).default("");

export const incomeLimitSchema = z.number().int().min(1).max(100).default(50);

/* ---------- Schema entidad (read-side) ---------- */

export const incomeSchema = z.object({
 inco_id: uuidSchema,
 inco_account_id: uuidSchema,
 inco_amount: z.string(),
 inco_currency_id: uuidSchema,
 inco_description: z.union([z.string(), z.null()]),
 inco_category: z.union([z.string(), z.null()]),
 inco_date: z.string(),
 inco_created_at: z.coerce.date(),
 inco_updated_at: z.coerce.date(),
});

/* ---------- Schemas de input (write-side) ---------- */

export const createIncomeInputSchema = z.object({
 inco_account_id: uuidSchema,
 inco_amount: incomeAmountSchema,
 inco_currency_id: uuidSchema,
 inco_description: incomeDescriptionSchema,
 inco_category: incomeCategorySchema,
 inco_date: incomeDateSchema,
});

export const updateIncomeInputSchema = z.object({
 inco_id: uuidSchema,
 inco_account_id: uuidSchema.optional(),
 inco_amount: incomeAmountSchema.optional(),
 inco_currency_id: uuidSchema.optional(),
 inco_description: incomeDescriptionSchema.optional(),
 inco_category: incomeCategorySchema.optional(),
 inco_date: incomeDateSchema.optional(),
});

export const removeIncomeInputSchema = z.object({
 inco_id: uuidSchema,
});

export const listIncomesInputSchema = z.object({
 search: incomeSearchSchema,
 date_from: incomeDateSchema.nullable().default(null),
 date_to: incomeDateSchema.nullable().default(null),
 limit: incomeLimitSchema,
});

/* ---------- Contract ---------- */

/**
 * Contract del módulo `incomes` (PRD §D5 — financial accounts).
 *
 * 5 operaciones: `list` (read con filtros), `get` (read single),
 * `create` / `update` / `remove` (soft-delete). Convenciones snake_case
 * en inputs/outputs; el handler hace el mapeo a camelCase del dominio.
 *
 *   rpc.incomes.list({ search, date_from, date_to, limit })
 *   rpc.incomes.get({ inco_id })
 *   rpc.incomes.create({ inco_account_id, inco_amount, ... })
 *   rpc.incomes.update({ inco_id, ... })
 *   rpc.incomes.remove({ inco_id })
 */
export const incomesContract = oc
 .errors({
  UNAUTHORIZED: { message: "Authentication required" },
  NOT_FOUND: { message: "Income not found" },
  VALIDATION: { message: "Invalid input" },
 })
 .router({
  list: oc.input(listIncomesInputSchema).output(z.array(incomeSchema)),
  get: oc.input(z.object({ inco_id: uuidSchema })).output(incomeSchema),
  create: oc.input(createIncomeInputSchema).output(incomeSchema),
  update: oc.input(updateIncomeInputSchema).output(incomeSchema),
  remove: oc
   .input(removeIncomeInputSchema)
   .output(z.object({ ok: z.literal(true) })),
 });

export type Income = z.infer<typeof incomeSchema>;
export type CreateIncomeInput = z.infer<typeof createIncomeInputSchema>;
export type UpdateIncomeInput = z.infer<typeof updateIncomeInputSchema>;
export type RemoveIncomeInput = z.infer<typeof removeIncomeInputSchema>;
export type ListIncomesInput = z.infer<typeof listIncomesInputSchema>;
