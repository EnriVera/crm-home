import { oc } from "@orpc/contract";
import { z } from "zod";
import { uuidSchema } from "./_shared";

/* ---------- Schemas atómicos (read-side) ---------- */

/**
 * `apps` — módulo de la aplicación (PRD §8.7 línea 254). Read-only
 * en el MVP. El usuario ve la lista para saber qué módulos están
 * disponibles pero no puede crear/editar/eliminar.
 */
export const appSchema = z.object({
 id: uuidSchema,
 name: z.string(),
});
export type App = z.infer<typeof appSchema>;

/**
 * `currency` — moneda (PRD §8.7 línea 256). Read-only en el MVP.
 * `decimals` es la cantidad de dígitos a la derecha del punto que
 * se muestran al usuario (default 2 para la mayoría de las monedas).
 */
export const currencySchema = z.object({
 id: uuidSchema,
 name: z.string(),
 symbol: z.string(),
 decimals: z.number().int().min(0).max(10),
});
export type Currency = z.infer<typeof currencySchema>;

/* ---------- Schemas de output (read-only) ---------- */

/**
 * Output de `listApps`. Sin input — la sesión se valida en el handler
 * vía `requireSession` (las tablas son globales, pero /config es
 * página autenticada).
 */
export const listAppsOutputSchema = z.array(appSchema);

/**
 * Output de `listCurrencies`. Mismo shape que listApps (read-only).
 */
export const listCurrenciesOutputSchema = z.array(currencySchema);

/* ---------- Contract router ---------- */

export const configContract = oc.router({
 listApps: oc
  .route({ method: "POST", path: "/config/listApps" })
  .output(listAppsOutputSchema),
 listCurrencies: oc
  .route({ method: "POST", path: "/config/listCurrencies" })
  .output(listCurrenciesOutputSchema),
});
