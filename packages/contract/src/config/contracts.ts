/**
 * Config bounded context — request/response zod schemas.
 *
 * Day-of-judgment fix A-001 (canonical): schemas previously in
 * `@crm/types/contracts/config.ts` now live here as the single source
 * of truth shared between apps/api and the frontends.
 *
 * `listApps` es read-only (módulos seedeados, PRD-v2 §8.7). `currencies`
 * era read-only hasta el pedido de creación desde `/config` (monedas
 * globales: lo que un usuario crea lo ven todos).
 */
import { oc } from "@orpc/contract";
import { z } from "zod";
import { App } from "./index.js";

/**
 * Wire real de una moneda (DB `currency`: curr_id, curr_name, curr_symbol,
 * curr_decimals). La entidad `Currency` de `./index.js` (title/code/decimal)
 * es aspiracional y drifted; este schema es lo que la API devuelve. Los
 * campos son camelCase sin prefijo porque así habla el endpoint desde
 * antes de documentarse el prefijo `curr_*`: renombrarlos rompería la
 * API y el adapter de web-v3, así que la convención queda fija acá.
 */
export const currencyWireSchema = z.object({
  id: z.string().uuid(),
  name: z.string().min(1).max(255),
  symbol: z.string().min(1).max(4),
  decimals: z.number().int().min(0).max(6),
});
export type CurrencyWire = z.infer<typeof currencyWireSchema>;

export const createCurrencyInputSchema = z.object({
  name: z.string().min(1).max(255),
  symbol: z.string().min(1).max(4),
  decimals: z.number().int().min(0).max(6),
});
export type CreateCurrencyInput = z.infer<typeof createCurrencyInputSchema>;

export const listAppsOutputSchema = z.array(App);
export type ListAppsOutput = z.infer<typeof listAppsOutputSchema>;

export const listCurrenciesOutputSchema = z.array(currencyWireSchema);
export type ListCurrenciesOutput = z.infer<typeof listCurrenciesOutputSchema>;

export const configContract = oc.router({
  listApps: oc.output(listAppsOutputSchema),
  listCurrencies: oc.output(listCurrenciesOutputSchema),
  createCurrency: oc
    .input(createCurrencyInputSchema)
    .output(currencyWireSchema),
});

export type ConfigContract = typeof configContract;
