import type { H3Event } from "h3";
import { readValidatedBody } from "h3";
import { z } from "zod";
import { ListIncomes } from "../../application/incomes/list-incomes";
import { CreateIncome } from "../../application/incomes/create-income";
import { UpdateIncome } from "../../application/incomes/update-income";
import { RemoveIncome } from "../../application/incomes/remove-income";
import {
  IncomeNotFound,
  InvalidIncomeInput,
} from "../../application/incomes/errors";
import { mapTaskErrorToStatus } from "../tasks/error-mapping";
import { readUserId } from "../tasks/tasks-routes";

/**
 * Entry HTTP del módulo `incomes`.
 *
 * Sigue el patrón de `clients-routes.ts`: lee `userId` desde el header
 * `X-User-Id` (inyectado por el dispatch wrapper) y devuelve el output
 * envuelto en un Response JSON. Los errores se mapean vía
 * `mapTaskErrorToStatus` (compartido entre módulos por ahora; TODO
 * extraer a http/helpers.ts cuando haya un 4to módulo con errores custom).
 */

export interface IncomesRouteDependencies {
  listIncomes: ListIncomes;
  createIncome: CreateIncome;
  updateIncome: UpdateIncome;
  removeIncome: RemoveIncome;
}

// amount: NUMERIC(19,4) como string decimal-safe
const amountSchema = z
  .string()
  .regex(/^\d+(\.\d{1,4})?$/, { message: "amount must be decimal with up to 4 fraction digits" })
  .refine((v) => Number(v) > 0, { message: "amount must be > 0" });

const dateSchema = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, { message: "date must be YYYY-MM-DD" });

const listIncomesInputSchema = z.object({
  search: z.string().max(100).default(""),
  date_from: dateSchema.nullable().default(null),
  date_to: dateSchema.nullable().default(null),
  limit: z.number().int().min(1).max(100).default(50),
});

const getIncomeInputSchema = z.object({
  inco_id: z.string().uuid(),
});

const createIncomeInputSchema = z.object({
  inco_account_id: z.string().uuid(),
  inco_amount: amountSchema,
  inco_currency_id: z.string().uuid(),
  inco_description: z.string().max(500).nullable().default(null),
  inco_category: z.string().max(100).nullable().default(null),
  inco_date: dateSchema,
});

const updateIncomeInputSchema = z.object({
  inco_id: z.string().uuid(),
  inco_account_id: z.string().uuid().optional(),
  inco_amount: amountSchema.optional(),
  inco_currency_id: z.string().uuid().optional(),
  inco_description: z.string().max(500).nullable().optional(),
  inco_category: z.string().max(100).nullable().optional(),
  inco_date: dateSchema.optional(),
});

const removeIncomeInputSchema = z.object({
  inco_id: z.string().uuid(),
});

function mapIncomeRowToContract(row: {
  id: string;
  accountId: string;
  amount: string;
  currencyId: string;
  description: string | null;
  category: string | null;
  date: string;
  createdAt: Date;
  updatedAt: Date;
}) {
  return {
    inco_id: row.id,
    inco_account_id: row.accountId,
    inco_amount: row.amount,
    inco_currency_id: row.currencyId,
    inco_description: row.description,
    inco_category: row.category,
    inco_date: row.date,
    inco_created_at: row.createdAt,
    inco_updated_at: row.updatedAt,
  };
}

export function createListIncomesHandler(deps: IncomesRouteDependencies) {
  return async (event: H3Event): Promise<Response> => {
    try {
      const userId = readUserId(event);
      const body = await readValidatedBody(event, listIncomesInputSchema.parse);
      const rows = await deps.listIncomes.execute({
        userId,
        search: body.search,
        dateFrom: body.date_from,
        dateTo: body.date_to,
        limit: body.limit,
      });
      return Response.json(rows.map(mapIncomeRowToContract));
    } catch (err) {
      const { status, body } = mapTaskErrorToStatus(err);
      return Response.json(body, { status });
    }
  };
}

export function createGetIncomeHandler(deps: IncomesRouteDependencies) {
  return async (event: H3Event): Promise<Response> => {
    try {
      const userId = readUserId(event);
      const body = await readValidatedBody(event, getIncomeInputSchema.parse);
      const result = await deps.listIncomes.execute({
        userId,
        search: "",
        dateFrom: null,
        dateTo: null,
        limit: 100,
      });
      const found = result.find((row) => row.id === body.inco_id);
      if (!found) {
        return Response.json(
          { defined: true, code: "INCOME_NOT_FOUND", message: "Income not found" },
          { status: 404 },
        );
      }
      return Response.json(mapIncomeRowToContract(found));
    } catch (err) {
      const { status, body } = mapTaskErrorToStatus(err);
      return Response.json(body, { status });
    }
  };
}

export function createIncomeHandler(deps: IncomesRouteDependencies) {
  return async (event: H3Event): Promise<Response> => {
    try {
      const userId = readUserId(event);
      const body = await readValidatedBody(event, createIncomeInputSchema.parse);
      const row = await deps.createIncome.execute({
        userId,
        accountId: body.inco_account_id,
        amount: body.inco_amount,
        currencyId: body.inco_currency_id,
        description: body.inco_description ?? null,
        category: body.inco_category ?? null,
        date: body.inco_date,
      });
      return Response.json(mapIncomeRowToContract(row), { status: 201 });
    } catch (err) {
      if (err instanceof InvalidIncomeInput) {
        return Response.json(
          { defined: true, code: "INVALID_INCOME_INPUT", message: err.message },
          { status: 400 },
        );
      }
      const { status, body } = mapTaskErrorToStatus(err);
      return Response.json(body, { status });
    }
  };
}

export function updateIncomeHandler(deps: IncomesRouteDependencies) {
  return async (event: H3Event): Promise<Response> => {
    try {
      const userId = readUserId(event);
      const body = await readValidatedBody(event, updateIncomeInputSchema.parse);
      const row = await deps.updateIncome.execute({
        userId,
        incomeId: body.inco_id,
        accountId: body.inco_account_id,
        amount: body.inco_amount,
        currencyId: body.inco_currency_id,
        description: body.inco_description,
        category: body.inco_category,
        date: body.inco_date,
      });
      return Response.json(mapIncomeRowToContract(row));
    } catch (err) {
      if (err instanceof InvalidIncomeInput) {
        return Response.json(
          { defined: true, code: "INVALID_INCOME_INPUT", message: err.message },
          { status: 400 },
        );
      }
      if (err instanceof IncomeNotFound) {
        return Response.json(
          { defined: true, code: "INCOME_NOT_FOUND", message: err.message },
          { status: 404 },
        );
      }
      const { status, body } = mapTaskErrorToStatus(err);
      return Response.json(body, { status });
    }
  };
}

export function removeIncomeHandler(deps: IncomesRouteDependencies) {
  return async (event: H3Event): Promise<Response> => {
    try {
      const userId = readUserId(event);
      const body = await readValidatedBody(event, removeIncomeInputSchema.parse);
      await deps.removeIncome.execute({
        userId,
        incomeId: body.inco_id,
      });
      return Response.json({ ok: true });
    } catch (err) {
      if (err instanceof IncomeNotFound) {
        return Response.json(
          { defined: true, code: "INCOME_NOT_FOUND", message: err.message },
          { status: 404 },
        );
      }
      const { status, body } = mapTaskErrorToStatus(err);
      return Response.json(body, { status });
    }
  };
}
