/**
 * Config bounded context — request/response zod schemas.
 *
 * Day-of-judgment fix A-001 (canonical): schemas previously in
 * `@crm/types/contracts/config.ts` now live here as the single source
 * of truth shared between apps/api and the frontends.
 *
 * Read-only in the MVP (PRD-v2 §8.7): the user sees the list of
 * available modules and currencies but cannot create/edit/delete them.
 * Per-procedure input is empty; the session is validated inside the
 * handler via the auth middleware.
 */
import { oc } from "@orpc/contract";
import { z } from "zod";
import { App, Currency } from "./index.js";

export const listAppsOutputSchema = z.array(App);
export type ListAppsOutput = z.infer<typeof listAppsOutputSchema>;

export const listCurrenciesOutputSchema = z.array(Currency);
export type ListCurrenciesOutput = z.infer<typeof listCurrenciesOutputSchema>;

export const configContract = oc.router({
 listApps: oc.output(listAppsOutputSchema),
 listCurrencies: oc.output(listCurrenciesOutputSchema),
});

export type ConfigContract = typeof configContract;
