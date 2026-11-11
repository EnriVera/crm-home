import type { H3Event } from "h3";
import { readValidatedBody } from "h3";
import {
  listMovementsInputSchema,
  createTransferInputSchema,
  updateTransferInputSchema,
  removeTransferInputSchema,
} from "@crm/contract/finance";
import { z } from "zod";
import { ListTransfers } from "../../application/transfers/list-transfers";
import { CreateTransfer } from "../../application/transfers/create-transfer";
import { UpdateTransfer } from "../../application/transfers/update-transfer";
import { RemoveTransfer } from "../../application/transfers/remove-transfer";
import {
  InvalidTransferInput,
  TransferNotFound,
} from "../../application/transfers/errors";
import { mapDomainErrorToStatus } from "../error-mapping";
import { readUserId } from "../request-user";

export interface TransfersRouteDependencies {
  listTransfers: ListTransfers;
  createTransfer: CreateTransfer;
  updateTransfer: UpdateTransfer;
  removeTransfer: RemoveTransfer;
}

const getTransferInputSchema = z.object({
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
      const body = await readValidatedBody(
        event,
        listMovementsInputSchema.parse,
      );
      const rows = await deps.listTransfers.execute({
        userId,
        search: body.search,
        dateFrom: body.date_from,
        dateTo: body.date_to,
        limit: body.limit,
      });
      return Response.json(rows.map(mapTransferRowToContract));
    } catch (err) {
      const { status, body } = mapDomainErrorToStatus(err);
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
          {
            defined: true,
            code: "TRANSFER_NOT_FOUND",
            message: "Transfer not found",
          },
          { status: 404 },
        );
      }
      return Response.json(mapTransferRowToContract(found));
    } catch (err) {
      const { status, body } = mapDomainErrorToStatus(err);
      return Response.json(body, { status });
    }
  };
}

export function createTransferHandler(deps: TransfersRouteDependencies) {
  return async (event: H3Event): Promise<Response> => {
    try {
      const userId = readUserId(event);
      const body = await readValidatedBody(
        event,
        createTransferInputSchema.parse,
      );
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
      const { status, body } = mapDomainErrorToStatus(err);
      return Response.json(body, { status });
    }
  };
}

export function updateTransferHandler(deps: TransfersRouteDependencies) {
  return async (event: H3Event): Promise<Response> => {
    try {
      const userId = readUserId(event);
      const body = await readValidatedBody(
        event,
        updateTransferInputSchema.parse,
      );
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
      const { status, body } = mapDomainErrorToStatus(err);
      return Response.json(body, { status });
    }
  };
}

export function removeTransferHandler(deps: TransfersRouteDependencies) {
  return async (event: H3Event): Promise<Response> => {
    try {
      const userId = readUserId(event);
      const body = await readValidatedBody(
        event,
        removeTransferInputSchema.parse,
      );
      await deps.removeTransfer.execute({
        userId,
        transferId: body.tran_id,
      });
      return Response.json({ ok: true });
    } catch (err) {
      const { status, body } = mapDomainErrorToStatus(err);
      return Response.json(body, { status });
    }
  };
}
