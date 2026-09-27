import type { H3Event } from "h3";
import { readValidatedBody } from "h3";
import { z } from "zod";
import { ListTransfers } from "../../application/transfers/list-transfers";
import { CreateTransfer } from "../../application/transfers/create-transfer";
import { UpdateTransfer } from "../../application/transfers/update-transfer";
import { RemoveTransfer } from "../../application/transfers/remove-transfer";
import {
  InvalidTransferInput,
  TransferNotFound,
} from "../../application/transfers/errors";
import { mapTaskErrorToStatus } from "../tasks/error-mapping";
import { readUserId } from "../tasks/tasks-routes";

export interface TransfersRouteDependencies {
  listTransfers: ListTransfers;
  createTransfer: CreateTransfer;
  updateTransfer: UpdateTransfer;
  removeTransfer: RemoveTransfer;
}

const amountSchema = z
  .string()
  .regex(/^\d+(\.\d{1,4})?$/, { message: "amount must be decimal with up to 4 fraction digits" })
  .refine((v) => Number(v) > 0, { message: "amount must be > 0" });

const dateSchema = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, { message: "date must be YYYY-MM-DD" });

const listTransfersInputSchema = z.object({
  search: z.string().max(100).default(""),
  date_from: dateSchema.nullable().default(null),
  date_to: dateSchema.nullable().default(null),
  limit: z.number().int().min(1).max(100).default(50),
});

const getTransferInputSchema = z.object({
  tran_id: z.string().uuid(),
});

const createTransferInputSchema = z.object({
  tran_from_account_id: z.string().uuid(),
  tran_to_account_id: z.string().uuid(),
  tran_amount: amountSchema,
  tran_currency_id: z.string().uuid(),
  tran_description: z.string().max(500).nullable().default(null),
  tran_date: dateSchema,
});

const updateTransferInputSchema = z.object({
  tran_id: z.string().uuid(),
  tran_from_account_id: z.string().uuid().optional(),
  tran_to_account_id: z.string().uuid().optional(),
  tran_amount: amountSchema.optional(),
  tran_currency_id: z.string().uuid().optional(),
  tran_description: z.string().max(500).nullable().optional(),
  tran_date: dateSchema.optional(),
});

const removeTransferInputSchema = z.object({
  tran_id: z.string().uuid(),
});

function mapTransferRowToContract(row: {
  id: string;
  fromAccountId: string;
  toAccountId: string;
  amount: string;
  currencyId: string;
  description: string | null;
  date: string;
  createdAt: Date;
}) {
  return {
    tran_id: row.id,
    tran_from_account_id: row.fromAccountId,
    tran_to_account_id: row.toAccountId,
    tran_amount: row.amount,
    tran_currency_id: row.currencyId,
    tran_description: row.description,
    tran_date: row.date,
    tran_created_at: row.createdAt,
  };
}

export function createListTransfersHandler(deps: TransfersRouteDependencies) {
  return async (event: H3Event): Promise<Response> => {
    try {
      const userId = readUserId(event);
      const body = await readValidatedBody(event, listTransfersInputSchema.parse);
      const rows = await deps.listTransfers.execute({
        userId,
        search: body.search,
        dateFrom: body.date_from,
        dateTo: body.date_to,
        limit: body.limit,
      });
      return Response.json(rows.map(mapTransferRowToContract));
    } catch (err) {
      const { status, body } = mapTaskErrorToStatus(err);
      return Response.json(body, { status });
    }
  };
}

export function createGetTransferHandler(deps: TransfersRouteDependencies) {
  return async (event: H3Event): Promise<Response> => {
    try {
      const userId = readUserId(event);
      const body = await readValidatedBody(event, getTransferInputSchema.parse);
      const result = await deps.listTransfers.execute({
        userId,
        search: "",
        dateFrom: null,
        dateTo: null,
        limit: 100,
      });
      const found = result.find((row) => row.id === body.tran_id);
      if (!found) {
        return Response.json(
          { defined: true, code: "TRANSFER_NOT_FOUND", message: "Transfer not found" },
          { status: 404 },
        );
      }
      return Response.json(mapTransferRowToContract(found));
    } catch (err) {
      const { status, body } = mapTaskErrorToStatus(err);
      return Response.json(body, { status });
    }
  };
}

export function createTransferHandler(deps: TransfersRouteDependencies) {
  return async (event: H3Event): Promise<Response> => {
    try {
      const userId = readUserId(event);
      const body = await readValidatedBody(event, createTransferInputSchema.parse);
      const row = await deps.createTransfer.execute({
        userId,
        fromAccountId: body.tran_from_account_id,
        toAccountId: body.tran_to_account_id,
        amount: body.tran_amount,
        currencyId: body.tran_currency_id,
        description: body.tran_description ?? null,
        date: body.tran_date,
      });
      return Response.json(mapTransferRowToContract(row), { status: 201 });
    } catch (err) {
      if (err instanceof InvalidTransferInput) {
        return Response.json(
          { defined: true, code: "INVALID_TRANSFER_INPUT", message: err.message },
          { status: 400 },
        );
      }
      const { status, body } = mapTaskErrorToStatus(err);
      return Response.json(body, { status });
    }
  };
}

export function updateTransferHandler(deps: TransfersRouteDependencies) {
  return async (event: H3Event): Promise<Response> => {
    try {
      const userId = readUserId(event);
      const body = await readValidatedBody(event, updateTransferInputSchema.parse);
      const row = await deps.updateTransfer.execute({
        userId,
        transferId: body.tran_id,
        fromAccountId: body.tran_from_account_id,
        toAccountId: body.tran_to_account_id,
        amount: body.tran_amount,
        currencyId: body.tran_currency_id,
        description: body.tran_description,
        date: body.tran_date,
      });
      return Response.json(mapTransferRowToContract(row));
    } catch (err) {
      if (err instanceof InvalidTransferInput) {
        return Response.json(
          { defined: true, code: "INVALID_TRANSFER_INPUT", message: err.message },
          { status: 400 },
        );
      }
      if (err instanceof TransferNotFound) {
        return Response.json(
          { defined: true, code: "TRANSFER_NOT_FOUND", message: err.message },
          { status: 404 },
        );
      }
      const { status, body } = mapTaskErrorToStatus(err);
      return Response.json(body, { status });
    }
  };
}

export function removeTransferHandler(deps: TransfersRouteDependencies) {
  return async (event: H3Event): Promise<Response> => {
    try {
      const userId = readUserId(event);
      const body = await readValidatedBody(event, removeTransferInputSchema.parse);
      await deps.removeTransfer.execute({
        userId,
        transferId: body.tran_id,
      });
      return Response.json({ ok: true });
    } catch (err) {
      if (err instanceof TransferNotFound) {
        return Response.json(
          { defined: true, code: "TRANSFER_NOT_FOUND", message: err.message },
          { status: 404 },
        );
      }
      const { status, body } = mapTaskErrorToStatus(err);
      return Response.json(body, { status });
    }
  };
}
