import type { Transaction } from "./transaction";

/**
 * `currency` — registro global seedeado de monedas (PRD §8.7 línea 256:
 * USD, EUR, ARS, etc.). Visible solo lectura para end users en el MVP.
 * Las FK de `account.acc_curr_id` apuntan a esta tabla.
 *
 * Patrón: el type y el port conviven en este archivo (mismo patrón que
 * `user-repository.ts`).
 */
export interface Currency {
  id: string;
  name: string;
  symbol: string;
  /** Cantidad de decimales que se muestran al usuario. Default 2 (peso). */
  decimals: number;
}

export interface CurrencyRepository {
  /** Lista todas las monedas (sin paginación — el seed actual es chico). */
  list(trx?: Transaction): Promise<Currency[]>;
}
