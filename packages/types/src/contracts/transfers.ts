import { oc } from "@orpc/contract";
import { z } from "zod";
import { uuidSchema } from "./_shared";

export const transferAmountSchema = z
  .string()
  .regex(/^\d+(\.\d{1,4})?$/, {
    message: "amount must be a decimal string with up to 4 fraction digits",
  })
  .refine((v) => Number(v) > 0, { message: "amount must be > 0" });

export const transferDateSchema = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, { message: "date must be YYYY-MM-DD" });

export const transferDescriptionSchema = z
  .string()
  .max(500)
  .nullable()
  .default(null);

export const transferSearchSchema = z.string().max(100).default("");

export const transferLimitSchema = z.number().int().min(1).max(100).default(50);

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
  tran_amount: transferAmountSchema,
  tran_currency_id: uuidSchema,
  tran_description: transferDescriptionSchema,
  tran_date: transferDateSchema,
});

export const updateTransferInputSchema = z.object({
  tran_id: uuidSchema,
  tran_from_account_id: uuidSchema.optional(),
  tran_to_account_id: uuidSchema.optional(),
  tran_amount: transferAmountSchema.optional(),
  tran_currency_id: uuidSchema.optional(),
  tran_description: transferDescriptionSchema.optional(),
  tran_date: transferDateSchema.optional(),
});

export const removeTransferInputSchema = z.object({
  tran_id: uuidSchema,
});

export const listTransfersInputSchema = z.object({
  search: transferSearchSchema,
  date_from: transferDateSchema.nullable().default(null),
  date_to: transferDateSchema.nullable().default(null),
  limit: transferLimitSchema,
});

export const transfersContract = oc
  .errors({
    UNAUTHORIZED: { message: "Authentication required" },
    NOT_FOUND: { message: "Transfer not found" },
    VALIDATION: { message: "Invalid input" },
  })
  .router({
    list: oc.input(listTransfersInputSchema).output(z.array(transferSchema)),
    get: oc.input(z.object({ tran_id: uuidSchema })).output(transferSchema),
    create: oc.input(createTransferInputSchema).output(transferSchema),
    update: oc.input(updateTransferInputSchema).output(transferSchema),
    remove: oc
      .input(removeTransferInputSchema)
      .output(z.object({ ok: z.literal(true) })),
  });

export type Transfer = z.infer<typeof transferSchema>;
