import { oc } from "@orpc/contract";
import { z } from "zod";
import { uuidSchema } from "./_shared";

/* ---------- Schemas atómicos ---------- */

export const expenseAmountSchema = z
  .string()
  .regex(/^\d+(\.\d{1,4})?$/, { message: "amount must be a decimal string with up to 4 fraction digits" })
  .refine((v) => Number(v) > 0, { message: "amount must be > 0" });

export const expenseDateSchema = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, { message: "date must be YYYY-MM-DD" });

export const expenseDescriptionSchema = z
  .string()
  .max(500, { message: "description exceeds 500 chars" })
  .nullable()
  .default(null);

export const expenseCategorySchema = z
  .string()
  .max(100, { message: "category exceeds 100 chars" })
  .nullable()
  .default(null);

export const expenseReceiptUrlSchema = z
  .string()
  .url({ message: "receipt_url must be a valid URL" })
  .max(2000, { message: "receipt_url exceeds 2000 chars" })
  .nullable()
  .default(null);

export const expenseSearchSchema = z.string().max(100).default("");

export const expenseLimitSchema = z.number().int().min(1).max(100).default(50);

/* ---------- Schema entidad ---------- */

export const expenseSchema = z.object({
  expe_id: uuidSchema,
  expe_account_id: uuidSchema,
  expe_amount: z.string(),
  expe_currency_id: uuidSchema,
  expe_description: z.union([z.string(), z.null()]),
  expe_category: z.union([z.string(), z.null()]),
  expe_date: z.string(),
  expe_receipt_url: z.union([z.string(), z.null()]),
  expe_created_at: z.coerce.date(),
  expe_updated_at: z.coerce.date(),
});

export const createExpenseInputSchema = z.object({
  expe_account_id: uuidSchema,
  expe_amount: expenseAmountSchema,
  expe_currency_id: uuidSchema,
  expe_description: expenseDescriptionSchema,
  expe_category: expenseCategorySchema,
  expe_date: expenseDateSchema,
  expe_receipt_url: expenseReceiptUrlSchema,
});

export const updateExpenseInputSchema = z.object({
  expe_id: uuidSchema,
  expe_account_id: uuidSchema.optional(),
  expe_amount: expenseAmountSchema.optional(),
  expe_currency_id: uuidSchema.optional(),
  expe_description: expenseDescriptionSchema.optional(),
  expe_category: expenseCategorySchema.optional(),
  expe_date: expenseDateSchema.optional(),
  expe_receipt_url: expenseReceiptUrlSchema.optional(),
});

export const removeExpenseInputSchema = z.object({
  expe_id: uuidSchema,
});

export const listExpensesInputSchema = z.object({
  search: expenseSearchSchema,
  date_from: expenseDateSchema.nullable().default(null),
  date_to: expenseDateSchema.nullable().default(null),
  limit: expenseLimitSchema,
});

/* ---------- Contract ---------- */

/**
 * Contract del módulo `expenses` (PRD §D5).
 *
 * Idéntico a `incomesContract` pero con prefijo `expe_*` y un campo
 * extra `expe_receipt_url`. Mismas 5 operaciones (list / get / create /
 * update / remove / soft-delete).
 */
export const expensesContract = oc
  .errors({
    UNAUTHORIZED: { message: "Authentication required" },
    NOT_FOUND: { message: "Expense not found" },
    VALIDATION: { message: "Invalid input" },
  })
  .router({
    list: oc
      .input(listExpensesInputSchema)
      .output(z.array(expenseSchema)),
    get: oc
      .input(z.object({ expe_id: uuidSchema }))
      .output(expenseSchema),
    create: oc
      .input(createExpenseInputSchema)
      .output(expenseSchema),
    update: oc
      .input(updateExpenseInputSchema)
      .output(expenseSchema),
    remove: oc
      .input(removeExpenseInputSchema)
      .output(z.object({ ok: z.literal(true) })),
  });

export type Expense = z.infer<typeof expenseSchema>;
export type CreateExpenseInput = z.infer<typeof createExpenseInputSchema>;
export type UpdateExpenseInput = z.infer<typeof updateExpenseInputSchema>;
export type RemoveExpenseInput = z.infer<typeof removeExpenseInputSchema>;
export type ListExpensesInput = z.infer<typeof listExpensesInputSchema>;
