/**
 * Finance bounded context — request/response zod schemas.
 *
 * Day-of-judgment fix A-001: schemas previously in
 * `@crm/types/contracts/{incomes,expenses,transfers}.ts` now live here
 * as the single source of truth. The income / expense / transfer
 * entity shapes in `./index.js` use camelCase; this file uses the
 * wire-format `inco_*` / `expe_*` / `tran_*` prefix.
 */
import { oc } from "@orpc/contract";
import { z } from "zod";
import { uuidSchema } from "../shared/identifiers/index.js";

/* ============================================================== */
/*  Common                                                          */
/* ============================================================== */

const amountRegex = /^\d+(\.\d{1,4})?$/;
const dateRegex = /^\d{4}-\d{2}-\d{2}$/;

const amountSchema = z
  .string()
  .regex(amountRegex, {
    message: "amount must be a decimal string with up to 4 fraction digits",
  })
  .refine((v) => Number(v) > 0, { message: "amount must be > 0" });

const dateSchema = z
  .string()
  .regex(dateRegex, { message: "date must be YYYY-MM-DD" });

const descriptionSchema = z
  .string()
  .max(500, { message: "description exceeds 500 chars" })
  .nullable()
  .default(null);

const categorySchema = z
  .string()
  .max(100, { message: "category exceeds 100 chars" })
  .nullable()
  .default(null);

const searchSchema = z.string().max(100).default("");
const limitSchema = z.number().int().min(1).max(100).default(50);

const listDateFilter = z.object({
  search: searchSchema,
  date_from: dateSchema.nullable().default(null),
  date_to: dateSchema.nullable().default(null),
  limit: limitSchema,
});

const okOutputSchema = z.object({ ok: z.literal(true) });

/* ============================================================== */
/*  Incomes                                                         */
/* ============================================================== */

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

export const createIncomeInputSchema = z.object({
  inco_account_id: uuidSchema,
  inco_amount: amountSchema,
  inco_currency_id: uuidSchema,
  inco_description: descriptionSchema,
  inco_category: categorySchema,
  inco_date: dateSchema,
});

export const updateIncomeInputSchema = z.object({
  inco_id: uuidSchema,
  inco_account_id: uuidSchema.optional(),
  inco_amount: amountSchema.optional(),
  inco_currency_id: uuidSchema.optional(),
  inco_description: descriptionSchema.optional(),
  inco_category: categorySchema.optional(),
  inco_date: dateSchema.optional(),
});

export const removeIncomeInputSchema = z.object({ inco_id: uuidSchema });

export const incomesContract = oc
  .errors({
    UNAUTHORIZED: { message: "Authentication required" },
    NOT_FOUND: { message: "Income not found" },
    VALIDATION: { message: "Invalid input" },
  })
  .router({
    list: oc.input(listDateFilter).output(z.array(incomeSchema)),
    get: oc.input(z.object({ inco_id: uuidSchema })).output(incomeSchema),
    create: oc.input(createIncomeInputSchema).output(incomeSchema),
    update: oc.input(updateIncomeInputSchema).output(incomeSchema),
    remove: oc.input(removeIncomeInputSchema).output(okOutputSchema),
  });

export type IncomesContract = typeof incomesContract;

/* ============================================================== */
/*  Expenses                                                        */
/* ============================================================== */

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

export const expenseReceiptUrlSchema = z
  .string()
  .url({ message: "receipt_url must be a valid URL" })
  .max(2000, { message: "receipt_url exceeds 2000 chars" })
  .nullable()
  .default(null);

export const createExpenseInputSchema = z.object({
  expe_account_id: uuidSchema,
  expe_amount: amountSchema,
  expe_currency_id: uuidSchema,
  expe_description: descriptionSchema,
  expe_category: categorySchema,
  expe_date: dateSchema,
  expe_receipt_url: expenseReceiptUrlSchema,
});

export const updateExpenseInputSchema = z.object({
  expe_id: uuidSchema,
  expe_account_id: uuidSchema.optional(),
  expe_amount: amountSchema.optional(),
  expe_currency_id: uuidSchema.optional(),
  expe_description: descriptionSchema.optional(),
  expe_category: categorySchema.optional(),
  expe_date: dateSchema.optional(),
  expe_receipt_url: expenseReceiptUrlSchema.optional(),
});

export const removeExpenseInputSchema = z.object({ expe_id: uuidSchema });

export const expensesContract = oc
  .errors({
    UNAUTHORIZED: { message: "Authentication required" },
    NOT_FOUND: { message: "Expense not found" },
    VALIDATION: { message: "Invalid input" },
  })
  .router({
    list: oc.input(listDateFilter).output(z.array(expenseSchema)),
    get: oc.input(z.object({ expe_id: uuidSchema })).output(expenseSchema),
    create: oc.input(createExpenseInputSchema).output(expenseSchema),
    update: oc.input(updateExpenseInputSchema).output(expenseSchema),
    remove: oc.input(removeExpenseInputSchema).output(okOutputSchema),
  });

export type ExpensesContract = typeof expensesContract;

/* ============================================================== */
/*  Transfers                                                       */
/* ============================================================== */

export const transferSchema = z.object({
  tran_id: uuidSchema,
  tran_from_account_id: uuidSchema,
  tran_to_account_id: uuidSchema,
  tran_amount: z.string(),
  tran_currency_id: uuidSchema,
  tran_description: z.union([z.string(), z.null()]),
  tran_date: z.string(),
  tran_created_at: z.coerce.date(),
});

export const createTransferInputSchema = z.object({
  tran_from_account_id: uuidSchema,
  tran_to_account_id: uuidSchema,
  tran_amount: amountSchema,
  tran_currency_id: uuidSchema,
  tran_description: descriptionSchema,
  tran_date: dateSchema,
});

export const updateTransferInputSchema = z.object({
  tran_id: uuidSchema,
  tran_from_account_id: uuidSchema.optional(),
  tran_to_account_id: uuidSchema.optional(),
  tran_amount: amountSchema.optional(),
  tran_currency_id: uuidSchema.optional(),
  tran_description: descriptionSchema.optional(),
  tran_date: dateSchema.optional(),
});

export const removeTransferInputSchema = z.object({ tran_id: uuidSchema });

export const transfersContract = oc
  .errors({
    UNAUTHORIZED: { message: "Authentication required" },
    NOT_FOUND: { message: "Transfer not found" },
    VALIDATION: { message: "Invalid input" },
  })
  .router({
    list: oc.input(listDateFilter).output(z.array(transferSchema)),
    get: oc.input(z.object({ tran_id: uuidSchema })).output(transferSchema),
    create: oc.input(createTransferInputSchema).output(transferSchema),
    update: oc.input(updateTransferInputSchema).output(transferSchema),
    remove: oc.input(removeTransferInputSchema).output(okOutputSchema),
  });

export type TransfersContract = typeof transfersContract;
