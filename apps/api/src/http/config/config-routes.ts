import type { H3Event } from "h3";
import { readValidatedBody } from "h3";
import { z } from "zod";
import type { ListApps } from "../../application/config/list-apps";
import type { ListCurrencies } from "../../application/config/list-currencies";
import type { CreateCurrency } from "../../application/config/create-currency";
import { InvalidCurrencyInput } from "../../application/config/errors";
import { mapDomainErrorToStatus } from "../error-mapping";
import { readUserId } from "../request-user";

export interface ConfigRouteDependencies {
  listApps: ListApps;
  listCurrencies: ListCurrencies;
  createCurrency: CreateCurrency;
}

const createCurrencyInputSchema = z.object({
  name: z.string().min(1).max(255),
  symbol: z.string().min(1).max(4),
  decimals: z.number().int().min(0).max(6),
});

export function createListAppsHandler(deps: ConfigRouteDependencies) {
  return async (_event: H3Event) => {
    return deps.listApps.execute();
  };
}

export function createListCurrenciesHandler(deps: ConfigRouteDependencies) {
  return async (_event: H3Event) => {
    return deps.listCurrencies.execute();
  };
}

/**
 * Crea una moneda en la tabla global. Exige sesión (la moneda es global:
 * cualquier usuario autenticado puede crearla y la ven todos).
 */
export function createCreateCurrencyHandler(deps: ConfigRouteDependencies) {
  return async (event: H3Event): Promise<Response> => {
    try {
      readUserId(event);
      const body = await readValidatedBody(
        event,
        createCurrencyInputSchema.parse,
      );
      const currency = await deps.createCurrency.execute({
        name: body.name,
        symbol: body.symbol,
        decimals: body.decimals,
      });
      return Response.json(currency, { status: 201 });
    } catch (err) {
      const { status, body } = mapDomainErrorToStatus(err);
      return Response.json(body, { status });
    }
  };
}
