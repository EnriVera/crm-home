import type { H3Event } from "h3";
import { readValidatedBody } from "h3";
import {
  listMovementsInputSchema,
  createExpenseInputSchema,
  updateExpenseInputSchema,
  removeExpenseInputSchema,
} from "@crm/contract/finance";
import { z } from "zod";
import { ListExpenses } from "../../application/expenses/list-expenses";
import { CreateExpense } from "../../application/expenses/create-expense";
import { UpdateExpense } from "../../application/expenses/update-expense";
import { RemoveExpense } from "../../application/expenses/remove-expense";
import {
  ExpenseNotFound,
  InvalidExpenseInput,
} from "../../application/expenses/errors";
import { mapDomainErrorToStatus } from "../error-mapping";
import { readUserId } from "../request-user";

/**
 * Entry HTTP del módulo `expenses`. Mismo patrón que `incomes-routes.ts`.
 */

export interface ExpensesRouteDependencies {
  listExpenses: ListExpenses;
  createExpense: CreateExpense;
  updateExpense: UpdateExpense;
  removeExpense: RemoveExpense;
}

const getExpenseInputSchema = z.object({
  expe_id: z.string().uuid(),
});

function mapExpenseRowToContract(row: {
  id: string;
  accountId: string;
  amount: string;
  currencyId: string;
  description: string | null;
  category: string | null;
  date: string;
  receiptUrl: string | null;
  createdAt: Date;
  updatedAt: Date;
}) {
  return {
    expe_id: row.id,
    expe_account_id: row.accountId,
    expe_amount: row.amount,
    expe_currency_id: row.currencyId,
    expe_description: row.description,
    expe_category: row.category,
    expe_date: row.date,
    expe_receipt_url: row.receiptUrl,
    expe_created_at: row.createdAt,
    expe_updated_at: row.updatedAt,
  };
}

export function createListExpensesHandler(deps: ExpensesRouteDependencies) {
  return async (event: H3Event): Promise<Response> => {
    try {
      const userId = readUserId(event);
      const body = await readValidatedBody(
        event,
        listMovementsInputSchema.parse,
      );
      const rows = await deps.listExpenses.execute({
        userId,
        search: body.search,
        dateFrom: body.date_from,
        dateTo: body.date_to,
        limit: body.limit,
      });
      return Response.json(rows.map(mapExpenseRowToContract));
    } catch (err) {
      const { status, body } = mapDomainErrorToStatus(err);
      return Response.json(body, { status });
    }
  };
}

export function createGetExpenseHandler(deps: ExpensesRouteDependencies) {
  return async (event: H3Event): Promise<Response> => {
    try {
      const userId = readUserId(event);
      const body = await readValidatedBody(event, getExpenseInputSchema.parse);
      const result = await deps.listExpenses.execute({
        userId,
        search: "",
        dateFrom: null,
        dateTo: null,
        limit: 100,
      });
      const found = result.find((row) => row.id === body.expe_id);
      if (!found) {
        return Response.json(
          {
            defined: true,
            code: "EXPENSE_NOT_FOUND",
            message: "Expense not found",
          },
          { status: 404 },
        );
      }
      return Response.json(mapExpenseRowToContract(found));
    } catch (err) {
      const { status, body } = mapDomainErrorToStatus(err);
      return Response.json(body, { status });
    }
  };
}

export function createExpenseHandler(deps: ExpensesRouteDependencies) {
  return async (event: H3Event): Promise<Response> => {
    try {
      const userId = readUserId(event);
      const body = await readValidatedBody(
        event,
        createExpenseInputSchema.parse,
      );
      const row = await deps.createExpense.execute({
        userId,
        accountId: body.expe_account_id,
        amount: body.expe_amount,
        currencyId: body.expe_currency_id,
        description: body.expe_description ?? null,
        category: body.expe_category ?? null,
        date: body.expe_date,
        receiptUrl: body.expe_receipt_url ?? null,
      });
      return Response.json(mapExpenseRowToContract(row), { status: 201 });
    } catch (err) {
      const { status, body } = mapDomainErrorToStatus(err);
      return Response.json(body, { status });
    }
  };
}

export function updateExpenseHandler(deps: ExpensesRouteDependencies) {
  return async (event: H3Event): Promise<Response> => {
    try {
      const userId = readUserId(event);
      const body = await readValidatedBody(
        event,
        updateExpenseInputSchema.parse,
      );
      const row = await deps.updateExpense.execute({
        userId,
        expenseId: body.expe_id,
        accountId: body.expe_account_id,
        amount: body.expe_amount,
        currencyId: body.expe_currency_id,
        description: body.expe_description,
        category: body.expe_category,
        date: body.expe_date,
        receiptUrl: body.expe_receipt_url,
      });
      return Response.json(mapExpenseRowToContract(row));
    } catch (err) {
      const { status, body } = mapDomainErrorToStatus(err);
      return Response.json(body, { status });
    }
  };
}

export function removeExpenseHandler(deps: ExpensesRouteDependencies) {
  return async (event: H3Event): Promise<Response> => {
    try {
      const userId = readUserId(event);
      const body = await readValidatedBody(
        event,
        removeExpenseInputSchema.parse,
      );
      await deps.removeExpense.execute({
        userId,
        expenseId: body.expe_id,
      });
      return Response.json({ ok: true });
    } catch (err) {
      const { status, body } = mapDomainErrorToStatus(err);
      return Response.json(body, { status });
    }
  };
}
