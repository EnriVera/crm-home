import type { H3Event } from "h3";
import { readValidatedBody } from "h3";
import { createAccountInputSchema } from "@crm/contract/finance";
import type { ListAccounts } from "../../application/accounts/list-accounts";
import type { CreateAccount } from "../../application/accounts/create-account";
import { mapDomainErrorToStatus } from "../error-mapping";
import { readUserId } from "../request-user";

/**
 * Entry HTTP del módulo `accounts` (las cuentas de dinero del usuario).
 *
 * El list devuelve cada cuenta con su balance calculado (PRD-v2 §8.6);
 * el wire del balance es string decimal-safe como los montos.
 */
export interface AccountsRouteDependencies {
  listAccounts: ListAccounts;
  createAccount: CreateAccount;
}

export function createListAccountsHandler(deps: AccountsRouteDependencies) {
  return async (event: H3Event): Promise<Response> => {
    try {
      const userId = readUserId(event);
      const rows = await deps.listAccounts.execute({ userId });
      return Response.json(
        rows.map((row) => ({
          acco_id: row.id,
          acco_name: row.name,
          acco_icon: row.icon,
          acco_color: row.color,
          acco_currency_id: row.currencyId,
          acco_initial_amount: row.initialAmount,
          acco_balance: row.balance,
          acco_created_at: row.createdAt,
        })),
      );
    } catch (err) {
      const { status, body } = mapDomainErrorToStatus(err);
      return Response.json(body, { status });
    }
  };
}

export function createAccountHandler(deps: AccountsRouteDependencies) {
  return async (event: H3Event): Promise<Response> => {
    try {
      const userId = readUserId(event);
      const body = await readValidatedBody(
        event,
        createAccountInputSchema.parse,
      );
      const row = await deps.createAccount.execute({
        userId,
        name: body.acco_name,
        icon: body.acco_icon,
        color: body.acco_color,
        currencyId: body.acco_currency_id,
        initialAmount: body.acco_initial_amount,
      });
      return Response.json(
        {
          acco_id: row.id,
          acco_name: row.name,
          acco_icon: row.icon,
          acco_color: row.color,
          acco_currency_id: row.currencyId,
          acco_initial_amount: row.initialAmount,
          acco_balance: row.balance,
          acco_created_at: row.createdAt,
        },
        { status: 201 },
      );
    } catch (err) {
      const { status, body } = mapDomainErrorToStatus(err);
      return Response.json(body, { status });
    }
  };
}
