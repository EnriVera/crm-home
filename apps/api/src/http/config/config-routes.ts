import type { H3Event } from "h3";

import type { ListApps } from "../../application/config/list-apps";
import type { ListCurrencies } from "../../application/config/list-currencies";

export interface ConfigRouteDependencies {
  listApps: ListApps;
  listCurrencies: ListCurrencies;
}

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
